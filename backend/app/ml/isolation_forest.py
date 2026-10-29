import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from sklearn.ensemble import IsolationForest
from app.core.config import settings

class IsolationForestDetector:
    """
    Primary unsupervised anomaly detector using scikit-learn Isolation Forest.
    Produces a normalized anomaly score in [0.0, 1.0] where 1.0 is most anomalous.
    Note: Anomaly score is an isolation metric, NOT a calibrated probability of fraud.
    """

    def __init__(self, contamination: float = 0.05, n_estimators: int = 150, random_seed: int = 42):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_seed = random_seed
        self.model = IsolationForest(
            contamination=self.contamination,
            n_estimators=self.n_estimators,
            random_state=self.random_seed,
            n_jobs=-1
        )
        self.is_fitted = False
        self.score_min = -0.5
        self.score_max = 0.5

    def fit(self, X: np.ndarray) -> "IsolationForestDetector":
        """Fits the Isolation Forest on feature matrix X and calculates score bounds for calibration."""
        if len(X) < 10:
            raise ValueError("Insufficient transactions to train Isolation Forest (minimum 10 required).")
        self.model.fit(X)
        raw_scores = self.model.decision_function(X)
        # decision_function: lower (negative) = more anomalous, higher (positive) = normal
        self.score_min = float(np.min(raw_scores))
        self.score_max = float(np.max(raw_scores))
        self.is_fitted = True
        return self

    def score(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Computes anomaly scores and default anomaly predictions.
        Returns:
            - normalized_scores: array in [0.0, 1.0], where 1.0 is maximum anomaly
            - is_anomaly: boolean array based on default contamination threshold
        """
        if not self.is_fitted:
            # Fallback if not fitted yet: fit on given data
            self.fit(X)

        raw_scores = self.model.decision_function(X)
        # raw_scores: negative = anomaly. We invert so that higher = anomalous.
        score_span = max(self.score_max - self.score_min, 1e-6)
        # Normalization: lower raw_score gives score close to 1.0
        normalized = (self.score_max - raw_scores) / score_span
        normalized_scores = np.clip(normalized, 0.0, 1.0)

        # Sklearn default prediction (-1 for outlier, 1 for inlier)
        preds = self.model.predict(X)
        is_anomaly = preds == -1

        return normalized_scores, is_anomaly

    def save(self, filepath: str) -> str:
        """Persists trained model and bounds to disk."""
        payload = {
            "model": self.model,
            "contamination": self.contamination,
            "n_estimators": self.n_estimators,
            "random_seed": self.random_seed,
            "score_min": self.score_min,
            "score_max": self.score_max,
            "is_fitted": self.is_fitted
        }
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(payload, filepath)
        return filepath

    @classmethod
    def load(cls, filepath: str) -> "IsolationForestDetector":
        """Loads serialized model from disk."""
        payload = joblib.load(filepath)
        instance = cls(
            contamination=payload["contamination"],
            n_estimators=payload["n_estimators"],
            random_seed=payload["random_seed"]
        )
        instance.model = payload["model"]
        instance.score_min = payload["score_min"]
        instance.score_max = payload["score_max"]
        instance.is_fitted = payload["is_fitted"]
        return instance
