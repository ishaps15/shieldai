import React, { useEffect, useState } from 'react';
import {
  Bell,
  Search,
  Filter,
  Check,
  X,
  AlertTriangle,
  Layers,
  Clock,
  ShieldCheck,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { Alert, AlertStatus, RiskLevel, AlertGroup } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [groups, setGroups] = useState<AlertGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [viewMode, setViewMode] = useState<'individual' | 'grouped'>('individual');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Triage Modal state
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const [triageStatus, setTriageStatus] = useState<AlertStatus>('Under Review');
  const [triageRisk, setTriageRisk] = useState<RiskLevel>('high');
  const [analystNote, setAnalystNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.getAlerts({
        page,
        page_size: 20,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        risk_level: riskFilter !== 'all' ? riskFilter : undefined,
        search: search.trim() || undefined,
      });
      setAlerts(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await api.getAlertGroups();
      setGroups(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (viewMode === 'individual') {
      fetchAlerts();
    } else {
      fetchGroups();
    }
  }, [page, statusFilter, riskFilter, viewMode]);

  const handleOpenTriage = (alert: Alert) => {
    setActiveAlert(alert);
    setTriageStatus(alert.status);
    setTriageRisk(alert.risk_level);
    setAnalystNote('');
  };

  const handleSaveTriage = async () => {
    if (!activeAlert) return;
    try {
      setUpdating(true);
      const updated = await api.updateAlert(activeAlert.alert_id, {
        status: triageStatus,
        risk_level: triageRisk,
        note: analystNote.trim() || 'Status updated via Triage Console',
        actor: 'Lead Fraud Analyst'
      });
      setAlerts((prev) => prev.map((a) => (a.alert_id === updated.alert_id ? updated : a)));
      setActiveAlert(null);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleQuickStatus = async (alert: Alert, newStatus: AlertStatus) => {
    try {
      const updated = await api.updateAlert(alert.alert_id, {
        status: newStatus,
        note: `Quick triage transitioned to ${newStatus}`,
        actor: 'Lead Investigator'
      });
      setAlerts((prev) => prev.map((a) => (a.alert_id === updated.alert_id ? updated : a)));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif font-bold text-2xl text-charcoal-900 tracking-tight">
            Alert Center & Incident Triage
          </h2>
          <p className="text-xs text-charcoal-500 mt-1 font-sans">
            Configurable alert deduplication, human-in-the-loop triage lifecycle, and audit logs.
          </p>
        </div>
      </div>

      {/* Top Filter Bar & View Selector */}
      <div className="luxury-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* View Toggle */}
        <div className="flex items-center space-x-1 bg-blush-50 p-1 rounded-xl border border-blush-200">
          <button
            onClick={() => setViewMode('individual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              viewMode === 'individual'
                ? 'rosegold-btn text-white shadow-xs'
                : 'text-charcoal-600 hover:text-rosegold-700'
            }`}
          >
            ACTIVE ALERTS ({total})
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              viewMode === 'grouped'
                ? 'rosegold-btn text-white shadow-xs'
                : 'text-charcoal-600 hover:text-rosegold-700'
            }`}
          >
            GROUPED INCIDENTS ({groups.length})
          </button>
        </div>

        {/* Filter Inputs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search alert ID, sender..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1);
                  fetchAlerts();
                }
              }}
              className="bg-white border border-[#EADBDE] rounded-xl pl-8 pr-3 py-2 text-xs text-charcoal-800 placeholder-charcoal-400 focus:outline-none focus:border-rosegold-500 font-mono shadow-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white border border-[#EADBDE] rounded-xl px-3 py-2 text-xs text-charcoal-800 focus:outline-none focus:border-rosegold-500 shadow-xs font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="New">New</option>
            <option value="Under Review">Under Review</option>
            <option value="Escalated">Escalated</option>
            <option value="Resolved">Resolved</option>
            <option value="False Positive">False Positive</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => {
              setRiskFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white border border-[#EADBDE] rounded-xl px-3 py-2 text-xs text-charcoal-800 focus:outline-none focus:border-rosegold-500 shadow-xs font-medium"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Main Table or Group Cards */}
      {viewMode === 'individual' ? (
        <div className="luxury-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-charcoal-700">
              <thead className="bg-blush-50/70 text-charcoal-500 font-mono font-semibold uppercase tracking-wider text-[10px] border-b border-[#F0E4E6]">
                <tr>
                  <th className="px-4 py-3.5">Alert ID</th>
                  <th className="px-4 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Sender ID</th>
                  <th className="px-4 py-3.5">Risk Level</th>
                  <th className="px-4 py-3.5">Anomaly Score</th>
                  <th className="px-4 py-3.5">Rule Triggers</th>
                  <th className="px-4 py-3.5">Triage Status</th>
                  <th className="px-4 py-3.5 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EAEA] font-mono text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-charcoal-400">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-rosegold-500 border-t-transparent rounded-full animate-spin" />
                        <span>Loading surveillance alert queue...</span>
                      </div>
                    </td>
                  </tr>
                ) : alerts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-charcoal-400 font-sans">
                      No active alerts match current filter criteria.
                    </td>
                  </tr>
                ) : (
                  alerts.map((alt) => (
                    <tr
                      key={alt.id}
                      className="hover:bg-blush-50/50 transition-colors cursor-pointer"
                      onClick={() => handleOpenTriage(alt)}
                    >
                      <td className="px-4 py-3.5 font-bold text-charcoal-900">
                        {alt.alert_id}
                      </td>
                      <td className="px-4 py-3.5 text-charcoal-500 whitespace-nowrap">
                        {alt.timestamp.replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-charcoal-900">{alt.sender_id}</td>
                      <td className="px-4 py-3.5">
                        <Badge type="risk" value={alt.risk_level} />
                      </td>
                      <td className="px-4 py-3.5 font-bold text-rose-600">
                        {alt.anomaly_score.toFixed(3)}
                      </td>
                      <td className="px-4 py-3.5 font-sans">
                        <div className="flex flex-wrap gap-1">
                          {alt.rule_triggers?.slice(0, 2).map((r, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-blush-50 text-[10px] text-rosegold-700 border border-blush-200 truncate max-w-[220px]"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge type="status" value={alt.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right font-sans">
                        <div className="flex items-center justify-end space-x-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleQuickStatus(alt, 'Resolved')}
                            title="Mark Resolved"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition-colors shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleQuickStatus(alt, 'False Positive')}
                            title="Mark False Positive"
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors shadow-xs"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenTriage(alt)}
                            className="px-2.5 py-1 rounded-lg bg-blush-100 hover:bg-blush-200 text-rosegold-700 border border-blush-300 text-xs font-semibold transition-colors shadow-xs"
                          >
                            Triage
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3.5 bg-blush-50/40 border-t border-[#F0E4E6] flex items-center justify-between text-xs text-charcoal-500 font-mono">
            <span>
              PAGE <strong className="text-charcoal-900">{page}</strong> OF{' '}
              <strong className="text-charcoal-900">{totalPages}</strong> ({total.toLocaleString()} ALERTS)
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#EADBDE] hover:bg-blush-50 disabled:opacity-40 text-charcoal-700 shadow-xs"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#EADBDE] hover:bg-blush-50 disabled:opacity-40 text-charcoal-700 shadow-xs"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Grouped Incidents Card Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((grp) => (
            <div
              key={grp.group_id}
              className="luxury-card p-5 hover:border-rosegold-300 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-rosegold-700">
                  {grp.group_id}
                </span>
                <Badge type="risk" value={grp.highest_risk} />
              </div>
              <p className="text-xs text-charcoal-700 font-mono">Sender: <strong className="text-charcoal-900">{grp.sender_id}</strong></p>
              <div className="mt-4 flex items-center justify-between text-xs text-charcoal-500 border-t border-[#F5EAEA] pt-3 font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-blush-50 border border-blush-200 text-rosegold-800 font-semibold">
                  {grp.alert_count} aggregated events
                </span>
                <span className="text-[11px] text-charcoal-400">
                  {grp.last_activity.replace('T', ' ').slice(0, 16)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Triage Dialog */}
      <Modal
        isOpen={!!activeAlert}
        onClose={() => setActiveAlert(null)}
        title={`Incident Triage Console — ${activeAlert?.alert_id}`}
        maxWidth="max-w-2xl"
      >
        {activeAlert && (
          <div className="space-y-5 text-xs">
            <div className="p-4 bg-blush-50/50 rounded-xl border border-blush-200 grid grid-cols-3 gap-3 font-mono">
              <div>
                <span className="text-charcoal-400 block text-[10px]">SENDER</span>
                <span className="font-bold text-charcoal-900">{activeAlert.sender_id}</span>
              </div>
              <div>
                <span className="text-charcoal-400 block text-[10px]">SCORE</span>
                <span className="font-bold text-rose-600">{activeAlert.anomaly_score.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-charcoal-400 block text-[10px]">STATUS</span>
                <div className="mt-0.5">
                  <Badge type="status" value={activeAlert.status} />
                </div>
              </div>
            </div>

            {/* Triggers */}
            <div>
              <span className="text-charcoal-500 font-mono font-bold uppercase tracking-wider block mb-2">
                Rule Triggers & Indicators
              </span>
              <ul className="space-y-1.5">
                {activeAlert.rule_triggers?.map((trig, idx) => (
                  <li key={idx} className="p-2.5 rounded-xl bg-white border border-[#F0E4E6] text-charcoal-700 flex items-center shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-rosegold-500 mr-2 shrink-0" />
                    {trig}
                  </li>
                ))}
              </ul>
            </div>

            {/* Status & Severity Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-charcoal-600 font-semibold block mb-1">Transition Status</label>
                <select
                  value={triageStatus}
                  onChange={(e) => setTriageStatus(e.target.value as AlertStatus)}
                  className="w-full bg-white border border-[#EADBDE] rounded-xl px-3 py-2 text-xs text-charcoal-800 focus:outline-none focus:border-rosegold-500 shadow-xs"
                >
                  <option value="New">New</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Escalated">Escalated</option>
                  <option value="Resolved">Resolved</option>
                  <option value="False Positive">False Positive</option>
                </select>
              </div>

              <div>
                <label className="text-charcoal-600 font-semibold block mb-1">Adjust Severity Level</label>
                <select
                  value={triageRisk}
                  onChange={(e) => setTriageRisk(e.target.value as RiskLevel)}
                  className="w-full bg-white border border-[#EADBDE] rounded-xl px-3 py-2 text-xs text-charcoal-800 focus:outline-none focus:border-rosegold-500 shadow-xs"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Note input */}
            <div>
              <label className="text-charcoal-600 font-semibold block mb-1">Analyst Case Note</label>
              <textarea
                rows={3}
                value={analystNote}
                onChange={(e) => setAnalystNote(e.target.value)}
                placeholder="Log investigative findings, transaction context, or verification steps..."
                className="w-full bg-white border border-[#EADBDE] rounded-xl p-3 text-xs text-charcoal-800 placeholder-charcoal-400 focus:outline-none focus:border-rosegold-500 shadow-xs"
              />
            </div>

            {/* Audit History Timeline */}
            <div>
              <span className="text-charcoal-500 font-mono font-bold uppercase tracking-wider block mb-2 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 text-rosegold-500" />
                Audit Trail Timeline
              </span>
              <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-blush-50/40 rounded-xl border border-blush-200 font-mono text-[11px]">
                {activeAlert.audit_logs?.length === 0 ? (
                  <span className="text-charcoal-400">No prior audit records.</span>
                ) : (
                  activeAlert.audit_logs?.map((log) => (
                    <div key={log.id} className="border-b border-[#F0E4E6] pb-2 last:border-0">
                      <div className="flex justify-between text-charcoal-400 text-[10px]">
                        <span className="font-bold text-charcoal-800">{log.actor}</span>
                        <span>{log.timestamp.replace('T', ' ').slice(0, 19)}</span>
                      </div>
                      <p className="text-charcoal-700 mt-0.5 font-sans text-xs">{log.note}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-3 border-t border-[#F0E4E6]">
              <button
                onClick={() => setActiveAlert(null)}
                className="px-4 py-2 bg-white hover:bg-blush-50 text-charcoal-600 rounded-xl text-xs border border-[#EADBDE] shadow-xs"
              >
                Close
              </button>
              <button
                onClick={handleSaveTriage}
                disabled={updating}
                className="rosegold-btn px-4 py-2 text-xs font-semibold disabled:opacity-50"
              >
                {updating ? 'Saving Changes...' : 'Save Triage Record'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
