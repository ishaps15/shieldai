import React from 'react';
import { ShieldAlert, ShieldCheck, Lock, Activity, Sparkles, Heart } from 'lucide-react';
import { NavPage } from './Sidebar';

interface FooterProps {
  onNavigate?: (page: NavPage) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="mt-16 bg-white border-t border-[#F0E4E6] text-charcoal-700">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand & Purpose */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rosegold-500 to-blush-500 flex items-center justify-center text-white shadow-sm shadow-rosegold-400/20">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span className="font-serif font-bold text-lg text-charcoal-900 tracking-tight">
                Shield<span className="text-rosegold-600 font-sans italic font-normal">AI</span>
              </span>
            </div>
            <p className="text-xs text-charcoal-500 leading-relaxed">
              Autonomous financial surveillance system pairing causal unsupervised anomaly detection with statistical drift telemetry and human-in-the-loop triage.
            </p>
            <div className="flex items-center space-x-2 text-[11px] font-mono text-rosegold-700 bg-blush-50 px-2.5 py-1.5 rounded-lg border border-blush-200 w-fit">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>SOC2 Type II Aligned Architecture</span>
            </div>
          </div>

          {/* Core Modules */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-900 mb-3 font-mono">
              Surveillance Engine
            </h4>
            <ul className="space-y-2 text-xs text-charcoal-500">
              <li>
                <button
                  onClick={() => onNavigate?.('dashboard')}
                  className="hover:text-rosegold-600 transition-colors"
                >
                  Operations Dashboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate?.('transactions')}
                  className="hover:text-rosegold-600 transition-colors"
                >
                  Transaction Explorer
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate?.('alerts')}
                  className="hover:text-rosegold-600 transition-colors"
                >
                  Alert Triage & Queue
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate?.('thresholds')}
                  className="hover:text-rosegold-600 transition-colors"
                >
                  Dynamic Threshold Sandbox
                </button>
              </li>
            </ul>
          </div>

          {/* Machine Learning & Telemetry */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-900 mb-3 font-mono">
              Intelligence & Drift
            </h4>
            <ul className="space-y-2 text-xs text-charcoal-500">
              <li>
                <button
                  onClick={() => onNavigate?.('drift')}
                  className="hover:text-rosegold-600 transition-colors"
                >
                  PSI & KS Drift Monitor
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate?.('evaluation')}
                  className="hover:text-rosegold-600 transition-colors"
                >
                  Supervised PR-AUC Benchmark
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate?.('ingestion')}
                  className="hover:text-rosegold-600 transition-colors"
                >
                  CSV Schema Ingestion
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate?.('settings')}
                  className="hover:text-rosegold-600 transition-colors"
                >
                  Mathematical Formulation
                </button>
              </li>
            </ul>
          </div>

          {/* Security & Reliability */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-900 mb-3 font-mono">
              Privacy & Safeguards
            </h4>
            <p className="text-xs text-charcoal-500 leading-relaxed">
              Zero outbound bank telemetry. Data stays partitioned within your secure environment with leak-free rolling feature windows.
            </p>
            <div className="pt-1 flex flex-col space-y-1.5 text-[11px] text-charcoal-400">
              <span className="flex items-center">
                <Lock className="w-3 h-3 mr-1.5 text-rosegold-500" /> End-to-end Local Processing
              </span>
              <span className="flex items-center">
                <Activity className="w-3 h-3 mr-1.5 text-emerald-600" /> Non-Causal Feature Leak Prevention
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-[#F5EAEA] flex flex-col sm:flex-row items-center justify-between text-[11px] text-charcoal-400 font-mono">
          <div>
            © {new Date().getFullYear()} ShieldAI Enterprise. Intelligent Fraud & Anomaly Detection.
          </div>
          <div className="flex items-center space-x-4 mt-3 sm:mt-0">
            <span className="flex items-center text-charcoal-500">
              Crafted with <Heart className="w-3 h-3 text-rosegold-500 mx-1 fill-rosegold-400" /> & pastel rose gold aesthetics
            </span>
            <span className="text-charcoal-300">|</span>
            <span>FastAPI 0.115 + Scikit-Learn 1.6</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
