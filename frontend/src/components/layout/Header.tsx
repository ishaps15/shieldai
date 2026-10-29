import React from 'react';
import { Sparkles, Cpu, RefreshCw, AlertTriangle, ShieldCheck, Zap, ArrowRight, ShieldAlert } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';
import { NavPage } from './Sidebar';

interface HeaderProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  pageTitle?: string;
  category?: string;
  activeModelName?: string;
  driftStatus?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  pageTitle,
  category,
  activeModelName = 'Isolation Forest v1.0',
  driftStatus = 'Stable',
  onRefresh,
  isRefreshing = false,
}) => {
  const navTabs: Array<{ id: NavPage; label: string }> = [
    { id: 'dashboard', label: 'Surveillance' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'alerts', label: 'Alert Center' },
    { id: 'thresholds', label: 'Threshold Rules' },
    { id: 'drift', label: 'Drift Monitor' },
    { id: 'evaluation', label: 'Model Evaluation' },
    { id: 'ingestion', label: 'Data Ingestion' },
    { id: 'settings', label: 'Methodology' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#F0E4E6] shadow-soft">
      {/* Top Banner Ribbon */}
      <div className="bg-gradient-to-r from-blush-50 via-white to-blush-50 px-6 py-1.5 border-b border-[#F5EAEA] flex items-center justify-between text-[11px] font-mono text-charcoal-500">
        <div className="flex items-center space-x-3">
          <span className="flex items-center text-rosegold-700 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            SHIELD✦AI SURVEILLANCE
          </span>
          <span className="text-charcoal-300">|</span>
          <span className="hidden sm:inline">Active Engine: <strong className="text-charcoal-800 font-medium">{activeModelName}</strong></span>
          <span className="text-charcoal-300 hidden sm:inline">|</span>
          <span className="hidden md:inline">Latency: <strong className="text-emerald-700 font-medium">&lt; 8ms</strong></span>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              driftStatus === 'Significant Drift'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : driftStatus === 'Warning'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            DRIFT: {driftStatus.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="h-16 px-6 flex items-center justify-between max-w-7xl mx-auto">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rosegold-500 via-blush-500 to-rosegold-400 flex items-center justify-center shadow-md shadow-rosegold-400/20 text-white border border-white/60">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-lg tracking-tight text-charcoal-900 leading-tight">
              Shield<span className="text-rosegold-600 font-sans italic font-normal">AI</span>
            </span>
            <span className="text-[9px] uppercase tracking-widest text-charcoal-400 font-mono font-medium">
              Anomaly Intelligence
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navTabs.map((tab) => {
            const isActive = currentPage === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blush-100 text-rosegold-700 shadow-sm border border-blush-200 font-semibold'
                    : 'text-charcoal-600 hover:text-rosegold-600 hover:bg-blush-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right CTA & Actions */}
        <div className="flex items-center space-x-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-white hover:bg-blush-50 border border-blush-200 text-charcoal-600 hover:text-rosegold-600 transition-colors shadow-sm disabled:opacity-50"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-rosegold-500' : ''}`} />
            </button>
          )}

          <button
            onClick={() => onNavigate('ingestion')}
            className="rosegold-btn px-4 py-2 text-xs flex items-center font-medium shadow-sm hover:shadow-md"
          >
            <span>Upload Dataset</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
