import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple
from scipy import stats

class DriftDetector:
    """
    Monitors data and model drift using Population Stability Index (PSI)
    and Kolmogorov-Smirnov (KS) 2-sample tests between reference and monitoring datasets.
    Distinguishes covariate shift (data drift) from concept drift.
    """

    @staticmethod
    def calculate_psi(expected: np.ndarray, actual: np.ndarray, num_bins: int = 10) -> float:
        """
        Computes Population Stability Index (PSI).
        Expected = reference distribution, Actual = monitoring distribution.
        PSI < 0.1: Stable
        0.1 <= PSI < 0.25: Moderate shift / Warning
        PSI >= 0.25: Significant Drift
        """
        if len(expected) == 0 or len(actual) == 0:
            return 0.0

        # Create quantile bins from expected/reference
        percentiles = np.linspace(0, 100, num_bins + 1)
        bins = np.percentile(expected, percentiles)
        bins[0] = -np.inf
        bins[-1] = np.inf

        # Handle identical bins (e.g. constant or low-cardinality features)
        bins = np.unique(bins)
        if len(bins) < 3:
            # Fallback to linear binning if quantiles collapse
            bins = np.linspace(min(np.min(expected), np.min(actual)) - 1e-4,
                               max(np.max(expected), np.max(actual)) + 1e-4, num_bins + 1)

        # Count frequencies in bins
        expected_counts, _ = np.histogram(expected, bins=bins)
        actual_counts, _ = np.histogram(actual, bins=bins)

        # Proportions with Laplace smoothing to prevent division by zero
        eps = 1e-4
        expected_pct = (expected_counts + eps) / (len(expected) + eps * len(expected_counts))
        actual_pct = (actual_counts + eps) / (len(actual) + eps * len(actual_counts))

        # PSI formula = sum((actual - expected) * ln(actual / expected))
        psi_val = np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct))
        return float(np.round(psi_val, 4))

    @staticmethod
    def calculate_ks(expected: np.ndarray, actual: np.ndarray) -> Tuple[float, float]:
        """Runs Kolmogorov-Smirnov 2-sample test returning statistic and p-value."""
        if len(expected) < 5 or len(actual) < 5:
            return 0.0, 1.0
        res = stats.ks_2samp(expected, actual)
        return float(np.round(res.statistic, 4)), float(np.round(res.pvalue, 6))

    def evaluate_drift(
        self,
        ref_df: pd.DataFrame,
        mon_df: pd.DataFrame,
        ref_scores: np.ndarray,
        mon_scores: np.ndarray,
        ref_flagged: np.ndarray,
        mon_flagged: np.ndarray,
        features_list: List[str]
    ) -> Dict[str, Any]:
        """
        Executes drift analysis across features, anomaly scores, and alert flag rates.
        Produces overall status, feature-level metrics, and targeted recommendations.
        """
        feature_metrics = {}
        high_drift_features = []
        warning_features = []

        # 1. Feature-level PSI and KS tests
        for col in features_list:
            if col in ref_df.columns and col in mon_df.columns:
                ref_vals = pd.to_numeric(ref_df[col], errors="coerce").dropna().values
                mon_vals = pd.to_numeric(mon_df[col], errors="coerce").dropna().values
                
                if len(ref_vals) > 5 and len(mon_vals) > 5:
                    psi = self.calculate_psi(ref_vals, mon_vals)
                    ks_stat, p_val = self.calculate_ks(ref_vals, mon_vals)
                    
                    if psi >= 0.25:
                        feat_status = "Significant Drift"
                        high_drift_features.append(col)
                    elif psi >= 0.10 or p_val < 0.01:
                        feat_status = "Warning"
                        warning_features.append(col)
                    else:
                        feat_status = "Stable"

                    ref_mean = float(np.mean(ref_vals))
                    mon_mean = float(np.mean(mon_vals))

                    feature_metrics[col] = {
                        "psi": psi,
                        "ks_statistic": ks_stat,
                        "p_value": p_val,
                        "status": feat_status,
                        "reference_mean": round(ref_mean, 2),
                        "monitoring_mean": round(mon_mean, 2),
                        "mean_pct_change": round(((mon_mean - ref_mean) / max(abs(ref_mean), 1e-4)) * 100, 1)
                    }

        # 2. Anomaly Score Drift
        score_psi = self.calculate_psi(ref_scores, mon_scores)
        score_ks_stat, score_p_val = self.calculate_ks(ref_scores, mon_scores)

        # 3. Flagged Rate Difference
        ref_flagged_rate = float(np.mean(ref_flagged)) if len(ref_flagged) > 0 else 0.0
        mon_flagged_rate = float(np.mean(mon_flagged)) if len(mon_flagged) > 0 else 0.0
        flag_diff = round(abs(mon_flagged_rate - ref_flagged_rate), 4)

        # 4. Overall Drift Classification
        if score_psi >= 0.25 or len(high_drift_features) >= 2 or flag_diff >= 0.12:
            overall_status = "Significant Drift"
        elif score_psi >= 0.10 or len(high_drift_features) >= 1 or len(warning_features) >= 2 or flag_diff >= 0.05:
            overall_status = "Warning"
        else:
            overall_status = "Stable"

        # 5. Targeted, actionable recommendations
        recommendations = []
        if overall_status == "Significant Drift":
            recommendations.append("High distribution shift detected in input features and anomaly scores.")
            recommendations.append("Inspect recent transaction sources for schema shifts, upstream currency conversion errors, or partner integrations.")
            recommendations.append("Re-fit the Isolation Forest model on recent stable transactions after verifying data sanity.")
            recommendations.append("Temporarily adjust quantile-based alerting thresholds to prevent sudden alert fatigue.")
        elif overall_status == "Warning":
            recommendations.append(f"Moderate shift detected in {len(warning_features) + len(high_drift_features)} features ({', '.join(warning_features[:3])}).")
            recommendations.append("Monitor alert queue depth over the next 24-48 hours.")
            recommendations.append("Consider calibrating threshold bands if false-positive feedback increases.")
        else:
            recommendations.append("Model inputs, score distributions, and flagged rates are currently within acceptable stability thresholds.")
            recommendations.append("No immediate recalibration or model retraining required.")

        return {
            "overall_status": overall_status,
            "score_psi": score_psi,
            "score_ks_stat": score_ks_stat,
            "score_p_val": score_p_val,
            "reference_flagged_rate": round(ref_flagged_rate * 100, 2),
            "monitoring_flagged_rate": round(mon_flagged_rate * 100, 2),
            "flagged_rate_diff": round(flag_diff * 100, 2),
            "high_drift_features": high_drift_features,
            "warning_features": warning_features,
            "feature_metrics": feature_metrics,
            "recommendations": recommendations,
            "drift_explanation": (
                "Data drift (covariate shift) reflects changing transaction sizes or customer habits, "
                "which may occur naturally during seasonal shopping or inflation. Concept drift represents "
                "a change in what constitutes fraudulent vs legitimate behavior. Note: Feature distribution shift "
                "alone does not inherently mean fraud detection quality has degraded."
            )
        }
