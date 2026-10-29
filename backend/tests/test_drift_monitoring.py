import pytest
import numpy as np
import pandas as pd
from app.monitoring.drift_detector import DriftDetector

def test_psi_stable_distribution():
    np.random.seed(42)
    ref = np.random.normal(100.0, 15.0, size=500)
    mon = np.random.normal(100.0, 15.0, size=500) # identical distribution

    psi = DriftDetector.calculate_psi(ref, mon)
    assert psi < 0.10 # Must be stable

def test_psi_significant_drift():
    np.random.seed(42)
    ref = np.random.normal(100.0, 15.0, size=500)
    mon = np.random.normal(180.0, 30.0, size=500) # strongly shifted distribution

    psi = DriftDetector.calculate_psi(ref, mon)
    assert psi >= 0.25 # Significant Drift

def test_ks_test():
    np.random.seed(42)
    ref = np.random.normal(50.0, 5.0, size=100)
    mon = np.random.normal(80.0, 5.0, size=100)

    stat, pval = DriftDetector.calculate_ks(ref, mon)
    assert stat > 0.5
    assert pval < 0.001

def test_full_drift_evaluation():
    detector = DriftDetector()
    ref_df = pd.DataFrame({"amount": np.random.normal(50, 10, 100)})
    mon_df = pd.DataFrame({"amount": np.random.normal(150, 40, 100)}) # shifted

    ref_scores = np.random.uniform(0.1, 0.4, 100)
    mon_scores = np.random.uniform(0.6, 0.9, 100) # shifted scores

    res = detector.evaluate_drift(
        ref_df=ref_df,
        mon_df=mon_df,
        ref_scores=ref_scores,
        mon_scores=mon_scores,
        ref_flagged=np.zeros(100),
        mon_flagged=np.ones(100),
        features_list=["amount"]
    )

    assert res["overall_status"] == "Significant Drift"
    assert len(res["recommendations"]) > 0
    assert "amount" in res["high_drift_features"] or "amount" in res["feature_metrics"]
