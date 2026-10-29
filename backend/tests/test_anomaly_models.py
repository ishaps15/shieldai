import pytest
import numpy as np
from app.ml.isolation_forest import IsolationForestDetector
from app.ml.baseline_statistical import BaselineMADDetector
from app.ml.supervised_models import SupervisedComparator
from app.ml.explainability import SignalExplainer

def test_isolation_forest_scoring():
    np.random.seed(42)
    # 50 normal samples, 5 injected extreme outliers
    X_normal = np.random.normal(loc=10.0, scale=1.0, size=(50, 4))
    X_outliers = np.random.normal(loc=100.0, scale=10.0, size=(5, 4))
    X = np.vstack([X_normal, X_outliers])

    detector = IsolationForestDetector(contamination=0.08, n_estimators=50, random_seed=42)
    detector.fit(X)
    scores, is_anomaly = detector.score(X)

    assert len(scores) == 55
    assert (scores >= 0.0).all() and (scores <= 1.0).all()
    # Outliers should have significantly higher scores than normal samples
    assert np.mean(scores[-5:]) > np.mean(scores[:50])

def test_baseline_mad_scoring():
    np.random.seed(42)
    X = np.random.normal(loc=5.0, scale=0.5, size=(40, 3))
    # Extreme point
    X[0] = [50.0, 50.0, 50.0]

    mad_detector = BaselineMADDetector()
    mad_detector.fit(X)
    scores, is_anomaly = mad_detector.score(X)

    assert len(scores) == 40
    assert (scores >= 0.0).all() and (scores <= 1.0).all()
    assert scores[0] > 0.8
    assert is_anomaly[0] == True

def test_supervised_comparator():
    np.random.seed(42)
    X = np.random.normal(0, 1, size=(60, 4))
    # Class 1 shifted
    X[30:] += 3.0
    y = np.array([0]*30 + [1]*30)

    sup = SupervisedComparator(model_type="random_forest", random_seed=42)
    sup.fit(X, y)
    metrics = sup.evaluate(X, y, threshold=0.5)

    assert metrics["precision"] > 0.8
    assert metrics["recall"] > 0.8
    assert metrics["f1_score"] > 0.8
    assert "pr_curve" in metrics
    assert len(metrics["pr_curve"]) > 0

def test_signal_explainer():
    raw_dict = {"amount": 5000.0, "location": "FR", "device_channel": "mobile"}
    feat_dict = {
        "historical_zscore": 4.5,
        "ratio_to_hist_mean": 6.2,
        "time_since_prev_sec": 30.0,
        "tx_count_1h": 4.0,
        "is_night_window": 1.0,
        "is_new_location": 1.0
    }
    signals = SignalExplainer.explain_transaction(raw_dict, feat_dict)
    assert len(signals) >= 3
    sig_names = [s["signal"] for s in signals]
    assert "High Amount Deviation" in sig_names
    assert "Rapid Transaction Burst" in sig_names
    assert "Unusual Time Window" in sig_names
