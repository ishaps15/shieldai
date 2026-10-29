import numpy as np
from typing import Dict, Any, List, Tuple
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    precision_score, recall_score, f1_score, confusion_matrix,
    precision_recall_curve, auc, roc_auc_score
)

class SupervisedComparator:
    """
    Supervised benchmark models (Random Forest / Logistic Regression)
    for datasets containing verified fraud labels.
    Calculates PR-AUC, F1, precision-recall trade-offs, and confusion matrix.
    """

    def __init__(self, model_type: str = "random_forest", random_seed: int = 42):
        self.model_type = model_type
        self.random_seed = random_seed
        if model_type == "logistic_regression":
            self.model = LogisticRegression(class_weight="balanced", random_state=random_seed, max_iter=1000)
        else:
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                class_weight="balanced",
                random_state=random_seed,
                n_jobs=-1
            )
        self.is_fitted = False

    def fit(self, X: np.ndarray, y: np.ndarray) -> "SupervisedComparator":
        self.model.fit(X, y)
        self.is_fitted = True
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        if not self.is_fitted:
            raise ValueError("Supervised model must be fitted before predict_proba.")
        # Return probability of positive class (fraud = 1)
        return self.model.predict_proba(X)[:, 1]

    def evaluate(self, X: np.ndarray, y: np.ndarray, threshold: float = 0.5) -> Dict[str, Any]:
        """Calculates comprehensive classification metrics, PR-curve, and confusion matrix."""
        probas = self.predict_proba(X)
        preds = (probas >= threshold).astype(int)

        tn, fp, fn, tp = confusion_matrix(y, preds, labels=[0, 1]).ravel()
        
        prec = float(precision_score(y, preds, zero_division=0))
        rec = float(recall_score(y, preds, zero_division=0))
        f1 = float(f1_score(y, preds, zero_division=0))
        fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0

        # Precision-Recall curve
        precisions, recalls, pr_thresholds = precision_recall_curve(y, probas)
        pr_auc = float(auc(recalls, precisions))
        try:
            roc_auc = float(roc_auc_score(y, probas))
        except Exception:
            roc_auc = 0.5

        # Downsample PR curve points for frontend chart rendering (max 30 points)
        step = max(len(precisions) // 30, 1)
        pr_curve_points = [
            {"recall": round(float(recalls[i]), 4), "precision": round(float(precisions[i]), 4)}
            for i in range(0, len(precisions), step)
        ]

        # Feature importances if Random Forest
        feature_importances = {}
        if hasattr(self.model, "feature_importances_"):
            feature_importances = {
                f"feat_{i}": round(float(v), 4) for i, v in enumerate(self.model.feature_importances_)
            }

        return {
            "model_type": self.model_type,
            "threshold": threshold,
            "true_positives": int(tp),
            "false_positives": int(fp),
            "true_negatives": int(tn),
            "false_negatives": int(fn),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "false_positive_rate": round(fpr, 4),
            "pr_auc": round(pr_auc, 4),
            "roc_auc": round(roc_auc, 4),
            "pr_curve": pr_curve_points,
            "feature_importances": feature_importances
        }
