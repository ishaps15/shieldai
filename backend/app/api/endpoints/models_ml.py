from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.schemas import (
    MLModelRegistryModel, ModelMetadataResponse, ModelTrainingRequest, TransactionModel
)
from app.services.ml_service import MLService
from app.ml.feature_pipeline import FeaturePipeline
from app.ml.supervised_models import SupervisedComparator
from sklearn.metrics import precision_recall_curve, roc_curve, auc

router = APIRouter(prefix="/models", tags=["Machine Learning"])

@router.get("", response_model=List[ModelMetadataResponse])
def list_models(db: Session = Depends(get_db)):
    """Lists registered model versions, hyperparameters, and active status."""
    return db.query(MLModelRegistryModel).order_by(desc(MLModelRegistryModel.trained_at)).all()

@router.post("/train")
def train_model(payload: ModelTrainingRequest, db: Session = Depends(get_db)):
    """Trains a new model version (Isolation Forest, Random Forest, Logistic Regression)."""
    try:
        res = MLService.train_model(
            db=db,
            model_type=payload.model_type,
            contamination=payload.contamination,
            n_estimators=payload.n_estimators,
            random_seed=payload.random_seed
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/activate/{model_id}")
def activate_model(model_id: str, db: Session = Depends(get_db)):
    """Activates an existing registered model version and triggers re-scoring."""
    target = db.query(MLModelRegistryModel).filter(MLModelRegistryModel.model_id == model_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Model ID not found.")

    # Deactivate others of same type
    db.query(MLModelRegistryModel).filter(MLModelRegistryModel.model_type == target.model_type).update(
        {MLModelRegistryModel.is_active: False}
    )
    target.is_active = True
    db.commit()

    # Rescore all transactions with newly active model
    scoring_res = MLService.score_all_transactions(db)

    return {
        "status": "success",
        "activated_model_id": model_id,
        "scoring_result": scoring_res
    }

@router.get("/evaluation")
def get_model_evaluation(
    model_type: str = "random_forest",
    threshold: float = Query(0.5, ge=0.05, le=0.95),
    db: Session = Depends(get_db)
):
    """
    Evaluates models on labelled transaction data.
    Computes True/False Positives, Precision, Recall, F1, PR curves, and threshold trade-offs.
    """
    transactions = db.query(TransactionModel).filter(
        TransactionModel.is_fraud_ground_truth.isnot(None)
    ).order_by(TransactionModel.timestamp.asc()).all()

    if len(transactions) < 10:
        return {
            "has_ground_truth": False,
            "message": "Ground-truth labels are not present in the current dataset. Upload or generate labelled data to view supervised evaluation curves."
        }

    df = pd.DataFrame([{
        "timestamp": t.timestamp,
        "amount": t.amount,
        "sender_id": t.sender_id,
        "receiver_id": t.receiver_id,
        "transaction_type": t.transaction_type,
        "merchant_category": t.merchant_category,
        "location": t.location,
        "device_channel": t.device_channel,
        "is_fraud_ground_truth": t.is_fraud_ground_truth,
        "anomaly_score": t.anomaly_score or 0.0
    } for t in transactions])

    y = df["is_fraud_ground_truth"].values.astype(int)
    if len(np.unique(y)) < 2:
        return {
            "has_ground_truth": False,
            "message": "Dataset must contain at least two classes (normal and fraud) for evaluation."
        }

    # Extract features
    pipeline = FeaturePipeline()
    pipeline.fit(df)
    features_df, _, _ = pipeline.transform(df)
    X = features_df.values

    # Fit comparator
    comparator = SupervisedComparator(model_type=model_type)
    comparator.fit(X, y)
    eval_metrics = comparator.evaluate(X, y, threshold=threshold)

    # Threshold trade-off sweep: simulate thresholds from 0.1 to 0.9
    threshold_tradeoffs = []
    probas = comparator.predict_proba(X)
    for t_val in np.linspace(0.1, 0.9, 9):
        p_mask = probas >= t_val
        tp = int(np.sum(p_mask & (y == 1)))
        fp = int(np.sum(p_mask & (y == 0)))
        fn = int(np.sum((~p_mask) & (y == 1)))
        tn = int(np.sum((~p_mask) & (y == 0)))
        prec = round(float(tp / (tp + fp)), 4) if (tp + fp) > 0 else 0.0
        rec = round(float(tp / (tp + fn)), 4) if (tp + fn) > 0 else 0.0
        f1 = round(float(2 * prec * rec / (prec + rec)), 4) if (prec + rec) > 0 else 0.0

        threshold_tradeoffs.append({
            "threshold": round(float(t_val), 2),
            "flagged": tp + fp,
            "true_positives": tp,
            "false_positives": fp,
            "false_negatives": fn,
            "precision": prec,
            "recall": rec,
            "f1_score": f1
        })

    return {
        "has_ground_truth": True,
        "total_labelled_samples": len(y),
        "total_fraud_cases": int(np.sum(y == 1)),
        "total_legitimate_cases": int(np.sum(y == 0)),
        "evaluation_metrics": eval_metrics,
        "threshold_tradeoffs": threshold_tradeoffs
    }
