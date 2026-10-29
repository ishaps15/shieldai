import {
  DashboardStats,
  Transaction,
  Alert,
  AlertGroup,
  ThresholdConfig,
  ThresholdPreviewResult,
  DriftReport,
  ModelMetadata,
  ModelEvaluationData,
  CSVValidationResult
} from '../types';

const API_BASE = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Dashboard
  getDashboardStats: () => fetchJson<DashboardStats>(`${API_BASE}/dashboard/stats`),

  // Transactions
  getTransactions: (params: {
    page?: number;
    page_size?: number;
    search?: string;
    risk_band?: string;
    is_anomaly?: boolean;
    min_amount?: number;
    max_amount?: number;
    sort_by?: string;
    sort_dir?: string;
  }) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.page_size) query.append('page_size', params.page_size.toString());
    if (params.search) query.append('search', params.search);
    if (params.risk_band) query.append('risk_band', params.risk_band);
    if (params.is_anomaly !== undefined) query.append('is_anomaly', params.is_anomaly.toString());
    if (params.min_amount) query.append('min_amount', params.min_amount.toString());
    if (params.max_amount) query.append('max_amount', params.max_amount.toString());
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.sort_dir) query.append('sort_dir', params.sort_dir);
    return fetchJson<{ items: Transaction[]; total: number; page: number; total_pages: number }>(
      `${API_BASE}/transactions?${query.toString()}`
    );
  },

  getTransactionDetail: (id: string) =>
    fetchJson<{ transaction: Transaction; sender_history: Transaction[]; contributing_signals: any[] }>(
      `${API_BASE}/transactions/${id}`
    ),

  // Alerts
  getAlerts: (params: {
    page?: number;
    page_size?: number;
    status?: string;
    risk_level?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.page_size) query.append('page_size', params.page_size.toString());
    if (params.status) query.append('status', params.status);
    if (params.risk_level) query.append('risk_level', params.risk_level);
    if (params.search) query.append('search', params.search);
    return fetchJson<{ items: Alert[]; total: number; page: number; total_pages: number }>(
      `${API_BASE}/alerts?${query.toString()}`
    );
  },

  getAlertDetail: (alertId: string) => fetchJson<Alert>(`${API_BASE}/alerts/${alertId}`),

  getAlertGroups: () => fetchJson<AlertGroup[]>(`${API_BASE}/alerts/groups/summary`),

  updateAlert: (
    alertId: string,
    payload: { status?: string; risk_level?: string; note?: string; assigned_analyst?: string; actor?: string }
  ) =>
    fetchJson<Alert>(`${API_BASE}/alerts/${alertId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  // Thresholds
  getCurrentThresholds: () => fetchJson<ThresholdConfig>(`${API_BASE}/thresholds/current`),

  previewThresholds: (payload: {
    strategy: string;
    low_threshold: number;
    medium_threshold: number;
    high_threshold: number;
    critical_threshold: number;
    amount_rule_threshold?: number;
    target_volume_per_day?: number;
  }) =>
    fetchJson<ThresholdPreviewResult>(`${API_BASE}/thresholds/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  applyThresholds: (payload: ThresholdConfig) =>
    fetchJson<{ status: string; message: string; config: ThresholdConfig }>(`${API_BASE}/thresholds/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  // Drift
  runDriftAnalysis: (payload: { split_method: string }) =>
    fetchJson<DriftReport>(`${API_BASE}/drift/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  simulateDrift: () =>
    fetchJson<DriftReport>(`${API_BASE}/drift/simulate_shift`, {
      method: 'POST',
    }),

  // Models
  getModels: () => fetchJson<ModelMetadata[]>(`${API_BASE}/models`),

  trainModel: (payload: {
    model_type: string;
    contamination: number;
    n_estimators: number;
    random_seed: number;
  }) =>
    fetchJson<any>(`${API_BASE}/models/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  activateModel: (modelId: string) =>
    fetchJson<any>(`${API_BASE}/models/activate/${modelId}`, {
      method: 'POST',
    }),

  getModelEvaluation: (modelType: string = 'random_forest', threshold: number = 0.5) =>
    fetchJson<ModelEvaluationData>(`${API_BASE}/models/evaluation?model_type=${modelType}&threshold=${threshold}`),

  // Ingestion
  validateCSV: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/ingest/validate`, {
      method: 'POST',
      body: formData,
    });
    return res.json() as Promise<CSVValidationResult>;
  },

  uploadCSV: async (file: File, autoScore: boolean = true) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('auto_score', autoScore.toString());
    const res = await fetch(`${API_BASE}/ingest/upload`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  loadDemoData: (mode: 'labelled' | 'unlabelled' | 'drifted', count: number = 1500) =>
    fetchJson<any>(`${API_BASE}/ingest/demo?mode=${mode}&count=${count}`, {
      method: 'POST',
    }),
};
