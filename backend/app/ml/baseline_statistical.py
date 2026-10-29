import numpy as np
import pandas as pd
from typing import Tuple

class BaselineMADDetector:
    """
    Statistical baseline anomaly detector using Median Absolute Deviation (MAD)
    and robust modified Z-scores. Serves as a transparent benchmark against ML models.
    """

    def __init__(self):
        self.medians = None
        self.mads = None
        self.is_fitted = False

    def fit(self, X: np.ndarray) -> "BaselineMADDetector":
        """Computes feature-wise medians and median absolute deviations."""
        self.medians = np.median(X, axis=0)
        abs_diff = np.abs(X - self.medians)
        self.mads = np.median(abs_diff, axis=0)
        # Avoid division by zero: replace zero MAD with 1.0 or small epsilon
        self.mads[self.mads == 0.0] = 1.0
        self.is_fitted = True
        return self

    def score(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Calculates robust composite Z-scores across key features.
        Returns normalized scores in [0.0, 1.0] and anomaly flags.
        """
        if not self.is_fitted:
            self.fit(X)

        # Modified Z-score = 0.6745 * |X - median| / MAD
        mod_z = 0.6745 * np.abs(X - self.medians) / self.mads
        # Maximum modified Z-score across features or Euclidean norm
        max_z = np.max(mod_z, axis=1)

        # Standard threshold for modified Z-score is ~3.5
        # Normalize with a smooth sigmoid mapping so score is in [0.0, 1.0]
        # At z = 3.5, score is ~ 0.50
        normalized_scores = 1.0 / (1.0 + np.exp(-(max_z - 3.5) / 1.5))
        is_anomaly = max_z > 3.5

        return normalized_scores, is_anomaly
