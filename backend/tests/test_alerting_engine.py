import pytest
import numpy as np
from app.services.alerting_engine import AlertingEngine
from app.models.schemas import ThresholdConfigModel

def test_risk_band_mapping():
    cfg = ThresholdConfigModel(
        low_threshold=0.3,
        medium_threshold=0.5,
        high_threshold=0.7,
        critical_threshold=0.85
    )
    assert AlertingEngine.get_risk_band(0.2, cfg) == "normal"
    assert AlertingEngine.get_risk_band(0.35, cfg) == "low"
    assert AlertingEngine.get_risk_band(0.55, cfg) == "medium"
    assert AlertingEngine.get_risk_band(0.75, cfg) == "high"
    assert AlertingEngine.get_risk_band(0.92, cfg) == "critical"

def test_threshold_preview_simulation():
    np.random.seed(42)
    scores = np.random.uniform(0.1, 0.95, size=200)
    amounts = np.random.uniform(10.0, 500.0, size=200)
    labels = (scores > 0.7).astype(int)

    preview = AlertingEngine.preview_thresholds(
        scores=scores,
        amounts=amounts,
        labels=labels,
        strategy="fixed",
        low_t=0.3,
        med_t=0.5,
        high_t=0.7,
        crit_t=0.85
    )

    assert preview["total_evaluated"] == 200
    assert preview["flagged_count"] > 0
    assert "confusion_matrix" in preview
    assert preview["confusion_matrix"]["tp"] > 0
    assert preview["confusion_matrix"]["precision"] > 0.0

def test_quantile_strategy_preview():
    scores = np.linspace(0.0, 1.0, 100)
    amounts = np.full(100, 50.0)

    preview = AlertingEngine.preview_thresholds(
        scores=scores,
        amounts=amounts,
        labels=None,
        strategy="quantile",
        low_t=0.3, med_t=0.5, high_t=0.7, crit_t=0.85
    )

    assert preview["total_evaluated"] == 100
    assert preview["effective_thresholds"]["critical"] >= 0.95
