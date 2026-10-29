import os
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.schemas import TransactionModel, MLModelRegistryModel, ThresholdConfigModel
from app.ml.feature_pipeline import FeaturePipeline
from app.ml.isolation_forest import IsolationForestDetector
from app.ml.baseline_statistical import BaselineMADDetector
from app.ml.supervised_models import SupervisedComparator
from app.ml.explainability import SignalExplainer
from app.services.alerting_engine import AlertingEngine

class MLService:
    """
    Coordinates training, batch inference, baseline comparisons,
    and signal explanations for ShieldAI.
    """

    @classmethod
    def score_all_transactions(
        cls,
        db: Session,
        model_id: Optional[str] = None,
        batch_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Runs feature extraction and anomaly scoring on stored transactions.
        Updates transaction records with normalized anomaly_score, baseline_score,
        contributing_signals, and generates alerts.
        """
        query = db.query(TransactionModel)
        if batch_id:
            query = query.filter(TransactionModel.batch_id == batch_id)
        transactions = query.order_by(TransactionModel.timestamp.asc()).all()

        if not transactions:
            return {"status": "no_transactions", "processed_count": 0}

        # Convert to DataFrame
        tx_data = [{
            "id": t.id,
            "transaction_id": t.transaction_id,
            "timestamp": t.timestamp,
            "amount": t.amount,
            "sender_id": t.sender_id,
            "receiver_id": t.receiver_id,
            "transaction_type": t.transaction_type,
            "merchant_category": t.merchant_category,
            "location": t.location,
            "device_channel": t.device_channel,
            "is_fraud_ground_truth": t.is_fraud_ground_truth
        } for t in transactions]

        df = pd.DataFrame(tx_data)

        # 1. Feature Engineering
        pipeline = FeaturePipeline()
        pipeline.fit(df)
        features_df, feature_names, missing_signals = pipeline.transform(df)
        X = features_df.values

        # 2. Primary Isolation Forest Model
        active_model_record = db.query(MLModelRegistryModel).filter(
            MLModelRegistryModel.model_type == "isolation_forest",
            MLModelRegistryModel.is_active == True
        ).first()

        detector = None
        if active_model_record and os.path.exists(active_model_record.filepath):
            try:
                detector = IsolationForestDetector.load(active_model_record.filepath)
            except Exception:
                detector = None

        if detector is None:
            detector = IsolationForestDetector(
                contamination=settings.DEFAULT_CONTAMINATION,
                n_estimators=settings.DEFAULT_N_ESTIMATORS,
                random_seed=settings.DEFAULT_RANDOM_SEED
            )
            detector.fit(X)
            # Save as initial active model
            model_ver = f"iforest_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
            save_path = str(settings.MODEL_DIR / f"{model_ver}.joblib")
            detector.save(save_path)
            
            # Deactivate previous
            db.query(MLModelRegistryModel).update({MLModelRegistryModel.is_active: False})
            new_reg = MLModelRegistryModel(
                model_id=f"MOD-{uuid.uuid4().hex[:8].upper()}",
                model_type="isolation_forest",
                version=model_ver,
                contamination=settings.DEFAULT_CONTAMINATION,
                n_estimators=settings.DEFAULT_N_ESTIMATORS,
                random_seed=settings.DEFAULT_RANDOM_SEED,
                is_active=True,
                filepath=save_path,
                metrics={"trained_samples": len(X)}
            )
            db.add(new_reg)
            db.commit()

        iso_scores, iso_preds = detector.score(X)

        # 3. Baseline Statistical Detector (MAD / Robust Z-scores)
        baseline_detector = BaselineMADDetector()
        baseline_scores, _ = baseline_detector.score(X)

        # 4. Supervised Comparison if Ground Truth Available
        supervised_scores = np.full(len(df), np.nan)
        labels = df["is_fraud_ground_truth"].dropna().values
        if len(labels) > 20 and len(np.unique(labels)) > 1:
            try:
                labeled_mask = df["is_fraud_ground_truth"].notna().values
                sup_comp = SupervisedComparator(model_type="random_forest", random_seed=settings.DEFAULT_RANDOM_SEED)
                sup_comp.fit(X[labeled_mask], df.loc[labeled_mask, "is_fraud_ground_truth"].values)
                supervised_scores[labeled_mask] = sup_comp.predict_proba(X[labeled_mask])
            except Exception:
                pass

        # 5. Fetch Active Threshold Config
        config = db.query(ThresholdConfigModel).filter(ThresholdConfigModel.is_active == True).first()
        if not config:
            config = ThresholdConfigModel(
                strategy="fixed",
                low_threshold=settings.DEFAULT_THRESHOLD_LOW,
                medium_threshold=settings.DEFAULT_THRESHOLD_MEDIUM,
                high_threshold=settings.DEFAULT_THRESHOLD_HIGH,
                critical_threshold=settings.DEFAULT_THRESHOLD_CRITICAL,
                max_alerts_per_day=settings.DEFAULT_MAX_ALERTS_PER_DAY,
                amount_rule_threshold=settings.DEFAULT_AMOUNT_RULE_THRESHOLD,
                rapid_tx_velocity_seconds=settings.DEFAULT_RAPID_TX_SECONDS,
                customer_deviation_sigma=settings.DEFAULT_CUSTOMER_SIGMA,
                is_active=True
            )
            db.add(config)
            db.commit()
            db.refresh(config)

        # 6. Update Transactions with ML results and Signal Explanations
        id_to_tx = {t.id: t for t in transactions}
        for i, row in df.iterrows():
            tx_obj = id_to_tx[row["id"]]
            raw_dict = row.to_dict()
            feat_dict = features_df.iloc[i].to_dict()
            score_val = float(iso_scores[i])

            tx_obj.anomaly_score = score_val
            tx_obj.baseline_score = float(baseline_scores[i])
            if not np.isnan(supervised_scores[i]):
                tx_obj.supervised_score = float(supervised_scores[i])

            # Generate transparent signal explanations
            signals = SignalExplainer.explain_transaction(raw_dict, feat_dict)
            tx_obj.contributing_signals = signals

        db.commit()

        # 7. Generate alerts & triage through alerting engine
        new_alerts = AlertingEngine.process_and_create_alerts(db, transactions, config)

        return {
            "status": "success",
            "processed_count": len(transactions),
            "new_alerts_count": len(new_alerts),
            "missing_signals": missing_signals
        }

    @classmethod
    def train_model(
        cls,
        db: Session,
        model_type: str = "isolation_forest",
        contamination: float = 0.05,
        n_estimators: int = 150,
        random_seed: int = 42
    ) -> Dict[str, Any]:
        """Trains and registers a new model version."""
        transactions = db.query(TransactionModel).order_by(TransactionModel.timestamp.asc()).all()
        if len(transactions) < 20:
            raise ValueError("At least 20 transactions required to train a model.")

        df = pd.DataFrame([{
            "timestamp": t.timestamp,
            "amount": t.amount,
            "sender_id": t.sender_id,
            "receiver_id": t.receiver_id,
            "transaction_type": t.transaction_type,
            "merchant_category": t.merchant_category,
            "location": t.location,
            "device_channel": t.device_channel,
            "is_fraud_ground_truth": t.is_fraud_ground_truth
        } for t in transactions])

        pipeline = FeaturePipeline()
        pipeline.fit(df)
        features_df, _, _ = pipeline.transform(df)
        X = features_df.values

        model_ver = f"{model_type}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        save_path = str(settings.MODEL_DIR / f"{model_ver}.joblib")

        metrics = {}
        if model_type == "isolation_forest":
            detector = IsolationForestDetector(
                contamination=contamination,
                n_estimators=n_estimators,
                random_seed=random_seed
            )
            detector.fit(X)
            detector.save(save_path)
            scores, is_ano = detector.score(X)
            metrics = {
                "total_samples": len(X),
                "flagged_samples": int(np.sum(is_ano)),
                "flagged_rate": round(float(np.mean(is_ano)), 4),
                "mean_anomaly_score": round(float(np.mean(scores)), 4)
            }
        else: # Supervised: random_forest or logistic_regression
            labeled_mask = df["is_fraud_ground_truth"].notna().values
            if np.sum(labeled_mask) < 20:
                raise ValueError("Supervised training requires at least 20 labelled transactions.")
            y = df.loc[labeled_mask, "is_fraud_ground_truth"].values.astype(int)
            sup = SupervisedComparator(model_type=model_type, random_seed=random_seed)
            sup.fit(X[labeled_mask], y)
            import joblib
            joblib.dump(sup.model, save_path)
            metrics = sup.evaluate(X[labeled_mask], y)

        # Deactivate previous active models of same type
        db.query(MLModelRegistryModel).filter(MLModelRegistryModel.model_type == model_type).update(
            {MLModelRegistryModel.is_active: False}
        )

        model_id = f"MOD-{uuid.uuid4().hex[:8].upper()}"
        registry_entry = MLModelRegistryModel(
            model_id=model_id,
            model_type=model_type,
            version=model_ver,
            contamination=contamination,
            n_estimators=n_estimators,
            random_seed=random_seed,
            is_active=True,
            filepath=save_path,
            metrics=metrics,
            trained_at=datetime.utcnow()
        )
        db.add(registry_entry)
        db.commit()

        # Re-score transactions with newly active model
        cls.score_all_transactions(db)

        return {
            "model_id": model_id,
            "model_type": model_type,
            "version": model_ver,
            "metrics": metrics,
            "is_active": True
        }
