import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Eye,
  AlertTriangle,
  History,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Tag,
  ArrowUpRight,
  Sparkles,
  Zap,
  Globe,
  Smartphone,
  Calendar,
  DollarSign
} from 'lucide-react';
import { api } from '../services/api';
import { Transaction, RiskLevel } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [riskBand, setRiskBand] = useState<string>('all');
  const [isAnomalyOnly, setIsAnomalyOnly] = useState<boolean>(false);
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');

  // Drilldown Modal
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [senderHistory, setSenderHistory] = useState<Transaction[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.getTransactions({
        page,
        page_size: 20,
        search: search.trim() || undefined,
        risk_band: riskBand !== 'all' ? riskBand : undefined,
        is_anomaly: isAnomalyOnly ? true : undefined,
        min_amount: minAmount ? parseFloat(minAmount) : undefined,
        max_amount: maxAmount ? parseFloat(maxAmount) : undefined,
        sort_by: 'timestamp',
        sort_dir: 'desc',
      });
      setTransactions(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, riskBand, isAnomalyOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const handleOpenDetail = async (tx: Transaction) => {
    setSelectedTx(tx);
    setModalLoading(true);
    try {
      const detail = await api.getTransactionDetail(tx.transaction_id);
      setSelectedTx(detail.transaction);
      setSenderHistory(detail.sender_history);
      setSignals(detail.contributing_signals);
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif font-bold text-2xl text-charcoal-900 tracking-tight">
            Transaction Stream & Signals
          </h2>
          <p className="text-xs text-charcoal-500 mt-1 font-sans">
            Real-time causal ledger with streaming anomaly scores and dimensional behavioral markers.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-charcoal-500">
          <span className="px-3 py-1.5 rounded-xl bg-white border border-[#EADBDE] shadow-soft">
            Total Records: <strong className="text-charcoal-900 font-bold">{total.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="luxury-card p-5 space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Transaction ID, Sender ID, Receiver..."
              className="w-full bg-white border border-[#EADBDE] rounded-xl pl-9 pr-3 py-2.5 text-xs text-charcoal-800 placeholder-charcoal-400 focus:outline-none focus:border-rosegold-500 focus:ring-2 focus:ring-blush-200 transition-all font-mono"
            />
          </div>

          <div className="md:col-span-2">
            <select
              value={riskBand}
              onChange={(e) => {
                setRiskBand(e.target.value);
                setPage(1);
              }}
              className="w-full bg-white border border-[#EADBDE] rounded-xl px-3 py-2.5 text-xs text-charcoal-800 focus:outline-none focus:border-rosegold-500 focus:ring-2 focus:ring-blush-200 transition-all font-medium"
            >
              <option value="all">All Risk Tiers</option>
              <option value="critical">Critical Risk</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
              <option value="normal">Normal</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-center space-x-2">
            <input
              type="number"
              placeholder="Min $"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full bg-white border border-[#EADBDE] rounded-xl px-3 py-2.5 text-xs text-charcoal-800 placeholder-charcoal-400 focus:outline-none focus:border-rosegold-500 font-mono"
            />
            <input
              type="number"
              placeholder="Max $"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-full bg-white border border-[#EADBDE] rounded-xl px-3 py-2.5 text-xs text-charcoal-800 placeholder-charcoal-400 focus:outline-none focus:border-rosegold-500 font-mono"
            />
          </div>

          <div className="md:col-span-3 flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-xs text-charcoal-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAnomalyOnly}
                onChange={(e) => {
                  setIsAnomalyOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-[#D7AEA5] text-rosegold-600 focus:ring-rosegold-400"
              />
              <span className="font-medium">Anomalies Only</span>
            </label>

            <button
              type="submit"
              className="rosegold-btn ml-auto px-4 py-2.5 text-xs font-semibold"
            >
              Filter
            </button>
          </div>
        </form>

        {/* Quick Filter Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#F5EAEA] text-[11px]">
          <span className="text-charcoal-400 font-mono text-[10px] uppercase font-semibold">Quick Presets:</span>
          <button
            onClick={() => {
              setRiskBand('all');
              setIsAnomalyOnly(false);
              setMinAmount('');
              setMaxAmount('');
              setPage(1);
            }}
            className={`px-3 py-1 rounded-lg border text-xs transition-colors ${
              riskBand === 'all' && !isAnomalyOnly
                ? 'bg-blush-100 border-rosegold-300 text-rosegold-800 font-semibold'
                : 'bg-white border-[#EADBDE] text-charcoal-600 hover:bg-blush-50'
            }`}
          >
            All Stream
          </button>
          <button
            onClick={() => {
              setRiskBand('critical');
              setIsAnomalyOnly(true);
              setPage(1);
            }}
            className={`px-3 py-1 rounded-lg border text-xs transition-colors ${
              riskBand === 'critical'
                ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold'
                : 'bg-white border-[#EADBDE] text-charcoal-600 hover:bg-blush-50'
            }`}
          >
            Critical Only
          </button>
          <button
            onClick={() => {
              setRiskBand('all');
              setIsAnomalyOnly(true);
              setMinAmount('5000');
              setPage(1);
            }}
            className="px-3 py-1 rounded-lg border bg-white border-[#EADBDE] text-charcoal-600 hover:bg-blush-50 text-xs transition-colors"
          >
            High Value Outliers (&gt; $5,000)
          </button>
        </div>
      </div>

      {/* Main Transactions Data Table */}
      <div className="luxury-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-charcoal-700">
            <thead className="bg-blush-50/70 text-charcoal-500 font-mono font-semibold uppercase tracking-wider text-[10px] border-b border-[#F0E4E6]">
              <tr>
                <th className="px-4 py-3.5">Transaction ID</th>
                <th className="px-4 py-3.5">Timestamp (UTC)</th>
                <th className="px-4 py-3.5">Sender & Receiver</th>
                <th className="px-4 py-3.5">Amount</th>
                <th className="px-4 py-3.5">Category & Location</th>
                <th className="px-4 py-3.5">Anomaly Score</th>
                <th className="px-4 py-3.5">Risk Band</th>
                <th className="px-4 py-3.5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EAEA] font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-charcoal-400">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-rosegold-500 border-t-transparent rounded-full animate-spin" />
                      <span>Fetching transactions from ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-charcoal-400 font-sans">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-blush-50/50 transition-colors cursor-pointer group"
                    onClick={() => handleOpenDetail(tx)}
                  >
                    <td className="px-4 py-3.5 font-bold text-charcoal-900">
                      {tx.transaction_id}
                    </td>
                    <td className="px-4 py-3.5 text-charcoal-500 whitespace-nowrap">
                      {tx.timestamp.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="px-4 py-3.5 font-sans">
                      <div className="font-mono font-semibold text-charcoal-900 text-xs">{tx.sender_id}</div>
                      <div className="text-[11px] text-charcoal-400 font-mono">→ {tx.receiver_id}</div>
                    </td>
                    <td className="px-4 py-3.5 font-extrabold text-charcoal-900 whitespace-nowrap text-xs">
                      ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 font-sans">
                      <span className="capitalize text-charcoal-700 font-medium">{tx.merchant_category}</span>
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-blush-50 text-[10px] font-mono text-rosegold-700 border border-blush-200">
                        {tx.location}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold ${
                          tx.anomaly_score && tx.anomaly_score >= 0.75
                            ? 'text-rose-600'
                            : tx.anomaly_score && tx.anomaly_score >= 0.55
                            ? 'text-amber-600'
                            : 'text-charcoal-700'
                        }`}>
                          {tx.anomaly_score !== undefined && tx.anomaly_score !== null
                            ? tx.anomaly_score.toFixed(3)
                            : 'N/A'}
                        </span>
                        {tx.anomaly_score !== null && tx.anomaly_score !== undefined && (
                          <div className="w-16 bg-[#F5EAEA] h-1.5 rounded-full overflow-hidden border border-[#EADBDE]">
                            <div
                              className={`h-full ${
                                tx.anomaly_score >= 0.75
                                  ? 'bg-rose-500'
                                  : tx.anomaly_score >= 0.55
                                  ? 'bg-amber-500'
                                  : 'bg-rosegold-500'
                              }`}
                              style={{ width: `${Math.min(tx.anomaly_score * 100, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge type="risk" value={tx.risk_band} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(tx);
                        }}
                        className="p-1.5 rounded-lg bg-white border border-[#EADBDE] hover:bg-blush-50 hover:border-rosegold-300 text-charcoal-600 hover:text-rosegold-700 transition-colors shadow-sm"
                        title="Investigate transaction"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3.5 bg-blush-50/40 border-t border-[#F0E4E6] flex items-center justify-between text-xs text-charcoal-500 font-mono">
          <span>
            PAGE <strong className="text-charcoal-900">{page}</strong> OF{' '}
            <strong className="text-charcoal-900">{totalPages}</strong> ({total.toLocaleString()} TRANSACTIONS)
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#EADBDE] hover:bg-blush-50 disabled:opacity-40 text-charcoal-700 transition-colors flex items-center shadow-sm"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#EADBDE] hover:bg-blush-50 disabled:opacity-40 text-charcoal-700 transition-colors flex items-center shadow-sm"
            >
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Investigation Workbench Modal */}
      <Modal
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        title={`Investigation Workbench — ${selectedTx?.transaction_id}`}
        maxWidth="max-w-3xl"
      >
        {selectedTx && (
          <div className="space-y-6 text-xs">
            {/* Top Score & Risk Gauge Ribbon */}
            <div className="p-4 rounded-xl bg-blush-50/50 border border-blush-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[10px] font-mono text-charcoal-500 uppercase tracking-widest block font-semibold">Amount</span>
                <span className="text-xl font-mono font-extrabold text-charcoal-900">
                  ${selectedTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-charcoal-400 block mt-0.5">{selectedTx.currency}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-charcoal-500 uppercase tracking-widest block font-semibold">Isolation Score</span>
                <span className="text-xl font-mono font-extrabold text-rose-600">
                  {selectedTx.anomaly_score?.toFixed(3) ?? 'N/A'}
                </span>
                <span className="text-[10px] text-charcoal-400 block mt-0.5">Norm. Isolation Depth</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-charcoal-500 uppercase tracking-widest block font-semibold">Risk Band</span>
                <div className="mt-1">
                  <Badge type="risk" value={selectedTx.risk_band} size="md" />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono text-charcoal-500 uppercase tracking-widest block font-semibold">Statistical MAD</span>
                <span className="text-xl font-mono font-bold text-charcoal-700">
                  {selectedTx.baseline_score?.toFixed(3) ?? 'N/A'}
                </span>
                <span className="text-[10px] text-charcoal-400 block mt-0.5">Robust Z-Benchmark</span>
              </div>
            </div>

            {/* Contributing Behavioral Signals with Severity Cards */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-charcoal-900 flex items-center">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mr-1.5" />
                  Contributing Behavioral Signals
                </h4>
                <span className="text-[10px] text-charcoal-400">Non-causal multi-dimensional deviations</span>
              </div>
              
              <div className="space-y-2">
                {signals.length === 0 ? (
                  <div className="p-3 bg-white rounded-xl border border-[#F0E4E6] text-charcoal-500 text-center">
                    No single extreme univariate deviation; flagged by joint feature distribution in Isolation Forest.
                  </div>
                ) : (
                  signals.map((sig, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border flex items-start justify-between ${
                        sig.severity === 'danger'
                          ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                          : sig.severity === 'warning'
                          ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                          : 'bg-white border-[#F0E4E6] text-charcoal-800'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-xs block">{sig.signal}</span>
                        <span className="text-[11px] opacity-90 mt-0.5 block leading-relaxed">{sig.description}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-charcoal-200 uppercase shrink-0 ml-3 shadow-xs">
                        {sig.severity}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Transaction Entity & Device Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-white rounded-xl border border-[#F0E4E6] font-mono text-[11px] shadow-soft">
              <div>
                <span className="text-charcoal-400 text-[10px] block">SENDER</span>
                <span className="font-bold text-charcoal-900">{selectedTx.sender_id}</span>
              </div>
              <div>
                <span className="text-charcoal-400 text-[10px] block">RECEIVER</span>
                <span className="font-bold text-charcoal-900">{selectedTx.receiver_id}</span>
              </div>
              <div>
                <span className="text-charcoal-400 text-[10px] block">LOCATION</span>
                <span className="text-charcoal-800 flex items-center">
                  <Globe className="w-3 h-3 mr-1 text-rosegold-500" />
                  {selectedTx.location}
                </span>
              </div>
              <div>
                <span className="text-charcoal-400 text-[10px] block">CHANNEL</span>
                <span className="text-charcoal-800 flex items-center capitalize">
                  <Smartphone className="w-3 h-3 mr-1 text-rosegold-500" />
                  {selectedTx.device_channel}
                </span>
              </div>
            </div>

            {/* Historical Sequence for this Customer */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-charcoal-900 flex items-center">
                  <History className="w-4 h-4 text-rosegold-600 mr-1.5" />
                  Sender Chronological Sequence
                </h4>
                <span className="text-[10px] text-charcoal-400">Strictly prior transactions (leakage-free)</span>
              </div>

              <div className="border border-[#F0E4E6] rounded-xl overflow-hidden bg-white shadow-soft">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-blush-50/70 text-charcoal-500 border-b border-[#F0E4E6] text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5">Timestamp</th>
                      <th className="px-3 py-2.5">Amount</th>
                      <th className="px-3 py-2.5">Receiver</th>
                      <th className="px-3 py-2.5">Score</th>
                      <th className="px-3 py-2.5">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5EAEA]">
                    {senderHistory.map((h) => (
                      <tr key={h.id} className={h.id === selectedTx.id ? 'bg-blush-100/60 font-semibold' : ''}>
                        <td className="px-3 py-2 text-charcoal-500 whitespace-nowrap">
                          {h.timestamp.replace('T', ' ').slice(0, 19)}
                        </td>
                        <td className="px-3 py-2 font-bold text-charcoal-900">
                          ${h.amount.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-charcoal-600">{h.receiver_id}</td>
                        <td className="px-3 py-2 font-mono text-rose-600 font-bold">
                          {h.anomaly_score?.toFixed(3) ?? '-'}
                        </td>
                        <td className="px-3 py-2">
                          <Badge type="risk" value={h.risk_band} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
