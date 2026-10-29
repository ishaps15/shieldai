import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertTriangle,
  Play,
  Database,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { CSVValidationResult } from '../types';

export const Ingestion: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<CSVValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Demo generation state
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setUploadSuccess(null);
      await validateCsvFile(file);
    }
  };

  const validateCsvFile = async (file: File) => {
    try {
      setValidating(true);
      const res = await api.validateCSV(file);
      setValidationResult(res);
    } catch (err: any) {
      console.error(err);
      setValidationResult({
        is_valid: false,
        total_rows: 0,
        duplicates_count: 0,
        missing_values: {},
        columns: [],
        missing_required: [],
        has_fraud_labels: false,
        preview_rows: [],
        error: err.message || 'File schema validation failed'
      });
    } finally {
      setValidating(false);
    }
  };

  const handleCommitUpload = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true);
      const res = await api.uploadCSV(selectedFile);
      setUploadSuccess(`Ingested ${res.ingested_count} transactions. Flagged ${res.anomalies_flagged} anomalies. Active model evaluated!`);
      setSelectedFile(null);
      setValidationResult(null);
    } catch (err: any) {
      console.error(err);
      alert(`Ingestion failed: ${err.message || 'Check server logs'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleLoadDemo = async (type: 'labelled' | 'unlabelled' | 'drifted') => {
    try {
      setDemoLoading(type);
      setUploadSuccess(null);
      const res = await api.loadDemoData(type, 1500);
      setUploadSuccess(`Populated ${res.ingested_count} transactions under profile "${type.toUpperCase()}". Pipeline refreshed!`);
    } catch (err: any) {
      console.error(err);
      alert(`Demo generation failed: ${err.message}`);
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="luxury-card p-6">
        <h2 className="font-serif font-bold text-xl text-charcoal-900 mb-1">
          Transaction Data Ingestion & Quality Validation
        </h2>
        <p className="text-xs text-charcoal-500">
          Upload custom financial CSV transactions, validate schema compliance, profile missing values, or populate synthetic benchmark streams.
        </p>
      </div>

      {uploadSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 shadow-soft font-mono">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CSV Upload Zone */}
        <div className="lg:col-span-7 luxury-card p-6 space-y-5">
          <h3 className="text-sm font-bold text-charcoal-900 flex items-center">
            <UploadCloud className="w-4 h-4 text-rosegold-600 mr-1.5" />
            Upload Transaction File (.CSV)
          </h3>

          <label className="border-2 border-dashed border-[#EADBDE] hover:border-rosegold-400 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-blush-50/40 hover:bg-blush-50/70 group">
            <UploadCloud className="w-10 h-10 text-rosegold-500 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-charcoal-900">
              Drag and drop CSV transaction file here or click to browse
            </span>
            <span className="text-[11px] text-charcoal-500 mt-1 font-mono">
              Supported fields: transaction_id, timestamp, amount, sender_id, receiver_id, location, etc.
            </span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {validating && (
            <div className="text-center py-4 text-xs font-mono text-charcoal-500 flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-rosegold-500 border-t-transparent rounded-full animate-spin" />
              <span>VALIDATING SCHEMA COMPLIANCE & PROFILING DUPLICATES...</span>
            </div>
          )}

          {/* Validation Diagnostics Panel */}
          {validationResult && (
            <div className="p-5 bg-white rounded-xl border border-[#F0E4E6] space-y-4 text-xs shadow-soft">
              <div className="flex items-center justify-between">
                <span className="font-bold text-charcoal-900 flex items-center font-mono">
                  <FileText className="w-4 h-4 text-rosegold-600 mr-1.5" />
                  {selectedFile?.name}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    validationResult.is_valid
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {validationResult.is_valid ? 'SCHEMA COMPLIANT' : 'SCHEMA ERRORS'}
                </span>
              </div>

              {validationResult.error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                  {validationResult.error}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-center text-xs font-mono">
                <div className="p-2.5 bg-blush-50 rounded-xl border border-blush-100">
                  <span className="text-charcoal-400 text-[9px] block">TOTAL ROWS</span>
                  <span className="font-bold text-charcoal-900">{validationResult.total_rows.toLocaleString()}</span>
                </div>
                <div className="p-2.5 bg-blush-50 rounded-xl border border-blush-100">
                  <span className="text-charcoal-400 text-[9px] block">DUPLICATES</span>
                  <span className="font-bold text-amber-700">{validationResult.duplicates_count}</span>
                </div>
                <div className="p-2.5 bg-blush-50 rounded-xl border border-blush-100">
                  <span className="text-charcoal-400 text-[9px] block">GROUND TRUTH</span>
                  <span className="font-bold text-rosegold-700">
                    {validationResult.has_fraud_labels ? 'PRESENT' : 'NONE'}
                  </span>
                </div>
              </div>

              {/* Data Preview Table */}
              {validationResult.preview_rows.length > 0 && (
                <div className="pt-2">
                  <span className="text-charcoal-500 block mb-1.5 font-mono text-[10px] font-bold uppercase">
                    Preview Sample (First 5 Rows)
                  </span>
                  <div className="overflow-x-auto border border-[#F0E4E6] rounded-xl bg-white shadow-soft">
                    <table className="w-full text-left text-[10px] font-mono">
                      <thead className="bg-blush-50/70 text-charcoal-600 border-b border-[#F0E4E6]">
                        <tr>
                          {validationResult.columns.slice(0, 5).map((col: string) => (
                            <th key={col} className="p-2">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F5EAEA]">
                        {validationResult.preview_rows.slice(0, 5).map((row: Record<string, any>, idx: number) => (
                          <tr key={idx} className="hover:bg-blush-50/50">
                            {validationResult.columns.slice(0, 5).map((col: string) => (
                              <td key={col} className="p-2 text-charcoal-700 truncate max-w-[120px]">
                                {String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {validationResult.is_valid && (
                <button
                  onClick={handleCommitUpload}
                  disabled={uploading}
                  className="rosegold-btn w-full py-2.5 font-bold font-mono text-xs disabled:opacity-50"
                >
                  {uploading ? 'INGESTING & SCORING TRANSACTIONS...' : 'COMMIT INGESTION & RUN ML PIPELINE'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Demo Benchmarks Section */}
        <div className="lg:col-span-5 luxury-card p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-charcoal-900 mb-1 flex items-center">
              <Database className="w-4 h-4 text-rosegold-600 mr-1.5" />
              Benchmark Synthetic Streams
            </h3>
            <p className="text-xs text-charcoal-500 mb-4">
              Instantly populate ShieldAI with high-fidelity financial transaction sequences:
            </p>

            <div className="space-y-3.5">
              {/* Option 1: Labelled */}
              <div className="p-4 bg-white rounded-xl border border-[#F0E4E6] hover:border-rosegold-300 transition-colors shadow-soft">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs text-charcoal-900 font-mono">
                    1. Labelled Synthetic Dataset
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold">
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-[11px] text-charcoal-500 mb-3 leading-relaxed">
                  1,500 transactions with verified fraud labels, rapid velocity micro-transactions, and high-value anomalies for PR-curve evaluation.
                </p>
                <button
                  onClick={() => handleLoadDemo('labelled')}
                  disabled={!!demoLoading}
                  className="rosegold-outline-btn w-full py-2 text-xs font-mono font-bold disabled:opacity-50"
                >
                  {demoLoading === 'labelled' ? 'Generating Stream...' : 'LOAD LABELLED STREAM (1,500 TX)'}
                </button>
              </div>

              {/* Option 2: Unlabelled */}
              <div className="p-4 bg-white rounded-xl border border-[#F0E4E6] hover:border-rosegold-300 transition-colors shadow-soft">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs text-charcoal-900 font-mono">
                    2. Unlabelled Production Stream
                  </span>
                </div>
                <p className="text-[11px] text-charcoal-500 mb-3 leading-relaxed">
                  Realistic transaction stream without labels, evaluating pure unsupervised Isolation Forest anomaly scoring and triage.
                </p>
                <button
                  onClick={() => handleLoadDemo('unlabelled')}
                  disabled={!!demoLoading}
                  className="rosegold-outline-btn w-full py-2 text-xs font-mono font-bold disabled:opacity-50"
                >
                  {demoLoading === 'unlabelled' ? 'Generating Stream...' : 'LOAD UNLABELLED STREAM'}
                </button>
              </div>

              {/* Option 3: Drifted */}
              <div className="p-4 bg-white rounded-xl border border-[#F0E4E6] hover:border-rosegold-300 transition-colors shadow-soft">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs text-charcoal-900 font-mono">
                    3. Drifted / Shifted Distribution
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-mono font-bold">
                    DRIFT TEST
                  </span>
                </div>
                <p className="text-[11px] text-charcoal-500 mb-3 leading-relaxed">
                  Shifted transaction sizes and night activity to trigger Population Stability Index alerts (PSI &ge; 0.25) in Drift Monitor.
                </p>
                <button
                  onClick={() => handleLoadDemo('drifted')}
                  disabled={!!demoLoading}
                  className="rosegold-outline-btn w-full py-2 text-xs font-mono font-bold disabled:opacity-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                >
                  {demoLoading === 'drifted' ? 'Generating Shifted Batch...' : 'LOAD DRIFTED BATCH (PSI > 0.25)'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-blush-50/60 rounded-xl border border-blush-200 text-[11px] text-charcoal-600 font-mono">
            <strong className="text-charcoal-900">SECURITY ASSURANCE:</strong> Processing executed strictly on local SQLite database. Never transmits PII to external third parties.
          </div>
        </div>
      </div>
    </div>
  );
};
