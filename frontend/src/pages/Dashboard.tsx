import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
  Cpu,
  Sliders,
  DollarSign,
  AlertOctagon,
  Eye,
  Zap,
  BarChart3,
  Shield,
  Sparkles,
  Lock,
  Compass,
  FileCheck2,
  PieChart
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats, Transaction } from '../types';
import { MetricCard } from '../components/layout/MetricCard';
import { VolumeTrendChart } from '../components/charts/VolumeTrendChart';
import { ScoreDistributionChart } from '../components/charts/ScoreDistributionChart';
import { Badge } from '../components/common/Badge';
import { NavPage } from '../components/layout/Sidebar';
import { Tooltip } from '../components/common/Tooltip';

interface DashboardProps {
  onNavigate: (page: NavPage) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAnomalies, setRecentAnomalies] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, txData] = await Promise.all([
        api.getDashboardStats(),
        api.getTransactions({ page: 1, page_size: 5, is_anomaly: true }),
      ]);
      setStats(statsData);
      setRecentAnomalies(txData.items);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-rosegold-200 border-t-rosegold-500 rounded-full animate-spin" />
            <Sparkles className="w-5 h-5 text-rosegold-500 absolute inset-0 m-auto" />
          </div>
          <span className="text-xs font-mono font-medium text-charcoal-400">CONNECTING TO SHIELD✦AI SURVEILLANCE...</span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 bg-rose-50/60 border border-rose-200 rounded-3xl text-center max-w-lg mx-auto shadow-soft">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-charcoal-900">Surveillance Telemetry Disconnected</h3>
        <p className="text-xs text-rose-700 mt-1">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 rosegold-btn text-xs font-semibold shadow-sm"
        >
          Reconnect Telemetry
        </button>
      </div>
    );
  }

  // Calculate resolution progress
  const totalAlerts = Object.values(stats.alert_status_breakdown).reduce((a, b) => a + b, 0);
  const resolvedAlerts = (stats.alert_status_breakdown['Resolved'] || 0) + (stats.alert_status_breakdown['False Positive'] || 0);
  const resolutionRate = totalAlerts > 0 ? Math.round((resolvedAlerts / totalAlerts) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* =========================================================================
          1. ELEGANT HERO SECTION WITH CALL-TO-ACTION (GUIDELINE #3)
          ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blush-50/80 via-white to-rosegold-50/50 border border-[#EEDDDF] rounded-3xl p-8 lg:p-10 shadow-soft">
        {/* Soft Decorative Ambient Circles */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-blush-200/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-rosegold-200/30 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border border-rosegold-200 text-rosegold-700 text-[11px] font-mono font-semibold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-rosegold-500" />
              <span>AUTONOMOUS FINANCIAL SURVEILLANCE & ANOMALY DEFENSE</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-[40px] font-bold text-charcoal-900 leading-[1.15] tracking-tight">
              Intelligent Fraud Detection <br />
              <span className="rosegold-gradient-text italic font-normal">With Precision ML Analytics</span>
            </h1>

            <p className="text-xs sm:text-sm text-charcoal-600 max-w-xl leading-relaxed font-sans">
              ShieldAI continuously evaluates financial transactions across multi-dimensional Isolation Forest trees, causal behavioral deviations, and Population Stability Index (PSI) drift safeguards.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={fetchStats}
                className="rosegold-btn px-5 py-2.5 text-xs font-semibold flex items-center shadow-md shadow-rosegold-500/20"
              >
                <Zap className="w-4 h-4 mr-1.5" />
                <span>Run Surveillance Audit</span>
              </button>

              <button
                onClick={() => onNavigate('ingestion')}
                className="rosegold-outline-btn px-5 py-2.5 text-xs font-semibold flex items-center"
              >
                <span>Ingest Transaction Stream</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </button>

              <button
                onClick={() => onNavigate('drift')}
                className="px-4 py-2.5 text-xs text-charcoal-600 hover:text-rosegold-700 font-medium transition-colors"
              >
                Drift Monitor &rarr;
              </button>
            </div>

            {/* Quick Engine Telemetry Bar */}
            <div className="pt-3 flex flex-wrap items-center gap-4 text-[11px] font-mono text-charcoal-500 border-t border-blush-200/60">
              <span className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                Model: <strong className="text-charcoal-800 ml-1 font-semibold">{stats.active_model.model_type}</strong>
              </span>
              <span>•</span>
              <span>Contamination: <strong className="text-charcoal-800 font-semibold">{(stats.active_model.contamination * 100).toFixed(1)}%</strong></span>
              <span>•</span>
              <span>Threshold Strategy: <strong className="text-rosegold-700 font-semibold uppercase">{stats.current_thresholds.strategy}</strong></span>
            </div>
          </div>

          {/* Right Hero Visual Card Area (Guideline #4 Visual Polish) */}
          <div className="lg:col-span-5">
            <div className="bg-white/90 backdrop-blur-md border border-rosegold-200 rounded-3xl p-6 shadow-card relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-blush-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-blush-100 flex items-center justify-center text-rosegold-600">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-charcoal-900 block font-heading">Live Telemetry Node</span>
                    <span className="text-[10px] text-charcoal-400 font-mono">SQLite WAL Engine</span>
                  </div>
                </div>
                <Badge type="risk" value="low" size="sm" />
              </div>

              {/* Visual Metrics Showcase inside card */}
              <div className="mt-4 space-y-3">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-blush-50 to-white border border-blush-200/80">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-charcoal-500 text-[10px] uppercase font-semibold">Anomaly Incidence</span>
                    <span className="font-bold text-rosegold-700">{stats.anomalous_percentage}%</span>
                  </div>
                  <div className="w-full bg-blush-200/50 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rosegold-400 to-rosegold-600 rounded-full"
                      style={{ width: `${Math.min(stats.anomalous_percentage * 5, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-3 rounded-2xl bg-blush-50/50 border border-blush-100">
                    <span className="text-[10px] text-charcoal-400 block font-sans">Flagged Cutoff</span>
                    <span className="text-base font-bold text-charcoal-900">{stats.current_thresholds.medium.toFixed(2)}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-blush-50/50 border border-blush-100">
                    <span className="text-[10px] text-charcoal-400 block font-sans">Active Drift</span>
                    <span className="text-base font-bold text-emerald-700">{stats.drift_status}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-blush-100 flex items-center justify-between text-[11px] text-charcoal-500 font-mono">
                <span>Total Evaluated: {stats.total_transactions} TX</span>
                <span className="text-rosegold-700 font-semibold cursor-pointer hover:underline" onClick={() => onNavigate('transactions')}>
                  Inspect Stream &rarr;
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. FEATURES & PLATFORM SERVICES CARDS (GUIDELINE #3)
          ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base font-bold text-charcoal-900 font-serif">Core Surveillance Architecture</h2>
            <p className="text-xs text-charcoal-500">Four specialized modular tiers governing real-time risk intelligence</p>
          </div>
          <span className="text-[11px] font-mono text-rosegold-700 font-medium">FULL-STACK ACTIVE</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="luxury-card p-5 space-y-2 hover:border-rosegold-300">
            <div className="w-8 h-8 rounded-xl bg-blush-100 text-rosegold-700 flex items-center justify-center font-bold text-xs border border-blush-200">
              01
            </div>
            <h3 className="text-xs font-bold text-charcoal-900 font-heading">Leak-Free Feature Pipeline</h3>
            <p className="text-[11px] text-charcoal-500 leading-relaxed">
              Causal rolling windows compute customer baseline deviations strictly from past transactions (t &lt; t_i) to prevent data leakage.
            </p>
          </div>

          <div className="luxury-card p-5 space-y-2 hover:border-rosegold-300">
            <div className="w-8 h-8 rounded-xl bg-blush-100 text-rosegold-700 flex items-center justify-center font-bold text-xs border border-blush-200">
              02
            </div>
            <h3 className="text-xs font-bold text-charcoal-900 font-heading">Isolation Forest Trees</h3>
            <p className="text-[11px] text-charcoal-500 leading-relaxed">
              Tree-based multi-dimensional isolation computes normalized rarity scores in [0.0, 1.0], paired with robust MAD statistical benchmarks.
            </p>
          </div>

          <div className="luxury-card p-5 space-y-2 hover:border-rosegold-300">
            <div className="w-8 h-8 rounded-xl bg-blush-100 text-rosegold-700 flex items-center justify-center font-bold text-xs border border-blush-200">
              03
            </div>
            <h3 className="text-xs font-bold text-charcoal-900 font-heading">Deduplicated Alert Engine</h3>
            <p className="text-[11px] text-charcoal-500 leading-relaxed">
              Groups rapid repeated bursts from the same sender into unified incident bundles to prevent alert fatigue on investigation desks.
            </p>
          </div>

          <div className="luxury-card p-5 space-y-2 hover:border-rosegold-300">
            <div className="w-8 h-8 rounded-xl bg-blush-100 text-rosegold-700 flex items-center justify-center font-bold text-xs border border-blush-200">
              04
            </div>
            <h3 className="text-xs font-bold text-charcoal-900 font-heading">Population Drift (PSI & KS)</h3>
            <p className="text-[11px] text-charcoal-500 leading-relaxed">
              Continuous monitoring using Population Stability Index (PSI) and Kolmogorov-Smirnov tests to detect covariate and score drift over time.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. REAL OPERATIONAL METRICS & KPI CARDS
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Transactions"
          value={stats.total_transactions.toLocaleString()}
          subtitle="Processed via causal pipeline"
          icon={<Layers className="w-5 h-5" />}
          statusColor="blue"
          trend={{ value: '100% REALTIME', isNeutral: true }}
          tooltip="Total historical and ingested financial events evaluated without future-data leakage."
        />
        <MetricCard
          title="Flagged Anomalies"
          value={stats.total_anomalies.toLocaleString()}
          subtitle={`${stats.anomalous_percentage}% anomaly incidence`}
          icon={<ShieldAlert className="w-5 h-5" />}
          statusColor="amber"
          trend={{ value: `${stats.anomalous_percentage}%`, isPositive: stats.anomalous_percentage <= 7 }}
          tooltip="Transactions classified as unusual based on tree isolation distance and behavioral rules."
        />
        <MetricCard
          title="Critical / High Incidents"
          value={stats.high_critical_alerts.toLocaleString()}
          subtitle={`${stats.review_backlog} currently pending triage`}
          icon={<AlertOctagon className="w-5 h-5" />}
          statusColor="red"
          accentBorder={stats.high_critical_alerts > 0}
          tooltip="High-severity events requiring immediate compliance investigator attention."
        />
        <MetricCard
          title="Feature Distribution Drift"
          value={stats.drift_status.toUpperCase()}
          subtitle="Population Stability Index (PSI)"
          icon={<Activity className="w-5 h-5" />}
          statusColor={
            stats.drift_status === 'Significant Drift'
              ? 'red'
              : stats.drift_status === 'Warning'
              ? 'amber'
              : 'emerald'
          }
          tooltip="Statistical monitoring comparing baseline reference distributions with recent activity."
        />
      </div>

      {/* =========================================================================
          4. MAIN VISUALIZATIONS GRID
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Transaction & Anomaly Volume Over Time */}
        <div className="lg:col-span-7 luxury-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-charcoal-900 font-heading">Surveillance Throughput & Anomaly Spikes</h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blush-100 text-rosegold-700 border border-blush-200">
                  14-DAY WINDOW
                </span>
              </div>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Daily transaction volume mapped against detected anomalous outliers
              </p>
            </div>
            <button
              onClick={() => onNavigate('transactions')}
              className="text-xs font-semibold text-rosegold-600 hover:text-rosegold-700 flex items-center transition-colors"
            >
              Explorer <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
          <VolumeTrendChart data={stats.volume_by_day} />
        </div>

        {/* Anomaly Score Density Histogram */}
        <div className="lg:col-span-5 luxury-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-charcoal-900 font-heading">Isolation Score Distribution</h2>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Density spectrum (Crimson = score &ge; {stats.current_thresholds.medium.toFixed(2)})
              </p>
            </div>
            <button
              onClick={() => onNavigate('thresholds')}
              className="text-xs font-semibold text-rosegold-600 hover:text-rosegold-700 flex items-center transition-colors"
            >
              Calibrate <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
          <ScoreDistributionChart data={stats.score_distribution} />
        </div>
      </div>

      {/* =========================================================================
          5. LIVE SUSPICIOUS FEED + TRIAGE HEALTH
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Suspicious Stream Feed */}
        <div className="lg:col-span-7 luxury-card p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-charcoal-900 flex items-center font-heading">
                <Zap className="w-4 h-4 text-rosegold-600 mr-1.5" />
                Latest Suspicious Detections
              </h3>
              <p className="text-xs text-charcoal-500">High-risk transactions flagged for immediate investigator review</p>
            </div>
            <button
              onClick={() => onNavigate('transactions')}
              className="text-xs text-rosegold-600 hover:text-rosegold-700 font-semibold"
            >
              View All ({stats.total_anomalies}) &rarr;
            </button>
          </div>

          <div className="divide-y divide-blush-100">
            {recentAnomalies.length === 0 ? (
              <div className="py-8 text-center text-xs text-charcoal-400">
                No anomalous transactions flagged currently.
              </div>
            ) : (
              recentAnomalies.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => onNavigate('transactions')}
                  className="py-3 flex items-center justify-between hover:bg-blush-50/60 px-2 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Badge type="risk" value={tx.risk_band} />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-charcoal-900">{tx.transaction_id}</span>
                        <span className="text-[11px] text-charcoal-400 font-mono">({tx.sender_id})</span>
                      </div>
                      <div className="text-[11px] text-charcoal-500 mt-0.5 flex items-center space-x-2">
                        <span className="font-semibold text-charcoal-800">${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <span>•</span>
                        <span className="capitalize">{tx.merchant_category}</span>
                        <span>•</span>
                        <span>{tx.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-rosegold-700">
                      Score: {tx.anomaly_score?.toFixed(3)}
                    </span>
                    <span className="block text-[10px] text-charcoal-400 font-mono">
                      {tx.timestamp.replace('T', ' ').slice(11, 19)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Triage Pipeline Progress & Truth Feedback */}
        <div className="lg:col-span-5 space-y-6">
          {/* Triage Progress Card */}
          <div className="luxury-card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-charcoal-900 font-heading">Alert Triage Resolution</h3>
              <span className="text-xs font-mono font-bold text-rosegold-700">{resolutionRate}% Resolved</span>
            </div>
            <div className="w-full bg-blush-100 h-2.5 rounded-full overflow-hidden mb-4">
              <div
                className="bg-gradient-to-r from-rosegold-400 via-blush-500 to-rosegold-600 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${resolutionRate}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2.5 bg-blush-50/60 rounded-xl border border-blush-100">
                <span className="text-[10px] text-charcoal-500 block font-sans">NEW</span>
                <span className="font-bold text-rosegold-700">{stats.alert_status_breakdown['New'] || 0}</span>
              </div>
              <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100">
                <span className="text-[10px] text-charcoal-500 block font-sans">IN REVIEW</span>
                <span className="font-bold text-amber-700">{stats.alert_status_breakdown['Under Review'] || 0}</span>
              </div>
              <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-charcoal-500 block font-sans">RESOLVED</span>
                <span className="font-bold text-emerald-700">{stats.alert_status_breakdown['Resolved'] || 0}</span>
              </div>
            </div>
          </div>

          {/* Feedback & Ground Truth Summary */}
          <div className="luxury-card p-6">
            <h3 className="text-sm font-bold text-charcoal-900 mb-1 font-heading">Verification & Ground Truth</h3>
            <p className="text-xs text-charcoal-500 mb-3">Distinguishing verified fraud labels from analyst feedback:</p>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-blush-50/50 rounded-xl border border-blush-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-charcoal-900 block font-sans">Confirmed Ground-Truth Fraud</span>
                  <span className="text-[10px] text-charcoal-500">Verified by synthetic label tags</span>
                </div>
                <span className="font-mono text-base font-bold text-rose-700">{stats.confirmed_fraud_cases}</span>
              </div>
              <div className="p-3 bg-blush-50/50 rounded-xl border border-blush-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-charcoal-900 block font-sans">Analyst-Reported False Positives</span>
                  <span className="text-[10px] text-charcoal-500">Benign transactions closed by investigators</span>
                </div>
                <span className="font-mono text-base font-bold text-charcoal-700">{stats.confirmed_false_positives}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
