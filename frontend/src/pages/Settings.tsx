import React from 'react';
import {
  Settings as SettingsIcon,
  BookOpen,
  Shield,
  Database,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Terminal,
  Activity
} from 'lucide-react';

export const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="luxury-card p-6">
        <h2 className="font-serif font-bold text-xl text-charcoal-900 mb-1">
          System Architecture, Mathematical Formulations & Configuration
        </h2>
        <p className="text-xs text-charcoal-500">
          ShieldAI technical specifications, feature dictionary, anomaly scoring algorithms, and statistical drift methodologies.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detection Methodology */}
        <div className="luxury-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-charcoal-900 flex items-center">
            <Cpu className="w-4 h-4 text-rosegold-600 mr-2" />
            Detection Algorithms & Score Interpretation
          </h3>

          <div className="space-y-3.5 text-xs text-charcoal-700 leading-relaxed">
            <div className="p-4 bg-blush-50/50 rounded-xl border border-blush-200">
              <span className="font-bold text-rosegold-700 font-mono block mb-1">
                PRIMARY MODEL: ISOLATION FOREST
              </span>
              <p className="text-charcoal-600 text-xs">
                Isolation Forest recursively partitions feature space using random orthogonal hyperplanes. Anomalous instances are isolated closer to the root of trees. The average path length across ensemble trees defines the anomaly score:
              </p>
              <div className="my-2.5 p-2.5 rounded-lg bg-white border border-[#EADBDE] text-[11px] font-mono text-charcoal-900 text-center shadow-xs">
                Score(x) = (s_max - decision_function(x)) / (s_max - s_min) ∈ [0.0, 1.0]
              </div>
              <p className="text-charcoal-500 text-[11px]">
                Normalized so that 1.0 represents maximal anomaly distance and 0.0 represents nominal inlier behavior.
              </p>
            </div>

            <div className="p-4 bg-blush-50/50 rounded-xl border border-blush-200">
              <span className="font-bold text-amber-700 font-mono block mb-1">
                BASELINE BENCHMARK: MEDIAN ABSOLUTE DEVIATION (MAD)
              </span>
              <p className="text-charcoal-600 text-xs">
                To benchmark machine learning trees against traditional rule-based statistical controls, ShieldAI computes modified Z-scores:
              </p>
              <div className="my-2.5 p-2.5 rounded-lg bg-white border border-[#EADBDE] text-[11px] font-mono text-charcoal-900 text-center shadow-xs">
                Modified Z = 0.6745 × |X - median(X)| / MAD(X)
              </div>
              <p className="text-charcoal-500 text-[11px]">
                Provides a transparent, non-parametric comparison that is resilient against extreme distribution skew.
              </p>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <span className="font-bold text-emerald-800 font-mono block mb-1">
                SCORE INTERPRETATION VS. FRAUD PROBABILITY
              </span>
              <p className="text-emerald-950 text-xs">
                An anomaly score is a metric of feature rarity and behavioral distance; it is <strong>never</strong> treated as a calibrated probability of fraud. The system surfaces unusual transactions for human investigator triage rather than automatically presuming guilt.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Engineering Dictionary */}
        <div className="luxury-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-charcoal-900 flex items-center">
            <Layers className="w-4 h-4 text-rosegold-600 mr-2" />
            Leak-Free Behavioral Feature Pipeline
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-white rounded-xl border border-[#F0E4E6] shadow-soft">
              <span className="font-bold text-charcoal-900 font-mono text-xs">1. Historical Amount Deviation (Z-score & Ratio)</span>
              <p className="text-[11px] text-charcoal-500 mt-1 leading-relaxed">
                Evaluates transaction amount relative to the sender&apos;s cumulative historical average and standard deviation computed strictly from events at timestamp prior to current event (t &lt; t_i). Strictly prevents future-data leakage.
              </p>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-[#F0E4E6] shadow-soft">
              <span className="font-bold text-charcoal-900 font-mono text-xs">2. Velocity & Rapid Repeated Bursts</span>
              <p className="text-[11px] text-charcoal-500 mt-1 leading-relaxed">
                Calculates time elapsed in seconds since the sender&apos;s previous transaction ($\Delta t$) and backwards-scanned rolling 1-hour and 24-hour transaction frequency counts.
              </p>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-[#F0E4E6] shadow-soft">
              <span className="font-bold text-charcoal-900 font-mono text-xs">3. Cyclical Temporal & Nocturnal Transforms</span>
              <p className="text-[11px] text-charcoal-500 mt-1 leading-relaxed">
                Continuous harmonic trigonometric encoding ($\sin(2\pi h/24)$ and $\cos(2\pi h/24)$), plus an off-hours nocturnal activity flag (00:00 - 05:00) and weekend flags.
              </p>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-[#F0E4E6] shadow-soft">
              <span className="font-bold text-charcoal-900 font-mono text-xs">4. Geographical & Channel Novelty Detection</span>
              <p className="text-[11px] text-charcoal-500 mt-1 leading-relaxed">
                Flags first-time geographic locations or new access device channels relative to the sender&apos;s historical transaction profile.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Drift Monitoring Methodology */}
      <div className="luxury-card p-6 space-y-4 text-xs">
        <h3 className="text-sm font-bold text-charcoal-900 flex items-center">
          <Activity className="w-4 h-4 text-rosegold-600 mr-2" />
          Population Stability Index (PSI) & Kolmogorov-Smirnov (KS) Monitoring
        </h3>
        <p className="text-charcoal-600 leading-relaxed">
          ShieldAI uses the Population Stability Index (PSI) to detect shifts between reference baseline datasets and active monitoring transaction windows:
        </p>
        <div className="p-3 rounded-xl bg-blush-50/60 border border-blush-200 text-[11px] font-mono text-charcoal-900 text-center max-w-xl mx-auto shadow-xs">
          PSI = ∑ (Actual%_b - Expected%_b) × ln(Actual%_b / Expected%_b)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 font-mono">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <span className="font-bold text-emerald-800 block mb-1">PSI &lt; 0.10: STABLE</span>
            <span className="text-charcoal-600 text-[11px] font-sans">No significant distribution shift. Production models and alerting cutoffs remain calibrated.</span>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="font-bold text-amber-800 block mb-1">0.10 &le; PSI &lt; 0.25: WARNING</span>
            <span className="text-charcoal-600 text-[11px] font-sans">Moderate distribution shift. Monitor investigation queues and inspect specific drifting feature categories.</span>
          </div>
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
            <span className="font-bold text-rose-800 block mb-1">PSI &ge; 0.25: SIGNIFICANT DRIFT</span>
            <span className="text-charcoal-600 text-[11px] font-sans">Substantial shift in feature density. Recalibrate thresholds or retrain with approved labels.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
