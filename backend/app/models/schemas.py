from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, JSON, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field, ConfigDict
from app.core.database import Base

# ==========================================
# SQLAlchemy ORM Models
# ==========================================

class TransactionModel(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(64), unique=True, index=True, nullable=False)
    timestamp = Column(DateTime, index=True, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(8), default="USD")
    sender_id = Column(String(64), index=True, nullable=False)
    receiver_id = Column(String(64), index=True, nullable=False)
    transaction_type = Column(String(32), default="transfer")
    merchant_category = Column(String(32), default="general")
    location = Column(String(64), default="US")
    device_channel = Column(String(32), default="web")
    is_fraud_ground_truth = Column(Integer, nullable=True) # 0, 1, or None
    is_synthetic = Column(Boolean, default=True)
    batch_id = Column(String(64), index=True, default="default")
    
    # ML Scoring Results
    anomaly_score = Column(Float, nullable=True) # Normalized 0.0 - 1.0
    is_anomaly = Column(Boolean, default=False)
    risk_band = Column(String(16), default="low") # low, medium, high, critical
    baseline_score = Column(Float, nullable=True) # MAD / Robust Z-score
    supervised_score = Column(Float, nullable=True) # RF / LR probability if trained
    contributing_signals = Column(JSON, nullable=True) # List of dicts

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    alerts = relationship("AlertModel", back_populates="transaction", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_sender_timestamp", "sender_id", "timestamp"),
        Index("idx_risk_score", "risk_band", "anomaly_score"),
    )


class AlertModel(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(64), unique=True, index=True, nullable=False)
    transaction_id = Column(String(64), ForeignKey("transactions.transaction_id"), index=True, nullable=False)
    sender_id = Column(String(64), index=True, nullable=False)
    timestamp = Column(DateTime, index=True, nullable=False)
    risk_level = Column(String(16), nullable=False) # low, medium, high, critical
    anomaly_score = Column(Float, nullable=False)
    
    # Workflow status: New, Under Review, Escalated, Resolved, False Positive
    status = Column(String(32), default="New", index=True)
    group_id = Column(String(64), index=True, nullable=True)
    rule_triggers = Column(JSON, nullable=True) # list of rules triggered
    assigned_analyst = Column(String(64), default="Analyst")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    transaction = relationship("TransactionModel", back_populates="alerts")
    audit_logs = relationship("AlertAuditLogModel", back_populates="alert", cascade="all, delete-orphan")


class AlertAuditLogModel(Base):
    __tablename__ = "alert_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(64), ForeignKey("alerts.alert_id"), index=True, nullable=False)
    action = Column(String(32), nullable=False) # status_change, note_added, severity_change, auto_generated
    old_value = Column(String(64), nullable=True)
    new_value = Column(String(64), nullable=True)
    note = Column(Text, nullable=True)
    actor = Column(String(64), default="System")
    timestamp = Column(DateTime, default=datetime.utcnow)

    alert = relationship("AlertModel", back_populates="audit_logs")


class ThresholdConfigModel(Base):
    __tablename__ = "threshold_configs"

    id = Column(Integer, primary_key=True, index=True)
    strategy = Column(String(32), default="fixed") # fixed, quantile, target_volume
    low_threshold = Column(Float, default=0.35)
    medium_threshold = Column(Float, default=0.55)
    high_threshold = Column(Float, default=0.75)
    critical_threshold = Column(Float, default=0.90)
    max_alerts_per_day = Column(Integer, default=250)
    amount_rule_threshold = Column(Float, default=10000.0)
    rapid_tx_velocity_seconds = Column(Integer, default=120)
    customer_deviation_sigma = Column(Float, default=3.5)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class MLModelRegistryModel(Base):
    __tablename__ = "ml_model_registry"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(String(64), unique=True, index=True, nullable=False)
    model_type = Column(String(32), nullable=False) # isolation_forest, random_forest, logistic_regression, baseline_mad
    version = Column(String(32), nullable=False)
    contamination = Column(Float, default=0.05)
    n_estimators = Column(Integer, default=150)
    random_seed = Column(Integer, default=42)
    is_active = Column(Boolean, default=False)
    metrics = Column(JSON, nullable=True) # precision, recall, f1, pr_auc, etc.
    filepath = Column(String(256), nullable=False)
    trained_at = Column(DateTime, default=datetime.utcnow)


class DriftReportModel(Base):
    __tablename__ = "drift_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(64), unique=True, index=True, nullable=False)
    reference_window = Column(String(128), nullable=False)
    monitoring_window = Column(String(128), nullable=False)
    overall_status = Column(String(32), nullable=False) # Stable, Warning, Significant Drift
    score_psi = Column(Float, nullable=False)
    feature_metrics = Column(JSON, nullable=False)
    flagged_rate_diff = Column(Float, default=0.0)
    recommendations = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ==========================================
# Pydantic Schemas for Request / Response
# ==========================================

class SignalExplanation(BaseModel):
    signal: str
    value: float
    description: str
    severity: str # info, warning, danger


class TransactionBase(BaseModel):
    transaction_id: str
    timestamp: datetime
    amount: float
    currency: str = "USD"
    sender_id: str
    receiver_id: str
    transaction_type: str = "transfer"
    merchant_category: str = "general"
    location: str = "US"
    device_channel: str = "web"
    is_fraud_ground_truth: Optional[int] = None
    is_synthetic: bool = True
    batch_id: str = "default"


class TransactionResponse(TransactionBase):
    id: int
    anomaly_score: Optional[float] = None
    is_anomaly: bool = False
    risk_band: str = "low"
    baseline_score: Optional[float] = None
    supervised_score: Optional[float] = None
    contributing_signals: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertAuditLogResponse(BaseModel):
    id: int
    alert_id: str
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    note: Optional[str] = None
    actor: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertResponse(BaseModel):
    id: int
    alert_id: str
    transaction_id: str
    sender_id: str
    timestamp: datetime
    risk_level: str
    anomaly_score: float
    status: str
    group_id: Optional[str] = None
    rule_triggers: Optional[List[str]] = None
    assigned_analyst: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    audit_logs: List[AlertAuditLogResponse] = []
    transaction: Optional[TransactionResponse] = None

    model_config = ConfigDict(from_attributes=True)


class AlertUpdate(BaseModel):
    status: Optional[str] = None # New, Under Review, Escalated, Resolved, False Positive
    risk_level: Optional[str] = None
    assigned_analyst: Optional[str] = None
    note: Optional[str] = None
    actor: str = "Analyst"


class ThresholdConfigSchema(BaseModel):
    strategy: str = "fixed" # fixed, quantile, target_volume
    low_threshold: float = 0.35
    medium_threshold: float = 0.55
    high_threshold: float = 0.75
    critical_threshold: float = 0.90
    max_alerts_per_day: int = 250
    amount_rule_threshold: float = 10000.0
    rapid_tx_velocity_seconds: int = 120
    customer_deviation_sigma: float = 3.5
    is_active: bool = True


class ThresholdPreviewRequest(BaseModel):
    strategy: str
    low_threshold: float
    medium_threshold: float
    high_threshold: float
    critical_threshold: float
    amount_rule_threshold: Optional[float] = None
    target_volume_per_day: Optional[int] = None
    target_precision: Optional[float] = None


class ThresholdPreviewResponse(BaseModel):
    total_evaluated: int
    flagged_count: int
    flagged_percent: float
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    estimated_alerts_per_day: float
    exceeds_max_daily_budget: bool
    confusion_matrix: Optional[Dict[str, Any]] = None # if labels present


class DriftReportResponse(BaseModel):
    id: int
    report_id: str
    reference_window: str
    monitoring_window: str
    overall_status: str # Stable, Warning, Significant Drift
    score_psi: float
    feature_metrics: Dict[str, Any]
    flagged_rate_diff: float
    recommendations: List[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ModelTrainingRequest(BaseModel):
    model_type: str = "isolation_forest" # isolation_forest, random_forest, logistic_regression, baseline_mad
    contamination: float = 0.05
    n_estimators: int = 150
    random_seed: int = 42
    use_ground_truth: bool = False


class ModelMetadataResponse(BaseModel):
    model_id: str
    model_type: str
    version: str
    is_active: bool
    contamination: float
    n_estimators: int
    random_seed: int
    metrics: Optional[Dict[str, Any]] = None
    trained_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DashboardStatsResponse(BaseModel):
    total_transactions: int
    total_anomalies: int
    anomalous_percentage: float
    high_critical_alerts: int
    review_backlog: int
    confirmed_fraud_cases: int
    confirmed_false_positives: int
    active_model: Dict[str, Any]
    current_thresholds: Dict[str, Any]
    drift_status: str
    volume_by_day: List[Dict[str, Any]]
    score_distribution: List[Dict[str, Any]]
    risk_breakdown: Dict[str, int]
    alert_status_breakdown: Dict[str, int]
