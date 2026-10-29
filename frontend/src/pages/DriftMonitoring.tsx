import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  Info,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { api } from '../services/api';
import { DriftReport } from '../types';
import { DriftDistributionChart } from '../components/charts/DriftDistributionChart';
import { Tooltip } from '../components/common/Tooltip';

export const DriftMonitoring: React.FC = () => {
  const [report, setReport] = useState<DriftReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDrift = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.runDriftAnalysis({ split_method: 'chronological' });
      setReport(res);
    } catch (err: any) {
      setError(err.message || 'Failed to execute drift monitoring analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateShift = async () => {
    try {
      setSimulating(true);
      setError(null);
      const res = await api.simulateDrift();
      setReport(res);
    } catch (err: any) {
      setError(err.message || 'Failed to simulate data shift');
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    fetchDrift();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Status Header */}
      <div className="luxury-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="font-serif font-bold text-xl text-charcoal-900">
              Statistical Feature & Model Drift Monitor
            </h2>
            <Tooltip content="Population Stability Index (PSI) assesses distribution distance between baseline reference data and recent monitoring windows." />
          </div>
          <p className="text-xs text-charcoal-500 mt-1">
            Surveillance of behavioral features, anomaly score density, and flagged rate shifts using PSI & Kolmogorov-Smirnov tests.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSimulateShift}
            disabled={simulating || loading}
            className="rosegold-outline-btn px-4 py-2 text-xs font-semibold flex items-center disabled:opacity-50 font-mono"
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
            {simulating ? 'Injecting Shift...' : 'SIMULATE DATA SHIFT'}
          </button>
          <button
            onClick={fetchDrift}
            disabled={loading}
            className="rosegold-btn px-4 py-2 text-xs font-semibold flex items-center disabled:opacity-50 font-mono"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            {loading ? 'Analyzing...' : 'RE-RUN DRIFT ANALYSIS'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between font-mono">
          <span>{error}</span>
          <button onClick={fetchDrift} className="underline text-rose-700 hover:text-rose-900 font-semibold">
            Retry
          </button>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Status Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            <div className="luxury-card p-5">
              <span className="text-[10px] text-charcoal-400 uppercase tracking-widest font-semibold block">
                OVERALL DRIFT STATUS
              </span>
              <div className="mt-1 flex items-center space-x-2">
                <span
                  className={`text-xl font-bold ${
                    report.overall_status === 'Significant Drift'
                      ? 'text-rose-600'
                      : report.overall_status === 'Warning'
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {report.overall_status.toUpperCase()}
                </span>
              </div>
              <span className="text-[11px] text-charcoal-500 mt-1 block font-sans">
                {report.overall_status === 'Stable'
                  ? 'Distributions match reference baseline'
                  : 'Distribution shift detected across features'}
              </span>
            </div>

            <div className="luxury-card p-5">
              <span className="text-[10px] text-charcoal-400 uppercase tracking-widest font-semibold block">
                ANOMALY SCORE PSI
              </span>
              <div className="mt-1 flex items-baseline space-x-2">
                <span className="text-xl font-bold text-charcoal-900">
                  {report.score_psi.toFixed(3)}
                </span>
                <span className="text-xs text-charcoal-400">
                  (KS p={report.score_p_val < 0.001 ? '<0.001' : report.score_p_val.toFixed(3)})
                </span>
              </div>
              <span className="text-[11px] text-charcoal-500 mt-1 block font-sans">
                &lt; 0.10 Stable | &ge; 0.25 Significant Shift
              </span>
            </div>

            <div className="luxury-card p-5">
              <span className="text-[10px] text-charcoal-400 uppercase tracking-widest font-semibold block">
                FLAGGED VOLUME DELTA
              </span>
              <div className="mt-1 flex items-baseline space-x-2">
                <span className="text-xl font-bold text-charcoal-900">
                  {report.flagged_rate_diff}%
                </span>
                <span className="text-xs text-charcoal-400">
                  ({report.reference_flagged_rate}% &rarr; {report.monitoring_flagged_rate}%)
                </span>
              </div>
              <span className="text-[11px] text-charcoal-500 mt-1 block font-sans">
                Rate of transactions flagged by engine
              </span>
            </div>

            <div className="luxury-card p-5">
              <span className="text-[10px] text-charcoal-400 uppercase tracking-widest font-semibold block">
                SHIFTED FEATURES COUNT
              </span>
              <div className="mt-1 flex items-baseline space-x-2">
                <span className="text-xl font-bold text-charcoal-900">
                  {report.high_drift_features.length + report.warning_features.length}
                </span>
                <span className="text-xs text-charcoal-400">
                  ({report.high_drift_features.length} critical, {report.warning_features.length} warning)
                </span>
              </div>
              <span className="text-[11px] text-charcoal-500 mt-1 block font-sans truncate">
                {report.high_drift_features.join(', ') || 'No critical feature shift'}
              </span>
            </div>
          </div>

          {/* Chart & Recommendations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* PSI Horizontal Chart */}
            <div className="lg:col-span-7 luxury-card p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-charcoal-900 flex items-center">
                  <Activity className="w-4 h-4 text-rosegold-600 mr-1.5" />
                  Feature Population Stability Index (PSI)
                </h3>
                <span className="text-[10px] font-mono text-charcoal-400">PSI SPECTRUM</span>
              </div>
              <p className="text-xs text-charcoal-500 mb-4">
                0.10 warning threshold (amber) | 0.25 significant drift threshold (rose)
              </p>
              <DriftDistributionChart metrics={report.feature_metrics} />
            </div>

            {/* Targeted Recommendations & Data Drift vs Concept Drift */}
            <div className="lg:col-span-5 luxury-card p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-charcoal-900 mb-3 flex items-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mr-1.5" />
                  Targeted System Guidance
                </h3>
                <div className="space-y-2.5 mb-5">
                  {report.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-blush-50/60 border border-blush-200 text-xs text-charcoal-800 flex items-start space-x-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rosegold-500 mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Drift vs Concept Drift Box */}
              <div className="p-4 bg-white border border-[#F0E4E6] rounded-xl text-xs text-charcoal-700 shadow-soft">
                <span className="font-bold text-[11px] font-mono uppercase block mb-1 text-rosegold-700">
                  Data Drift vs. Concept Drift
                </span>
                <p className="text-charcoal-500 leading-relaxed text-[11px] font-sans">
                  {report.drift_explanation}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
