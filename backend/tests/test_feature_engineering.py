import pytest
import pandas as pd
import numpy as np
from app.ml.feature_pipeline import FeaturePipeline

def test_feature_engineering_no_future_leakage():
    # Construct sequence of transactions for a single customer
    data = [
        {"transaction_id": "T1", "timestamp": "2026-03-01 10:00:00", "amount": 100.0, "sender_id": "C1", "location": "US", "device_channel": "web"},
        {"transaction_id": "T2", "timestamp": "2026-03-01 10:30:00", "amount": 100.0, "sender_id": "C1", "location": "US", "device_channel": "web"},
        {"transaction_id": "T3", "timestamp": "2026-03-01 11:00:00", "amount": 1000.0, "sender_id": "C1", "location": "FR", "device_channel": "mobile_app"},
    ]
    df = pd.DataFrame(data)
    pipeline = FeaturePipeline()
    pipeline.fit(df)
    features_df, feature_names, missing = pipeline.transform(df)

    assert len(features_df) == 3
    assert "log_amount" in features_df.columns
    assert "ratio_to_hist_mean" in features_df.columns
    assert "time_since_prev_sec" in features_df.columns

    # For T1 (first transaction), time_since_prev should be fallback (86400)
    assert features_df.loc[0, "time_since_prev_sec"] == 86400.0
    # For T2, 30 mins = 1800s
    assert features_df.loc[1, "time_since_prev_sec"] == 1800.0
    # For T3, 30 mins = 1800s
    assert features_df.loc[2, "time_since_prev_sec"] == 1800.0

    # For T3, previous average was 100.0, so ratio_to_hist_mean should be approx 10.0
    assert features_df.loc[2, "ratio_to_hist_mean"] == pytest.approx(10.0, rel=0.1)

    # For T3, location was new ("FR"), so is_new_location should be 1.0
    assert features_df.loc[2, "is_new_location"] == 1.0
    # For T2, location "US" was already seen in T1, so is_new_location should be 0.0
    assert features_df.loc[1, "is_new_location"] == 0.0

def test_incomplete_dataset_adaptability():
    # Only amount and timestamp provided
    df = pd.DataFrame({
        "timestamp": ["2026-03-01 12:00:00", "2026-03-01 12:05:00"],
        "amount": [50.0, 75.0]
    })
    pipeline = FeaturePipeline()
    features_df, names, missing_signals = pipeline.transform(df)

    assert len(features_df) == 2
    assert len(missing_signals) > 0
    assert any("sender_id" in s for s in missing_signals)
    assert not features_df.isna().any().any()
