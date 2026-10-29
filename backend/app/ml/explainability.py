from typing import Dict, List, Any
import numpy as np

class SignalExplainer:
    """
    Produces transparent, non-causal behavioral signal explanations.
    Translates raw feature deviations into human-readable alerts for analysts.
    """

    @staticmethod
    def explain_transaction(row_dict: Dict[str, Any], features_dict: Dict[str, float]) -> List[Dict[str, Any]]:
        signals = []

        amount = float(row_dict.get("amount", 0.0))
        zscore = float(features_dict.get("historical_zscore", 0.0))
        ratio_hist = float(features_dict.get("ratio_to_hist_mean", 1.0))
        time_since_prev = float(features_dict.get("time_since_prev_sec", 86400.0))
        tx_1h = float(features_dict.get("tx_count_1h", 1.0))
        tx_24h = float(features_dict.get("tx_count_24h", 1.0))
        is_night = float(features_dict.get("is_night_window", 0.0))
        is_new_loc = float(features_dict.get("is_new_location", 0.0))
        is_new_chan = float(features_dict.get("is_new_channel", 0.0))
        ratio_24h = float(features_dict.get("ratio_to_24h_spend", 1.0))

        # 1. Historical Amount Deviation
        if zscore >= 3.0 or ratio_hist >= 4.0:
            signals.append({
                "signal": "High Amount Deviation",
                "value": round(ratio_hist, 2),
                "description": f"Transaction amount (${amount:,.2f}) is {ratio_hist:.1f}x higher than sender's historical average (Z-score: {zscore:.2f}).",
                "severity": "danger"
            })
        elif zscore >= 2.0 or ratio_hist >= 2.5:
            signals.append({
                "signal": "Moderate Amount Deviation",
                "value": round(ratio_hist, 2),
                "description": f"Transaction amount (${amount:,.2f}) is {ratio_hist:.1f}x sender's baseline.",
                "severity": "warning"
            })

        # 2. Velocity / Rapid Repeated Bursts
        if time_since_prev <= 60.0 and tx_1h >= 3.0:
            signals.append({
                "signal": "Rapid Transaction Burst",
                "value": round(time_since_prev, 0),
                "description": f"Sender initiated {int(tx_1h)} transactions within 1 hour; only {int(time_since_prev)}s since last event.",
                "severity": "danger"
            })
        elif tx_1h >= 4.0:
            signals.append({
                "signal": "High Hourly Frequency",
                "value": tx_1h,
                "description": f"{int(tx_1h)} transactions recorded in the past 60 minutes for this sender.",
                "severity": "warning"
            })

        # 3. Off-hours / Unusual Night Activity
        if is_night == 1.0:
            signals.append({
                "signal": "Unusual Time Window",
                "value": 1.0,
                "description": "Transaction initiated during early morning off-hours window (00:00 - 05:00 local time).",
                "severity": "warning"
            })

        # 4. New Geographic Location / Channel Switch
        if is_new_loc == 1.0:
            signals.append({
                "signal": "First-time Location",
                "value": 1.0,
                "description": f"First transaction observed from location '{row_dict.get('location', 'UNKNOWN')}' for this sender.",
                "severity": "warning"
            })

        if is_new_chan == 1.0:
            signals.append({
                "signal": "New Device Channel",
                "value": 1.0,
                "description": f"New device/channel '{row_dict.get('device_channel', 'UNKNOWN')}' used for the first time.",
                "severity": "info"
            })

        # 5. Sudden Spending Concentration
        if ratio_24h >= 0.75 and amount >= 500.0:
            signals.append({
                "signal": "High Daily Spend Concentration",
                "value": round(ratio_24h * 100, 1),
                "description": f"Single transaction represents {int(ratio_24h * 100)}% of the sender's total 24-hour spend.",
                "severity": "info"
            })

        # Default fallback if isolated due to multi-dimensional combination
        if not signals:
            signals.append({
                "signal": "Multivariate Anomaly",
                "value": 1.0,
                "description": "Transaction lies in a low-density region across combined behavioral dimensions in Isolation Forest.",
                "severity": "info"
            })

        return signals
