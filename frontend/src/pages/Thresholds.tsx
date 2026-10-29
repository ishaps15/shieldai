import React, { useState, useEffect } from 'react';
import { Sliders, CheckCircle, AlertCircle, Play, BarChart2, ShieldCheck, Target, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { ThresholdConfig, ThresholdPreviewResult, ThresholdStrategy } from '../types';

export const Thresholds: React.FC = () => {
  const [config, setConfig] = useState<ThresholdConfig | null>(null);
  const [strategy, setStrategy] = useState<ThresholdStrategy>('fixed');

  // Sliders state
  const [critT, setCritT] = useState(0.85);
  const [highT, setHighT] = useState(0.70);
  const [medT, setMedT] = useState(0.55);
  const [lowT, setLowT] = useState(0.30);
  const [targetVolume, setTargetVolume] = useState(50);
  const [amountRule, setAmountRule] = useState(5000);
  const [rapidVelocity, setRapidVelocity] = useState(60);

  // Simulation preview
  const [preview, setPreview] = useState<ThresholdPreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadActiveConfig();
  }, []);

  const loadActiveConfig = async () => {
    try {
      const cfg = await api.getCurrentThresholds();
      setConfig(cfg);
      setStrategy(cfg.strategy);
      setCritT(cfg.critical_threshold);
      setHighT(cfg.high_threshold);
      setMedT(cfg.medium_threshold);
      setLowT(cfg.low_threshold);
      setTargetVolume(cfg.max_alerts_per_day);
      setAmountRule(cfg.amount_rule_threshold);
      setRapidVelocity(cfg.rapid_tx_velocity_seconds);
    } catch (err) {
      console.error(err);
    }
  };

  const runPreview = async () => {
    try {
      setPreviewing(true);
      setMessage(null);
      const res = await api.previewThresholds({
        strategy,
        critical_threshold: critT,
        high_threshold: highT,
        medium_threshold: medT,
        low_threshold: lowT,
        target_volume_per_day: targetVolume,
      });
      setPreview(res);
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to simulate thresholds on ledger.', type: 'error' });
    } finally {
      setPreviewing(false);
    }
  };

  const handleApply = async () => {
    try {
      setApplying(true);
      setMessage(null);
      const res = await api.applyThresholds({
        strategy,
        critical_threshold: critT,
        high_threshold: highT,
        medium_threshold: medT,
        low_threshold: lowT,
        max_alerts_per_day: targetVolume,
        amount_rule_threshold: amountRule,
        rapid_tx_velocity_seconds: rapidVelocity,
        customer_deviation_sigma: 3.0,
        is_active: true,
      });
      setConfig(res.config);
      setMessage({
        text: `Threshold rules updated successfully under strategy: ${res.config.strategy.toUpperCase()}`,
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to apply threshold rules.', type: 'error' });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Strategy Header */}
      <div className="luxury-card p-6">
        <h2 className="font-serif font-bold text-xl text-charcoal-900 mb-1">
          Alerting Threshold Calibration Engine
        </h2>
        <p className="text-xs text-charcoal-500 mb-5">
          Govern how continuous anomaly scores are partitioned into actionable risk tiers:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => setStrategy('fixed')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              strategy === 'fixed'
                ? 'bg-blush-100/70 border-rosegold-400 shadow-sm text-charcoal-900'
                : 'bg-white border-[#EADBDE] text-charcoal-600 hover:bg-blush-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-xs font-mono text-charcoal-900">1. FIXED NUMERICAL</span>
              <span className={`w-2.5 h-2.5 rounded-full ${strategy === 'fixed' ? 'bg-rosegold-500' : 'bg-charcoal-300'}`} />
            </div>
            <p className="text-[11px] text-charcoal-500 leading-relaxed">
              Explicit manual cutoffs calibrated by risk engineers (e.g. 0.55 medium, 0.70 high, 0.85 critical).
            </p>
          </div>

          <div
            onClick={() => setStrategy('quantile')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              strategy === 'quantile'
                ? 'bg-blush-100/70 border-rosegold-400 shadow-sm text-charcoal-900'
                : 'bg-white border-[#EADBDE] text-charcoal-600 hover:bg-blush-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-xs font-mono text-charcoal-900">2. QUANTILE-DERIVED</span>
              <span className={`w-2.5 h-2.5 rounded-full ${strategy === 'quantile' ? 'bg-rosegold-500' : 'bg-charcoal-300'}`} />
            </div>
            <p className="text-[11px] text-charcoal-500 leading-relaxed">
              Empirically derived from score distribution (top 1% critical, top 5% high, top 15% medium).
            </p>
          </div>

          <div
            onClick={() => setStrategy('target_volume')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              strategy === 'target_volume'
                ? 'bg-blush-100/70 border-rosegold-400 shadow-sm text-charcoal-900'
                : 'bg-white border-[#EADBDE] text-charcoal-600 hover:bg-blush-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-xs font-mono text-charcoal-900">3. TARGET ALERT BUDGET</span>
              <span className={`w-2.5 h-2.5 rounded-full ${strategy === 'target_volume' ? 'bg-rosegold-500' : 'bg-charcoal-300'}`} />
            </div>
            <p className="text-[11px] text-charcoal-500 leading-relaxed">
              Dynamically computes the threshold cutoff needed to cap alerts to daily analyst review capacity.
            </p>
          </div>
        </div>
      </div>

      {/* Threshold Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls Card */}
        <div className="luxury-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-charcoal-900 flex items-center">
              <Sliders className="w-4 h-4 text-rosegold-600 mr-1.5" />
              Risk Tier Threshold Cutoffs
            </h3>
            <span className="text-[10px] font-mono text-charcoal-400">RANGE: [0.00, 1.00]</span>
          </div>

          {strategy === 'target_volume' && (
            <div className="p-3.5 bg-blush-50/50 rounded-xl border border-blush-200">
              <label className="text-xs text-charcoal-700 font-semibold block mb-1">
                Target Daily Alert Volume Budget
              </label>
              <input
                type="number"
                value={targetVolume}
                onChange={(e) => setTargetVolume(parseInt(e.target.value) || 10)}
                className="w-full bg-white border border-[#EADBDE] rounded-lg p-2 text-xs text-charcoal-800 font-mono focus:outline-none focus:border-rosegold-500"
              />
            </div>
          )}

          <div className="space-y-4 pt-1">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-rose-600 font-bold font-mono">CRITICAL RISK (&ge;)</span>
                <span className="font-mono text-charcoal-900 font-bold">{critT.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.99"
                step="0.01"
                value={critT}
                onChange={(e) => setCritT(parseFloat(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-orange-600 font-bold font-mono">HIGH RISK (&ge;)</span>
                <span className="font-mono text-charcoal-900 font-bold">{highT.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="0.95"
                step="0.01"
                value={highT}
                onChange={(e) => setHighT(parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-amber-600 font-bold font-mono">MEDIUM RISK / ALERT CUTOFF (&ge;)</span>
                <span className="font-mono text-charcoal-900 font-bold">{medT.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.85"
                step="0.01"
                value={medT}
                onChange={(e) => setMedT(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-emerald-600 font-bold font-mono">LOW RISK BASELINE (&ge;)</span>
                <span className="font-mono text-charcoal-900 font-bold">{lowT.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.6"
                step="0.01"
                value={lowT}
                onChange={(e) => setLowT(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Additional Hard Rules */}
          <div className="pt-4 border-t border-[#F5EAEA] grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-charcoal-500 font-mono text-[10px] block mb-1">LARGE AMOUNT RULE ($)</label>
              <input
                type="number"
                value={amountRule}
                onChange={(e) => setAmountRule(parseFloat(e.target.value) || 1000)}
                className="w-full bg-white border border-[#EADBDE] rounded-xl p-2.5 text-charcoal-800 font-mono text-xs focus:outline-none focus:border-rosegold-500"
              />
            </div>
            <div>
              <label className="text-charcoal-500 font-mono text-[10px] block mb-1">VELOCITY WINDOW (SEC)</label>
              <input
                type="number"
                value={rapidVelocity}
                onChange={(e) => setRapidVelocity(parseInt(e.target.value) || 60)}
                className="w-full bg-white border border-[#EADBDE] rounded-xl p-2.5 text-charcoal-800 font-mono text-xs focus:outline-none focus:border-rosegold-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex space-x-3">
            <button
              onClick={runPreview}
              disabled={previewing}
              className="rosegold-outline-btn flex-1 py-2.5 text-xs font-semibold flex items-center justify-center disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              {previewing ? 'Simulating Impact...' : 'Preview Simulation'}
            </button>
            <button
              onClick={handleApply}
              disabled={applying}
              className="rosegold-btn flex-1 py-2.5 text-xs font-semibold flex items-center justify-center disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              {applying ? 'Applying...' : 'Apply Thresholds'}
            </button>
          </div>
        </div>

        {/* Impact Simulator Output */}
        <div className="luxury-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-charcoal-900 flex items-center">
              <Target className="w-4 h-4 text-rosegold-600 mr-1.5" />
              Simulated Threshold Impact
            </h3>
            <span className="text-[10px] font-mono text-charcoal-400">REALTIME EVALUATION</span>
          </div>

          {message && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium ${
                message.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {!preview ? (
            <div className="p-12 text-center text-charcoal-400 text-xs font-mono">
              Click &quot;Preview Simulation&quot; to test how proposed cutoffs affect alert volume before committing.
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3 font-mono">
                <div className="p-3 bg-blush-50/50 rounded-xl border border-blush-200">
                  <span className="text-charcoal-400 text-[10px] block">FLAGGED TRANSACTIONS</span>
                  <span className="text-base font-bold text-rose-600">
                    {preview.flagged_count} ({preview.flagged_percent}%)
                  </span>
                </div>
                <div className="p-3 bg-blush-50/50 rounded-xl border border-blush-200">
                  <span className="text-charcoal-400 text-[10px] block">EST. DAILY LOAD</span>
                  <span className="text-base font-bold text-charcoal-900">
                    ~{preview.estimated_alerts_per_day} alerts/day
                  </span>
                </div>
                <div className="p-3 bg-blush-50/50 rounded-xl border border-blush-200">
                  <span className="text-charcoal-400 text-[10px] block">BUDGET EXCEEDED?</span>
                  <span
                    className={`text-xs font-bold ${
                      preview.exceeds_max_daily_budget ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {preview.exceeds_max_daily_budget ? 'YES (OVERLOAD)' : 'NO (SAFE)'}
                  </span>
                </div>
              </div>

              {/* Tier breakdown */}
              <div className="p-4 bg-white rounded-xl border border-[#F0E4E6] space-y-2.5 font-mono text-xs shadow-soft">
                <span className="text-charcoal-400 font-bold block text-[10px] uppercase">
                  Projected Incident Tier Counts
                </span>
                <div className="flex justify-between items-center text-rose-700">
                  <span>Critical (score &ge; {preview.effective_thresholds.critical.toFixed(2)})</span>
                  <span className="font-bold">{preview.critical_count}</span>
                </div>
                <div className="flex justify-between items-center text-orange-700">
                  <span>High (score &ge; {preview.effective_thresholds.high.toFixed(2)})</span>
                  <span className="font-bold">{preview.high_count}</span>
                </div>
                <div className="flex justify-between items-center text-amber-700">
                  <span>Medium (score &ge; {preview.effective_thresholds.medium.toFixed(2)})</span>
                  <span className="font-bold">{preview.medium_count}</span>
                </div>
              </div>

              {/* Confusion metrics if ground truth present */}
              {preview.confusion_matrix && (
                <div className="p-4 bg-white rounded-xl border border-[#F0E4E6] space-y-2 font-mono shadow-soft">
                  <span className="text-charcoal-600 font-bold block text-[10px] uppercase">
                    Validation Set Trade-off Matrix
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-blush-50 rounded-lg border border-blush-100">
                      <span className="text-charcoal-400 block text-[9px]">PRECISION</span>
                      <span className="font-bold text-charcoal-900">
                        {(preview.confusion_matrix.precision * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-2.5 bg-blush-50 rounded-lg border border-blush-100">
                      <span className="text-charcoal-400 block text-[9px]">RECALL</span>
                      <span className="font-bold text-charcoal-900">
                        {(preview.confusion_matrix.recall * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-2.5 bg-blush-50 rounded-lg border border-blush-100">
                      <span className="text-charcoal-400 block text-[9px]">F1 SCORE</span>
                      <span className="font-bold text-rosegold-700">
                        {preview.confusion_matrix.f1_score.toFixed(3)}
                      </span>
                    </div>
                    <div className="p-2.5 bg-blush-50 rounded-lg border border-blush-100">
                      <span className="text-charcoal-400 block text-[9px]">FALSE POS. RATE</span>
                      <span className="font-bold text-amber-700">
                        {(preview.confusion_matrix.fpr * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
