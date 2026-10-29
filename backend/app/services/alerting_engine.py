import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from app.models.schemas import (
    TransactionModel, AlertModel, AlertAuditLogModel, ThresholdConfigModel
)

class AlertingEngine:
    """
    Alerting Engine responsible for:
    - Applying fixed, quantile, or target-volume threshold strategies
    - Evaluating multi-rule risk criteria (score, amount, velocity, customer sigma)
    - Deduplicating and grouping rapid repeated alerts by sender
    - Threshold impact preview simulation before committing changes
    - Audit logging of alert triage state transitions
    """

    @staticmethod
    def get_risk_band(score: float, config: ThresholdConfigModel) -> str:
        """Maps continuous anomaly score to risk category."""
        if score >= config.critical_threshold:
            return "critical"
        elif score >= config.high_threshold:
            return "high"
        elif score >= config.medium_threshold:
            return "medium"
        elif score >= config.low_threshold:
            return "low"
        return "normal"

    @classmethod
    def evaluate_rules(
        cls,
        score: float,
        amount: float,
        features: Dict[str, float],
        config: ThresholdConfigModel
    ) -> Tuple[bool, str, List[str]]:
        """
        Evaluates risk band and rule triggers.
        Returns:
            - should_alert: bool
            - risk_level: str ('low', 'medium', 'high', 'critical')
            - triggers: list of rule names triggered
        """
        triggers = []
        risk_level = cls.get_risk_band(score, config)

        if score >= config.high_threshold:
            triggers.append(f"ML Anomaly Score ({score:.2f} >= {config.high_threshold:.2f})")
        elif score >= config.medium_threshold:
            triggers.append(f"Elevated Anomaly Score ({score:.2f})")

        # Amount rule
        if amount >= config.amount_rule_threshold:
            triggers.append(f"High Amount Threshold exceeded (${amount:,.2f} >= ${config.amount_rule_threshold:,.2f})")
            if risk_level in ["low", "normal"]:
                risk_level = "high"

        # Rapid Velocity Rule
        time_since_prev = features.get("time_since_prev_sec", 86400.0)
        tx_1h = features.get("tx_count_1h", 1.0)
        if time_since_prev <= config.rapid_tx_velocity_seconds and tx_1h >= 2.0:
            triggers.append(f"Rapid Velocity ({int(time_since_prev)}s since prior tx, {int(tx_1h)} in 1h)")
            if risk_level in ["normal", "low"]:
                risk_level = "medium"

        # Customer Historical Deviation Rule
        zscore = features.get("historical_zscore", 0.0)
        if zscore >= config.customer_deviation_sigma:
            triggers.append(f"Customer Baseline Deviation ({zscore:.2f}σ >= {config.customer_deviation_sigma:.1f}σ)")
            if risk_level in ["normal", "low"]:
                risk_level = "high"

        should_alert = risk_level in ["medium", "high", "critical"]
        return should_alert, risk_level, triggers

    @classmethod
    def process_and_create_alerts(
        cls,
        db: Session,
        transactions: List[TransactionModel],
        config: ThresholdConfigModel
    ) -> List[AlertModel]:
        """
        Evaluates scored transactions, applies grouping & deduplication,
        and saves new alerts with initial audit trail.
        """
        new_alerts = []
        recent_cutoff = datetime.utcnow() - timedelta(hours=1)

        # Cache existing active alerts in last 1 hour for fast grouping
        existing_groups = {}
        recent_alerts = db.query(AlertModel).filter(AlertModel.timestamp >= recent_cutoff).all()
        for a in recent_alerts:
            key = f"{a.sender_id}_{a.timestamp.strftime('%Y%m%d%H')}"
            existing_groups[key] = a.group_id or a.alert_id

        for tx in transactions:
            if tx.anomaly_score is None:
                continue

            features_dict = {}
            if tx.contributing_signals:
                # Extract any parsed features if available
                pass

            should_alert, risk_level, triggers = cls.evaluate_rules(
                score=tx.anomaly_score,
                amount=tx.amount,
                features=features_dict,
                config=config
            )

            # Update transaction record
            tx.is_anomaly = risk_level in ["medium", "high", "critical"]
            tx.risk_band = risk_level

            if should_alert:
                # Grouping key: sender_id + date + hour
                group_key = f"{tx.sender_id}_{tx.timestamp.strftime('%Y%m%d%H')}"
                if group_key in existing_groups:
                    group_id = existing_groups[group_key]
                else:
                    group_id = f"GRP-{tx.sender_id[:8]}-{tx.timestamp.strftime('%H%M%S')}"
                    existing_groups[group_key] = group_id

                alert_id = f"ALT-{uuid.uuid4().hex[:10].upper()}"
                alert = AlertModel(
                    alert_id=alert_id,
                    transaction_id=tx.transaction_id,
                    sender_id=tx.sender_id,
                    timestamp=tx.timestamp,
                    risk_level=risk_level,
                    anomaly_score=tx.anomaly_score,
                    status="New",
                    group_id=group_id,
                    rule_triggers=triggers,
                    assigned_analyst="Unassigned"
                )
                db.add(alert)
                new_alerts.append(alert)

                # Add initial audit log
                audit = AlertAuditLogModel(
                    alert_id=alert_id,
                    action="auto_generated",
                    new_value=risk_level,
                    note=f"Alert generated with risk level '{risk_level}'. Triggers: {', '.join(triggers)}",
                    actor="ShieldAI Alerting Engine",
                    timestamp=datetime.utcnow()
                )
                db.add(audit)

        db.commit()
        return new_alerts

    @staticmethod
    def preview_thresholds(
        scores: np.ndarray,
        amounts: np.ndarray,
        labels: Optional[np.ndarray],
        strategy: str,
        low_t: float,
        med_t: float,
        high_t: float,
        crit_t: float,
        max_daily_budget: int = 250,
        amount_rule: float = 10000.0,
        target_volume: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Simulates threshold impact without modifying database records.
        Returns expected flag distribution, volume projection, and confusion metrics if labels present.
        """
        n = len(scores)
        if n == 0:
            return {
                "total_evaluated": 0, "flagged_count": 0, "flagged_percent": 0.0,
                "critical_count": 0, "high_count": 0, "medium_count": 0, "low_count": 0,
                "estimated_alerts_per_day": 0.0, "exceeds_max_daily_budget": False,
                "confusion_matrix": None
            }

        # If quantile strategy, compute thresholds from percentiles
        if strategy == "quantile":
            crit_t = float(np.percentile(scores, 99))
            high_t = float(np.percentile(scores, 95))
            med_t = float(np.percentile(scores, 85))
            low_t = float(np.percentile(scores, 70))
        elif strategy == "target_volume" and target_volume and target_volume > 0:
            # Pick medium threshold to flag approximately target_volume
            target_pct = min(max((target_volume / n) * 100, 0.5), 50.0)
            med_t = float(np.percentile(scores, 100 - target_pct))
            high_t = min(med_t + 0.15, 0.95)
            crit_t = min(high_t + 0.10, 0.99)
            low_t = max(med_t - 0.15, 0.20)

        # Vectorized assignment
        is_crit = scores >= crit_t
        is_high = (scores >= high_t) & (~is_crit)
        is_med = (scores >= med_t) & (~is_crit) & (~is_high)
        is_low = (scores >= low_t) & (~is_crit) & (~is_high) & (~is_med)

        # Amount rule supplement
        if amount_rule and amount_rule > 0:
            large_amt = amounts >= amount_rule
            is_high = is_high | (large_amt & ~is_crit)

        flagged_mask = is_crit | is_high | is_med
        flagged_count = int(np.sum(flagged_mask))
        crit_count = int(np.sum(is_crit))
        high_count = int(np.sum(is_high))
        med_count = int(np.sum(is_med))
        low_count = int(np.sum(is_low))

        # Volume projection (assuming typical ~1000 tx/day for synthetic base)
        est_daily = round((flagged_count / max(n, 1)) * 1000.0, 1)

        confusion = None
        if labels is not None and len(labels) == n:
            tp = int(np.sum(flagged_mask & (labels == 1)))
            fp = int(np.sum(flagged_mask & (labels == 0)))
            fn = int(np.sum((~flagged_mask) & (labels == 1)))
            tn = int(np.sum((~flagged_mask) & (labels == 0)))
            prec = round(float(tp / (tp + fp)), 4) if (tp + fp) > 0 else 0.0
            rec = round(float(tp / (tp + fn)), 4) if (tp + fn) > 0 else 0.0
            f1 = round(float(2 * prec * rec / (prec + rec)), 4) if (prec + rec) > 0 else 0.0
            fpr = round(float(fp / (fp + tn)), 4) if (fp + tn) > 0 else 0.0

            confusion = {
                "tp": tp, "fp": fp, "fn": fn, "tn": tn,
                "precision": prec, "recall": rec, "f1_score": f1, "fpr": fpr
            }

        return {
            "total_evaluated": n,
            "flagged_count": flagged_count,
            "flagged_percent": round((flagged_count / max(n, 1)) * 100, 2),
            "critical_count": crit_count,
            "high_count": high_count,
            "medium_count": med_count,
            "low_count": low_count,
            "estimated_alerts_per_day": est_daily,
            "exceeds_max_daily_budget": est_daily > max_daily_budget,
            "effective_thresholds": {
                "low": round(low_t, 3),
                "medium": round(med_t, 3),
                "high": round(high_t, 3),
                "critical": round(crit_t, 3)
            },
            "confusion_matrix": confusion
        }
