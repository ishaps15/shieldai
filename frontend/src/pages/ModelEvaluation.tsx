import React, { useEffect, useState } from 'react';
import {
  Award,
  BarChart2,
  Cpu,
  Target,
  Sliders,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Zap,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { ModelEvaluationData, ModelMetadata } from '../types';
import { PRCurveChart } from '../components/charts/PRCurveChart';

export const ModelEvaluation: React.FC = () => {
  const [evalData, setEvalData] = useState<ModelEvaluationData | null>(null);
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [modelType, setModelType] = useState<string>('random_forest');
  const [threshold, setThreshold] = useState<number>(0.5);

  // Retraining state
  const [trainType, setTrainType] = useState<string>('isolation_forest');
  const [contamination, setContamination] = useState<number>(0.05);
  const [nEstimators, setNEstimators] = useState<number>(100);
  const [training, setTraining] = useState<boolean>(false);
  const [trainMsg, setTrainMsg] = useState<string | null>(null);

  const fetchEvaluation = async () => {
    try {
      setLoading(true);
      const res = await api.getModelEvaluation(modelType, threshold);
      setEvalData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async () => {
    try {
      const res = await api.getModels();
      setModels(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvaluation();
    fetchModels();
  }, [modelType, threshold]);

  const handleTrain = async () => {
    try {
      setTraining(true);
      setTrainMsg(null);
      const res = await api.trainModel({
        model_type: trainType,
        contamination: contamination,
        n_estimators: nEstimators,
        random_seed: 42,
      });
      setTrainMsg(`Successfully trained and activated model version ${res.model?.version || 'new'}`);
      fetchModels();
      fetchEvaluation();
    } catch (err: any) {
      console.error(err);
      setTrainMsg(`Retraining failed: ${err.message || 'Check logs'}`);
    } finally {
      setTraining(false);
    }
  };

  const handleActivate = async (modelId: string) => {
    try {
      await api.activateModel(modelId);
      fetchModels();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="luxury-card p-6">
        <h2 className="font-serif font-bold text-xl text-charcoal-900 mb-1">
          Supervised Model Evaluation & False Positive Analysis
        </h2>
        <p className="text-xs text-charcoal-500">
          Analyze trade-offs between detection recall (fraud caught) and false-positive alert volume using verified ground truth labels.
        </p>
      </div>

      {evalData && !evalData.has_ground_truth ? (
        <div className="luxury-card p-10 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-blush-100 flex items-center justify-center mx-auto text-rosegold-600">
            <Info className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-base text-charcoal-900">No Ground Truth Labels in Current Stream</h3>
          <p className="text-xs text-charcoal-500 leading-relaxed">
            {evalData.message}
          </p>
          <div className="pt-2">
            <span className="text-xs text-rosegold-700 bg-blush-50 px-3 py-1.5 rounded-xl border border-blush-200 font-mono inline-block">
              PRO TIP: Navigate to &quot;Data Ingestion&quot; and click &quot;Load Labelled Stream&quot; to test PR-curves and confusion matrices.
            </span>
          </div>
        </div>
      ) : evalData && evalData.evaluation_metrics ? (
        <div className="space-y-6">
          {/* Key Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
            <div className="luxury-card p-4">
              <span className="text-[10px] text-charcoal-400 block uppercase font-semibold">PRECISION</span>
              <span className="text-xl font-bold text-charcoal-900">
                {(evalData.evaluation_metrics.precision * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] text-charcoal-400 block mt-0.5 font-sans">True Positive Rate</span>
            </div>
            <div className="luxury-card p-4">
              <span className="text-[10px] text-charcoal-400 block uppercase font-semibold">RECALL</span>
              <span className="text-xl font-bold text-charcoal-900">
                {(evalData.evaluation_metrics.recall * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] text-charcoal-400 block mt-0.5 font-sans">Catch Rate</span>
            </div>
            <div className="luxury-card p-4">
              <span className="text-[10px] text-charcoal-400 block uppercase font-semibold">F1-SCORE</span>
              <span className="text-xl font-bold text-rosegold-600">
                {evalData.evaluation_metrics.f1_score.toFixed(3)}
              </span>
              <span className="text-[10px] text-charcoal-400 block mt-0.5 font-sans">Harmonic Mean</span>
            </div>
            <div className="luxury-card p-4">
              <span className="text-[10px] text-charcoal-400 block uppercase font-semibold">PR-AUC</span>
              <span className="text-xl font-bold text-emerald-600">
                {evalData.evaluation_metrics.pr_auc.toFixed(3)}
              </span>
              <span className="text-[10px] text-charcoal-400 block mt-0.5 font-sans">Precision-Recall Area</span>
            </div>
            <div className="luxury-card p-4">
              <span className="text-[10px] text-charcoal-400 block uppercase font-semibold">FALSE POSITIVES</span>
              <span className="text-xl font-bold text-amber-600">
                {evalData.evaluation_metrics.false_positives}
              </span>
              <span className="text-[10px] text-charcoal-400 block mt-0.5 font-sans">Benign Flagged</span>
            </div>
            <div className="luxury-card p-4">
              <span className="text-[10px] text-charcoal-400 block uppercase font-semibold">MISSED FRAUD</span>
              <span className="text-xl font-bold text-rose-600">
                {evalData.evaluation_metrics.false_negatives}
              </span>
              <span className="text-[10px] text-charcoal-400 block mt-0.5 font-sans">False Negatives</span>
            </div>
          </div>

          {/* PR Curve Chart & Threshold Trade-off Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 luxury-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-charcoal-900 flex items-center">
                  <BarChart2 className="w-4 h-4 text-rosegold-600 mr-1.5" />
                  Precision-Recall (PR) Curve
                </h3>
                <div className="flex space-x-1.5 bg-blush-50 p-1 rounded-xl border border-blush-200">
                  <button
                    onClick={() => setModelType('random_forest')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                      modelType === 'random_forest'
                        ? 'rosegold-btn text-white shadow-xs'
                        : 'text-charcoal-600 hover:text-rosegold-700'
                    }`}
                  >
                    Random Forest
                  </button>
                  <button
                    onClick={() => setModelType('logistic_regression')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                      modelType === 'logistic_regression'
                        ? 'rosegold-btn text-white shadow-xs'
                        : 'text-charcoal-600 hover:text-rosegold-700'
                    }`}
                  >
                    Logistic Reg
                  </button>
                </div>
              </div>
              <PRCurveChart
                data={evalData.evaluation_metrics.pr_curve}
                aucScore={evalData.evaluation_metrics.pr_auc}
              />
            </div>

            {/* Threshold Slider & Interactive Trade-off */}
            <div className="lg:col-span-5 luxury-card p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-charcoal-900 mb-1 flex items-center">
                  <Target className="w-4 h-4 text-amber-600 mr-1.5" />
                  Threshold Trade-off Sandbox
                </h3>
                <p className="text-xs text-charcoal-500 mb-4">
                  Slide decision cutoff to see real-time impact on noise vs caught fraud:
                </p>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-charcoal-600 font-bold">OPERATING CUTOFF</span>
                      <span className="text-rosegold-600 font-bold">{threshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.05"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value))}
                      className="w-full accent-rosegold-500 cursor-pointer"
                    />
                  </div>

                  {/* 2x2 Confusion Matrix Heatmap */}
                  <div className="p-4 bg-blush-50/50 rounded-xl border border-blush-200">
                    <span className="text-[10px] font-mono text-charcoal-500 uppercase tracking-widest block mb-2 font-bold">
                      2x2 Confusion Matrix Heatmap
                    </span>
                    <div className="grid grid-cols-2 gap-2.5 text-center text-xs font-mono">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <span className="text-[9px] text-emerald-800 block font-sans font-semibold">TRUE POSITIVES (Caught)</span>
                        <span className="text-lg font-bold text-emerald-900">
                          {evalData.evaluation_metrics.true_positives}
                        </span>
                      </div>
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <span className="text-[9px] text-amber-800 block font-sans font-semibold">FALSE POSITIVES (Noise)</span>
                        <span className="text-lg font-bold text-amber-900">
                          {evalData.evaluation_metrics.false_positives}
                        </span>
                      </div>
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                        <span className="text-[9px] text-rose-800 block font-sans font-semibold">FALSE NEGATIVES (Missed)</span>
                        <span className="text-lg font-bold text-rose-900">
                          {evalData.evaluation_metrics.false_negatives}
                        </span>
                      </div>
                      <div className="p-3 bg-white border border-[#EADBDE] rounded-xl shadow-xs">
                        <span className="text-[9px] text-charcoal-500 block font-sans font-semibold">TRUE NEGATIVES (Clean)</span>
                        <span className="text-lg font-bold text-charcoal-900">
                          {evalData.evaluation_metrics.true_negatives}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-blush-50/60 rounded-xl border border-blush-200 text-[11px] text-charcoal-600 mt-4 leading-relaxed font-sans">
                <strong className="text-charcoal-900">Operational Guidance:</strong> Increasing threshold lowers analyst workload (fewer false positives) at the expense of lower recall (more missed fraud).
              </div>
            </div>
          </div>

          {/* Trade-off Matrix Table */}
          {evalData.threshold_tradeoffs && (
            <div className="luxury-card p-6">
              <h3 className="text-sm font-bold text-charcoal-900 mb-3 flex items-center">
                <Sliders className="w-4 h-4 text-rosegold-600 mr-1.5" />
                Cutoff Sweep Trade-off Matrix
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-blush-50/70 text-charcoal-500 border-b border-[#F0E4E6] text-[10px] uppercase">
                    <tr>
                      <th className="px-3.5 py-2.5">Threshold</th>
                      <th className="px-3.5 py-2.5">Flagged Count</th>
                      <th className="px-3.5 py-2.5">Caught (TP)</th>
                      <th className="px-3.5 py-2.5">False Pos. (FP)</th>
                      <th className="px-3.5 py-2.5">Missed (FN)</th>
                      <th className="px-3.5 py-2.5">Precision</th>
                      <th className="px-3.5 py-2.5">Recall</th>
                      <th className="px-3.5 py-2.5">F1 Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5EAEA]">
                    {evalData.threshold_tradeoffs.map((row: any, idx: number) => (
                      <tr
                        key={idx}
                        className={row.threshold === threshold ? 'bg-blush-100/60 font-semibold' : 'hover:bg-blush-50/50'}
                      >
                        <td className="px-3.5 py-2.5 font-bold text-rosegold-700">
                          {row.threshold.toFixed(2)}
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-charcoal-900">{row.flagged}</td>
                        <td className="px-3.5 py-2.5 font-bold text-emerald-700">{row.true_positives}</td>
                        <td className="px-3.5 py-2.5 text-amber-700">{row.false_positives}</td>
                        <td className="px-3.5 py-2.5 text-rose-700">{row.false_negatives}</td>
                        <td className="px-3.5 py-2.5">{(row.precision * 100).toFixed(1)}%</td>
                        <td className="px-3.5 py-2.5">{(row.recall * 100).toFixed(1)}%</td>
                        <td className="px-3.5 py-2.5 font-bold">{row.f1_score.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Registry & Retraining Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Model Registry */}
        <div className="lg:col-span-7 luxury-card p-6">
          <h3 className="text-sm font-bold text-charcoal-900 mb-2 flex items-center">
            <Cpu className="w-4 h-4 text-rosegold-600 mr-1.5" />
            Model Version Registry
          </h3>
          <p className="text-xs text-charcoal-500 mb-4">
            Tracked model artifacts, training timestamps, and production state:
          </p>
          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {models.map((m) => (
              <div
                key={m.model_id}
                className="p-3.5 rounded-xl bg-white border border-[#F0E4E6] flex items-center justify-between text-xs shadow-soft"
              >
                <div>
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="font-bold text-charcoal-900">{m.version}</span>
                    <span className="capitalize px-2 py-0.5 rounded-md bg-blush-50 text-[10px] text-rosegold-700 border border-blush-200">
                      {m.model_type.replace('_', ' ')}
                    </span>
                    {m.is_active && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        ACTIVE IN SURVEILLANCE
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-charcoal-400 mt-1 block font-mono">
                    Trained: {m.trained_at.replace('T', ' ').slice(0, 19)} | Estimators: {m.n_estimators}
                  </span>
                </div>
                {!m.is_active && (
                  <button
                    onClick={() => handleActivate(m.model_id)}
                    className="rosegold-outline-btn px-3 py-1 text-xs font-mono"
                  >
                    Activate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Retraining Controls */}
        <div className="lg:col-span-5 luxury-card p-6">
          <h3 className="text-sm font-bold text-charcoal-900 mb-1 flex items-center">
            <Zap className="w-4 h-4 text-rosegold-600 mr-1.5" />
            Controlled Model Retraining
          </h3>
          <p className="text-xs text-charcoal-500 mb-4">
            Fit a new model version on stored transactions:
          </p>

          {trainMsg && (
            <div className="p-3 bg-blush-50 border border-blush-200 text-rosegold-800 rounded-xl text-xs mb-3 font-mono">
              {trainMsg}
            </div>
          )}

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="text-charcoal-500 block mb-1 font-mono text-[10px]">ALGORITHM TYPE</label>
              <select
                value={trainType}
                onChange={(e) => setTrainType(e.target.value)}
                className="w-full bg-white border border-[#EADBDE] rounded-xl p-2.5 text-charcoal-800 text-xs focus:outline-none focus:border-rosegold-500"
              >
                <option value="isolation_forest">Isolation Forest (Unsupervised)</option>
                <option value="random_forest">Random Forest (Supervised)</option>
                <option value="logistic_regression">Logistic Regression (Supervised)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-charcoal-500 block mb-1 font-mono text-[10px]">CONTAMINATION</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="0.25"
                  value={contamination}
                  onChange={(e) => setContamination(parseFloat(e.target.value) || 0.05)}
                  className="w-full bg-white border border-[#EADBDE] rounded-xl p-2.5 text-charcoal-800 font-mono text-xs focus:outline-none focus:border-rosegold-500"
                />
              </div>
              <div>
                <label className="text-charcoal-500 block mb-1 font-mono text-[10px]">ESTIMATORS</label>
                <input
                  type="number"
                  step="10"
                  min="50"
                  max="500"
                  value={nEstimators}
                  onChange={(e) => setNEstimators(parseInt(e.target.value) || 100)}
                  className="w-full bg-white border border-[#EADBDE] rounded-xl p-2.5 text-charcoal-800 font-mono text-xs focus:outline-none focus:border-rosegold-500"
                />
              </div>
            </div>

            <button
              onClick={handleTrain}
              disabled={training}
              className="rosegold-btn w-full mt-3 py-2.5 font-semibold transition-colors disabled:opacity-50 font-mono text-xs"
            >
              {training ? 'Training Model Artifact...' : 'TRAIN & REGISTER VERSION'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
