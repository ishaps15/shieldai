import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.schemas import (
    ThresholdConfigModel, ThresholdConfigSchema,
    ThresholdPreviewRequest, ThresholdPreviewResponse, TransactionModel
)
from app.services.alerting_engine import AlertingEngine
from app.services.ml_service import MLService

router = APIRouter(prefix="/thresholds", tags=["Thresholds"])

@router.get("/current")
def get_current_thresholds(db: Session = Depends(get_db)):
    """Retrieves active threshold and alerting policy settings."""
    cfg = db.query(ThresholdConfigModel).filter(ThresholdConfigModel.is_active == True).first()
    if not cfg:
        cfg = ThresholdConfigModel(is_active=True)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg

@router.post("/preview", response_model=ThresholdPreviewResponse)
def preview_threshold_impact(payload: ThresholdPreviewRequest, db: Session = Depends(get_db)):
    """
    Simulates threshold impact on transactions without saving changes.
    Shows expected flagged volume, risk breakdown, and PR confusion matrix if labels exist.
    """
    transactions = db.query(
        TransactionModel.anomaly_score,
        TransactionModel.amount,
        TransactionModel.is_fraud_ground_truth
    ).filter(TransactionModel.anomaly_score.isnot(None)).all()

    if not transactions:
        raise HTTPException(status_code=400, detail="No scored transactions available to simulate.")

    scores = np.array([t.anomaly_score for t in transactions], dtype=float)
    amounts = np.array([t.amount for t in transactions], dtype=float)
    
    labels = None
    has_labels = any(t.is_fraud_ground_truth is not None for t in transactions)
    if has_labels:
        labels = np.array([1 if t.is_fraud_ground_truth == 1 else 0 for t in transactions], dtype=int)

    preview_res = AlertingEngine.preview_thresholds(
        scores=scores,
        amounts=amounts,
        labels=labels,
        strategy=payload.strategy,
        low_t=payload.low_threshold,
        med_t=payload.medium_threshold,
        high_t=payload.high_threshold,
        crit_t=payload.critical_threshold,
        amount_rule=payload.amount_rule_threshold or 10000.0,
        target_volume=payload.target_volume_per_day
    )
    return preview_res

@router.post("/apply")
def apply_threshold_config(payload: ThresholdConfigSchema, db: Session = Depends(get_db)):
    """
    Explicitly updates and activates new threshold policy.
    Recalibrates risk bands on stored transactions and updates alerting queue.
    """
    if not (payload.low_threshold <= payload.medium_threshold <= payload.high_threshold <= payload.critical_threshold):
        raise HTTPException(
            status_code=400,
            detail="Thresholds must strictly satisfy: low <= medium <= high <= critical"
        )

    # Deactivate current
    db.query(ThresholdConfigModel).update({ThresholdConfigModel.is_active: False})

    new_cfg = ThresholdConfigModel(
        strategy=payload.strategy,
        low_threshold=payload.low_threshold,
        medium_threshold=payload.medium_threshold,
        high_threshold=payload.high_threshold,
        critical_threshold=payload.critical_threshold,
        max_alerts_per_day=payload.max_alerts_per_day,
        amount_rule_threshold=payload.amount_rule_threshold,
        rapid_tx_velocity_seconds=payload.rapid_tx_velocity_seconds,
        customer_deviation_sigma=payload.customer_deviation_sigma,
        is_active=True
    )
    db.add(new_cfg)
    db.commit()
    db.refresh(new_cfg)

    # Re-evaluate stored transactions with new threshold rules
    transactions = db.query(TransactionModel).filter(TransactionModel.anomaly_score.isnot(None)).all()
    if transactions:
        AlertingEngine.process_and_create_alerts(db, transactions, new_cfg)

    return {
        "status": "success",
        "message": "Threshold configuration applied successfully.",
        "config": new_cfg
    }
