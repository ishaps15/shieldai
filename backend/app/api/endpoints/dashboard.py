from datetime import datetime, timedelta
from typing import Dict, Any, List
import numpy as np
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case, Integer
from app.core.database import get_db
from app.models.schemas import (
    TransactionModel, AlertModel, ThresholdConfigModel,
    MLModelRegistryModel, DriftReportModel
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_dashboard_metrics(db: Session = Depends(get_db)):
    """Computes real, un-fabricated operational metrics and time-series distributions for monitoring."""
    total_tx = db.query(func.count(TransactionModel.id)).scalar() or 0
    total_anomalies = db.query(func.count(TransactionModel.id)).filter(TransactionModel.is_anomaly == True).scalar() or 0
    anom_pct = round((total_anomalies / max(total_tx, 1)) * 100, 2)

    high_crit_alerts = db.query(func.count(AlertModel.id)).filter(
        AlertModel.risk_level.in_(["high", "critical"])
    ).scalar() or 0

    backlog = db.query(func.count(AlertModel.id)).filter(
        AlertModel.status.in_(["New", "Under Review"])
    ).scalar() or 0

    confirmed_fraud = db.query(func.count(TransactionModel.id)).filter(
        TransactionModel.is_fraud_ground_truth == 1
    ).scalar() or 0

    confirmed_fp = db.query(func.count(AlertModel.id)).filter(
        AlertModel.status == "False Positive"
    ).scalar() or 0

    # Active model
    active_model = db.query(MLModelRegistryModel).filter(MLModelRegistryModel.is_active == True).first()
    model_info = {
        "model_id": active_model.model_id if active_model else "DEFAULT_IFOREST",
        "model_type": active_model.model_type if active_model else "isolation_forest",
        "version": active_model.version if active_model else "v1.0",
        "contamination": active_model.contamination if active_model else 0.05,
        "n_estimators": active_model.n_estimators if active_model else 150
    }

    # Current thresholds
    cfg = db.query(ThresholdConfigModel).filter(ThresholdConfigModel.is_active == True).first()
    threshold_info = {
        "strategy": cfg.strategy if cfg else "fixed",
        "low": cfg.low_threshold if cfg else 0.35,
        "medium": cfg.medium_threshold if cfg else 0.55,
        "high": cfg.high_threshold if cfg else 0.75,
        "critical": cfg.critical_threshold if cfg else 0.90,
        "amount_rule": cfg.amount_rule_threshold if cfg else 10000.0
    }

    # Drift status
    latest_drift = db.query(DriftReportModel).order_by(desc(DriftReportModel.created_at)).first()
    drift_status = latest_drift.overall_status if latest_drift else "Stable"

    # Risk breakdown
    risk_rows = db.query(
        TransactionModel.risk_band, func.count(TransactionModel.id)
    ).group_by(TransactionModel.risk_band).all()
    risk_breakdown = {r[0]: r[1] for r in risk_rows}

    # Alert status breakdown
    status_rows = db.query(
        AlertModel.status, func.count(AlertModel.id)
    ).group_by(AlertModel.status).all()
    status_breakdown = {s[0]: s[1] for s in status_rows}

    # Volume by day (past 14 days)
    volume_by_day = []
    anom_case = case((TransactionModel.is_anomaly == True, 1), else_=0)
    daily_txs = db.query(
        func.date(TransactionModel.timestamp).label("tx_date"),
        func.count(TransactionModel.id).label("count"),
        func.sum(TransactionModel.amount).label("total_amount"),
        func.sum(anom_case).label("anom_count")
    ).group_by("tx_date").order_by("tx_date").limit(14).all()

    for row in daily_txs:
        volume_by_day.append({
            "date": str(row.tx_date),
            "total_transactions": row.count,
            "total_amount": round(float(row.total_amount or 0.0), 2),
            "anomalies": int(row.anom_count or 0)
        })

    # Anomaly score distribution histogram (10 bins from 0.0 to 1.0)
    score_distribution = []
    scores = db.query(TransactionModel.anomaly_score).filter(
        TransactionModel.anomaly_score.isnot(None)
    ).all()

    if scores:
        score_arr = np.array([s[0] for s in scores], dtype=float)
        hist, bin_edges = np.histogram(score_arr, bins=10, range=(0.0, 1.0))
        for i in range(len(hist)):
            label = f"{bin_edges[i]:.1f}-{bin_edges[i+1]:.1f}"
            score_distribution.append({
                "range": label,
                "count": int(hist[i]),
                "is_anomalous_zone": bool(bin_edges[i] >= (threshold_info["medium"]))
            })

    # Amount distribution histogram
    amount_distribution = []
    amounts = db.query(TransactionModel.amount).all()
    if amounts:
        amt_arr = np.array([a[0] for a in amounts], dtype=float)
        hist, bin_edges = np.histogram(np.log10(np.maximum(amt_arr, 1.0)), bins=8)
        for i in range(len(hist)):
            min_val = round(10 ** bin_edges[i], 1)
            max_val = round(10 ** bin_edges[i+1], 1)
            amount_distribution.append({
                "range": f"${min_val:,.0f}-${max_val:,.0f}",
                "count": int(hist[i])
            })

    return {
        "total_transactions": total_tx,
        "total_anomalies": total_anomalies,
        "anomalous_percentage": anom_pct,
        "high_critical_alerts": high_crit_alerts,
        "review_backlog": backlog,
        "confirmed_fraud_cases": confirmed_fraud,
        "confirmed_false_positives": confirmed_fp,
        "active_model": model_info,
        "current_thresholds": threshold_info,
        "drift_status": drift_status,
        "volume_by_day": volume_by_day,
        "score_distribution": score_distribution,
        "amount_distribution": amount_distribution,
        "risk_breakdown": risk_breakdown,
        "alert_status_breakdown": status_breakdown
    }
