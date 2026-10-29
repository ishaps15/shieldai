import React from 'react';
import {
  ShieldAlert,
  LayoutDashboard,
  ArrowLeftRight,
  Bell,
  Sliders,
  Activity,
  Award,
  UploadCloud,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type NavPage =
  | 'dashboard'
  | 'transactions'
  | 'alerts'
  | 'thresholds'
  | 'drift'
  | 'evaluation'
  | 'ingestion'
  | 'settings';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  alertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  alertCount = 18,
}) => {
  const navSections = [
    {
      title: 'SURVEILLANCE',
      items: [
        { id: 'dashboard', label: 'Surveillance Dashboard', icon: LayoutDashboard },
        { id: 'transactions', label: 'Transaction Explorer', icon: ArrowLeftRight },
        { id: 'alerts', label: 'Alert Center', icon: Bell, badge: alertCount },
      ],
    },
    {
      title: 'ML CONTROLS',
      items: [
        { id: 'thresholds', label: 'Threshold Rules', icon: Sliders },
        { id: 'drift', label: 'Drift Monitor', icon: Activity },
        { id: 'evaluation', label: 'Model Evaluation', icon: Award },
      ],
    },
    {
      title: 'PLATFORM',
      items: [
        { id: 'ingestion', label: 'Data Ingestion', icon: UploadCloud },
        { id: 'settings', label: 'Methodology & Config', icon: Settings },
      ],
    },
  ];

  return (
    <aside
      className={`relative flex flex-col bg-white border-r border-[#F0E4E6] transition-all duration-300 z-20 select-none shadow-soft ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#F5EAEA]">
        <div className="flex items-center space-x-3 overflow-hidden cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rosegold-500 to-blush-500 flex items-center justify-center shadow-md shadow-rosegold-400/20 text-white shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-serif font-bold text-sm tracking-tight text-charcoal-900 leading-tight">
                Shield<span className="text-rosegold-600 font-sans italic font-normal">AI</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-charcoal-400 font-mono font-medium">
                Surveillance
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed && (
              <span className="px-3 text-[10px] font-mono font-semibold tracking-wider text-charcoal-400 block mb-1">
                {section.title}
              </span>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id as NavPage)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blush-100 to-blush-50 text-rosegold-700 border border-blush-200/80 shadow-sm font-semibold'
                      : 'text-charcoal-600 hover:text-rosegold-700 hover:bg-blush-50'
                  }`}
                >
                  <div className="flex items-center min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-rosegold-600' : 'text-charcoal-400'}`} />
                    {!isCollapsed && <span className="ml-3 truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blush-100 text-rosegold-700 border border-blush-200">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Collapse */}
      <div className="p-3 border-t border-[#F5EAEA] bg-blush-50/50 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono text-charcoal-500">Real-Time ML Active</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg bg-white hover:bg-blush-100 text-charcoal-400 hover:text-charcoal-700 transition-colors mx-auto border border-blush-200 shadow-sm"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>
    </aside>
  );
};
