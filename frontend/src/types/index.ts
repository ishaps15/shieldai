export type RiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'normal';
export type AlertStatus = 'New' | 'Under Review' | 'Escalated' | 'Resolved' | 'False Positive';
export type ThresholdStrategy = 'fixed' | 'quantile' | 'target_volume';

export interface SignalExplanation {
  signal: string;
  value: number;
  description: string;
  severity: 'info' | 'warning' | 'danger';
}

export interface Transaction {
  id: number;
  transaction_id: string;
  timestamp: string;
  amount: number;
  currency: string;
  sender_id: string;
  receiver_id: string;
  transaction_type: string;
  merchant_category: string;
  location: string;
  device_channel: string;
  is_fraud_ground_truth?: number | null;
  is_synthetic: boolean;
  batch_id: string;
  anomaly_score?: number | null;
  is_anomaly: boolean;
  risk_band: RiskLevel;
  baseline_score?: number | null;
  supervised_score?: number | null;
  contributing_signals?: SignalExplanation[];
  created_at: string;
}

export interface AlertAuditLog {
  id: number;
  alert_id: string;
  action: string;
  old_value?: string | null;
  new_value?: string | null;
  note?: string | null;
  actor: string;
  timestamp: string;
}

export interface Alert {
  id: number;
  alert_id: string;
  transaction_id: string;
  sender_id: string;
  timestamp: string;
  risk_level: RiskLevel;
  anomaly_score: number;
  status: AlertStatus;
  group_id?: string | null;
  rule_triggers?: string[];
  assigned_analyst?: string;
  created_at: string;
  updated_at: string;
  audit_logs: AlertAuditLog[];
  transaction?: Transaction;
}

export interface AlertGroup {
  group_id: string;
  alert_count: number;
  highest_risk: RiskLevel;
  last_activity: string;
  sender_id: string;
}

export interface ThresholdConfig {
  id?: number;
  strategy: ThresholdStrategy;
  low_threshold: number;
  medium_threshold: number;
  high_threshold: number;
  critical_threshold: number;
  max_alerts_per_day: number;
  amount_rule_threshold: number;
  rapid_tx_velocity_seconds: number;
  customer_deviation_sigma: number;
  is_active: boolean;
}

export interface ThresholdPreviewResult {
  total_evaluated: number;
  flagged_count: number;
  flagged_percent: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  estimated_alerts_per_day: number;
  exceeds_max_daily_budget: boolean;
  effective_thresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  confusion_matrix?: {
    tp: number;
    fp: number;
    fn: number;
    tn: number;
    precision: number;
    recall: number;
    f1_score: number;
    fpr: number;
  } | null;
}

export interface FeatureDriftMetric {
  psi: number;
  ks_statistic: number;
  p_value: number;
  status: 'Stable' | 'Warning' | 'Significant Drift';
  reference_mean: number;
  monitoring_mean: number;
  mean_pct_change: number;
}

export interface DriftReport {
  overall_status: 'Stable' | 'Warning' | 'Significant Drift';
  score_psi: number;
  score_ks_stat: number;
  score_p_val: number;
  reference_flagged_rate: number;
  monitoring_flagged_rate: number;
  flagged_rate_diff: number;
  high_drift_features: string[];
  warning_features: string[];
  feature_metrics: Record<string, FeatureDriftMetric>;
  recommendations: string[];
  drift_explanation: string;
  report_id?: string;
  reference_window?: string;
  monitoring_window?: string;
}

export interface ModelMetadata {
  model_id: string;
  model_type: string;
  version: string;
  is_active: boolean;
  contamination: number;
  n_estimators: number;
  random_seed: number;
  metrics?: Record<string, any>;
  trained_at: string;
}

export interface ModelEvaluationData {
  has_ground_truth: boolean;
  message?: string;
  total_labelled_samples?: number;
  total_fraud_cases?: number;
  total_legitimate_cases?: number;
  evaluation_metrics?: {
    model_type: string;
    threshold: number;
    true_positives: number;
    false_positives: number;
    true_negatives: number;
    false_negatives: number;
    precision: number;
    recall: number;
    f1_score: number;
    false_positive_rate: number;
    pr_auc: number;
    roc_auc: number;
    pr_curve: Array<{ recall: number; precision: number }>;
  };
  threshold_tradeoffs?: Array<{
    threshold: number;
    flagged: number;
    true_positives: number;
    false_positives: number;
    false_negatives: number;
    precision: number;
    recall: number;
    f1_score: number;
  }>;
}

export interface DashboardStats {
  total_transactions: number;
  total_anomalies: number;
  anomalous_percentage: number;
  high_critical_alerts: number;
  review_backlog: number;
  confirmed_fraud_cases: number;
  confirmed_false_positives: number;
  active_model: {
    model_id: string;
    model_type: string;
    version: string;
    contamination: number;
    n_estimators: number;
  };
  current_thresholds: {
    strategy: string;
    low: number;
    medium: number;
    high: number;
    critical: number;
    amount_rule: number;
  };
  drift_status: 'Stable' | 'Warning' | 'Significant Drift';
  volume_by_day: Array<{
    date: string;
    total_transactions: number;
    total_amount: number;
    anomalies: number;
  }>;
  score_distribution: Array<{
    range: string;
    count: number;
    is_anomalous_zone: boolean;
  }>;
  amount_distribution: Array<{
    range: string;
    count: number;
  }>;
  risk_breakdown: Record<string, number>;
  alert_status_breakdown: Record<string, number>;
}

export interface CSVValidationResult {
  is_valid: boolean;
  error?: string;
  columns: string[];
  missing_required: string[];
  total_rows: number;
  duplicates_count: number;
  missing_values: Record<string, number>;
  has_fraud_labels: boolean;
  preview_rows: Record<string, any>[];
}
