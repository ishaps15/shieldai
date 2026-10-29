import uuid
from datetime import datetime
from typing import Optional, List
import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.schemas import DriftReportModel, DriftReportResponse, TransactionModel
from app.ml.feature_pipeline import FeaturePipeline
from app.monitoring.drift_detector import DriftDetector
from app.services.synthetic_data_generator import SyntheticDataGenerator
from app.services.ingestion_service import IngestionService
from app.services.ml_service import MLService

router = APIRouter(prefix="/drift", tags=["Drift Monitoring"])

@router.get("/reports", response_model=List[DriftReportResponse])
def list_drift_reports(limit: int = 10, db: Session = Depends(get_db)):
    """Lists recorded drift monitoring evaluation reports."""
    reports = db.query(DriftReportModel).order_by(desc(DriftReportModel.created_at)).limit(limit).all()
    return reports

@router.post("/run")
def run_drift_analysis(
    split_method: str = "chronological", # chronological, batch
    reference_batch: Optional[str] = None,
    monitoring_batch: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Executes drift analysis using Population Stability Index (PSI) and Kolmogorov-Smirnov (KS) tests.
    Compares baseline reference transactions against recent monitoring window.
    """
    transactions = db.query(TransactionModel).order_by(TransactionModel.timestamp.asc()).all()
    if len(transactions) < 40:
        raise HTTPException(
            status_code=400,
            detail="At least 40 transactions are required to perform meaningful drift analysis."
        )

    df_all = pd.DataFrame([{
        "timestamp": t.timestamp,
        "amount": t.amount,
        "sender_id": t.sender_id,
        "receiver_id": t.receiver_id,
        "transaction_type": t.transaction_type,
        "merchant_category": t.merchant_category,
        "location": t.location,
        "device_channel": t.device_channel,
        "anomaly_score": t.anomaly_score or 0.0,
        "is_anomaly": 1 if t.is_anomaly else 0,
        "batch_id": t.batch_id
    } for t in transactions])

    # Partition reference and monitoring sets
    if split_method == "batch" and reference_batch and monitoring_batch:
        ref_df = df_all[df_all["batch_id"] == reference_batch].copy()
        mon_df = df_all[df_all["batch_id"] == monitoring_batch].copy()
        ref_window = f"Batch {reference_batch}"
        mon_window = f"Batch {monitoring_batch}"
    else:
        # Chronological split: first 60% reference, last 40% monitoring
        split_idx = int(len(df_all) * 0.6)
        ref_df = df_all.iloc[:split_idx].copy()
        mon_df = df_all.iloc[split_idx:].copy()
        ref_window = f"{ref_df['timestamp'].min().strftime('%Y-%m-%d')} to {ref_df['timestamp'].max().strftime('%Y-%m-%d')}"
        mon_window = f"{mon_df['timestamp'].min().strftime('%Y-%m-%d')} to {mon_df['timestamp'].max().strftime('%Y-%m-%d')}"

    if len(ref_df) < 15 or len(mon_df) < 15:
        raise HTTPException(status_code=400, detail="Insufficient transaction count in reference or monitoring partitions.")

    # Extract behavioral features for both partitions
    pipeline = FeaturePipeline()
    pipeline.fit(ref_df)
    ref_feat, feat_cols, _ = pipeline.transform(ref_df)
    mon_feat, _, _ = pipeline.transform(mon_df)

    detector = DriftDetector()
    results = detector.evaluate_drift(
        ref_df=pd.concat([ref_df[["amount"]].reset_index(drop=True), ref_feat], axis=1),
        mon_df=pd.concat([mon_df[["amount"]].reset_index(drop=True), mon_feat], axis=1),
        ref_scores=ref_df["anomaly_score"].values,
        mon_scores=mon_df["anomaly_score"].values,
        ref_flagged=ref_df["is_anomaly"].values,
        mon_flagged=mon_df["is_anomaly"].values,
        features_list=["amount"] + feat_cols
    )

    report_id = f"DRF-{uuid.uuid4().hex[:8].upper()}"
    report_record = DriftReportModel(
        report_id=report_id,
        reference_window=ref_window,
        monitoring_window=mon_window,
        overall_status=results["overall_status"],
        score_psi=results["score_psi"],
        feature_metrics=results["feature_metrics"],
        flagged_rate_diff=results["flagged_rate_diff"],
        recommendations=results["recommendations"],
        created_at=datetime.utcnow()
    )
    db.add(report_record)
    db.commit()
    db.refresh(report_record)

    results["report_id"] = report_id
    results["reference_window"] = ref_window
    results["monitoring_window"] = mon_window
    return results

@router.post("/simulate_shift")
def simulate_distribution_shift(db: Session = Depends(get_db)):
    """
    Ingests shifted/drifted transaction batch and runs drift evaluation.
    Allows user to test and verify drift detection alerts and recommendations.
    """
    gen = SyntheticDataGenerator(random_seed=999)
    # Generate 500 shifted transactions
    df_shifted = gen.generate_dataset(
        num_transactions=500,
        anomaly_rate=0.15,
        include_labels=True,
        is_drifted=True,
        days_back=2
    )

    IngestionService.ingest_dataframe(df_shifted, db, batch_id="simulated_drift_batch")
    MLService.score_all_transactions(db)

    # Run drift analysis comparing against earlier transactions
    return run_drift_analysis(split_method="chronological", db=db)
