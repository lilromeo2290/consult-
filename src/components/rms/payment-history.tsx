'use client';

import { useState, useMemo } from 'react';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import {
  Search,
  Printer,
  Calendar,
  Building2,
  Home,
  DollarSign,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Hash,
  User,
  TrendingUp,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type PaymentMethod = 'Cash' | 'Mobile Money' | 'Bank' | 'POS' | 'Online';
type PaymentStatus = 'Full' | 'Partial' | 'Advance';

interface Payment {
  id: string;
  receiptNo: string;
  billNo: string;
  business: string;
  amount: number;
  balance: number;
  date: string;
  collector: string;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string;
  remarks: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => `GH₵ ${n.toLocaleString('en-GH')}`;

// ─── Mock Data ────────────────────────────────────────────────────────────────

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentHistoryPage() {
  const [storedPayments] = useSyncedStorage<Payment[]>('rms-payments', []);
  const [entitySearch, setEntitySearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [methodFilter, setMethodFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [entityTypeFilter, setEntityTypeFilter] = useState('All');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    return storedPayments.filter((p) => {
      const q = entitySearch.toLowerCase();
      const matchEntity = !q || p.business.toLowerCase().includes(q) || p.receiptNo.toLowerCase().includes(q) || p.billNo.toLowerCase().includes(q);
      const matchFrom = !dateFrom || p.date >= dateFrom;
      const matchTo = !dateTo || p.date <= dateTo;
      const matchMethod = methodFilter === 'All' || p.method === methodFilter;
      const matchStatus = statusFilter === 'All' || p.status === statusFilter;
      const matchEntityType = true;
      return matchEntity && matchFrom && matchTo && matchMethod && matchStatus && matchEntityType;
    });
  }, [entitySearch, dateFrom, dateTo, methodFilter, statusFilter, entityTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);
  const showingFrom = filtered.length === 0 ? 0 : (safePage - 1) * perPage + 1;
  const showingTo = Math.min(safePage * perPage, filtered.length);

  const stats = useMemo(() => ({
    totalAmount: filtered.reduce((s, p) => s + p.amount, 0),
    totalBalance: filtered.reduce((s, p) => s + p.balance, 0),
    count: filtered.length,
    entities: new Set(filtered.map((p) => p.business)).size,
  }), [filtered]);

  // ─── Print Functions ─────────────────────────────────────────────────────

  const buildPrintHTML = (reportTitle: string, data: Payment[]) => {
    const totalAmt = data.reduce((s, p) => s + p.amount, 0);
    const totalBal = data.reduce((s, p) => s + p.balance, 0);
    const rows = data.map((p) => `
      <tr>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;">${p.receiptNo}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;">${p.date}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;">${p.business}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;">${p.billNo}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;">${p.collector}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;">${p.method}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:right;">${fmt(p.amount)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:right;">${p.balance > 0 ? fmt(p.balance) : '—'}</td>
      </tr>`).join('');

    return `<!DOCTYPE html><html><head><title>Payment History Report</title><style>@page{size:A4;margin:12mm;}*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Tahoma,sans-serif;color:#1e293b;padding:0;}.header{text-align:center;border-bottom:3px double #1e293b;padding-bottom:12px;margin-bottom:12px;}.header h1{font-size:17px;font-weight:700;letter-spacing:0.05em;}.header p{font-size:11px;color:#64748b;margin-top:3px;}.rpt-title{text-align:center;font-size:14px;font-weight:600;margin-bottom:2px;color:#E31E24;}.rpt-meta{text-align:center;font-size:10px;color:#94a3b8;margin-bottom:16px;}table{width:100%;border-collapse:collapse;font-size:11px;}thead th{text-align:left;padding:6px 8px;background:#f8fafc;color:#64748b;font-size:10px;text-transform:uppercase;border-bottom:2px solid #e2e8f0;}tfoot td{padding:6px 8px;font-size:11px;font-weight:700;border-top:2px solid #1e293b;background:#f8fafc;}.footer{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#94a3b8;}</style></head><body><div class="header"><h1>KUMASI METROPOLITAN ASSEMBLY</h1><p>Revenue Management System — Payment History Report</p></div><div class="rpt-title">${reportTitle}</div><div class="rpt-meta">Generated: ${new Date().toLocaleString()} | ${data.length} payment(s)</div><table><thead><tr><th>Receipt #</th><th>Date</th><th>Entity</th><th>Bill No</th><th>Collector</th><th>Method</th><th style="text-align:right;">Amount</th><th style="text-align:right;">Balance</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="6" style="text-align:right;">Total</td><td style="text-align:right;">${fmt(totalAmt)}</td><td style="text-align:right;color:${totalBal>0?'#dc2626':'#E31E24'};">${totalBal>0?fmt(totalBal):'—'}</td></tr></tfoot></table><div class="footer">This is a computer-generated document and does not require a signature.<br/>Designed, Developed &amp; Maintained by <strong>Clipe Consult</strong> | www.clipeconsult.com</div></body></html>`;
  };

  const handlePrintAll = () => {
    if (filtered.length === 0) return;
    const periodText = (dateFrom || dateTo) ? `Period: ${dateFrom || '...'} to ${dateTo || '...'}` : 'All Time';
    const entityText = entitySearch ? `Entity: ${entitySearch}` : 'All Entities';
    const w = window.open('', '_blank', 'width=794,height=1123');
    if (!w) return;
    w.document.write(buildPrintHTML(`Payment History — ${entityText} — ${periodText}`, filtered));
    w.document.close();
    w.onload = () => { w.print(); };
  };

  const handlePrintEntity = (entityName: string) => {
    const entityPayments = filtered.filter((p) => p.business === entityName);
    if (entityPayments.length === 0) return;
    const w = window.open('', '_blank', 'width=794,height=1123');
    if (!w) return;
    w.document.write(buildPrintHTML(`Payment History — ${entityName}`, entityPayments));
    w.document.close();
    w.onload = () => { w.print(); };
  };

  // ─── Unique entities for grouped view ──────────────────────────────────────

  const uniqueEntities = useMemo(() => {
 const map = new Map<string, { name: string; type: string; count: number; total: number }>();
    filtered.forEach((p) => {
      const existing = map.get(p.business);
      if (existing) {
        existing.count += 1;
        existing.total += p.amount;
      } else {
        map.set(p.business, { name: p.business, type: '', count: 1, total: p.amount });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const inputCls = 'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0B1D3E] focus:border-[#0B1D3E] outline-none transition';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payment History</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Search and print payment history for any business or property within a date range</p>
        </div>
        <button onClick={handlePrintAll} disabled={filtered.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-[#0B1D3E] hover:bg-[#E31E24] disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer">
          <Printer className="w-4 h-4" />
          Print All ({filtered.length})
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0B1D3E]/10 dark:bg-[#4a7ab5]/20 flex items-center justify-center"><CreditCard className="w-5 h-5 text-[#0B1D3E] dark:text-[#4a7ab5]" /></div>
          <div><p className="text-xs text-slate-500 dark:text-slate-400">Payments</p><p className="text-lg font-bold text-slate-900 dark:text-white">{stats.count}</p></div>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center"><DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
          <div><p className="text-xs text-slate-500 dark:text-slate-400">Total Collected</p><p className="text-lg font-bold text-slate-900 dark:text-white">{fmt(stats.totalAmount)}</p></div>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" /></div>
          <div><p className="text-xs text-slate-500 dark:text-slate-400">Outstanding</p><p className="text-lg font-bold text-amber-700 dark:text-amber-400">{fmt(stats.totalBalance)}</p></div>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center"><Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" /></div>
          <div><p className="text-xs text-slate-500 dark:text-slate-400">Entities</p><p className="text-lg font-bold text-slate-900 dark:text-white">{stats.entities}</p></div>
        </div>
      </div>

      {/* Entity Grouping Summary */}
      {entitySearch && uniqueEntities.length > 0 && (
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-slate-400" /><h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Entity Summary</h2></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {uniqueEntities.slice(0, 6).map((e, i) => (
              <button
                key={`entity-${i}`}
                onClick={() => handlePrintEntity(e.name)}
                className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 hover:bg-[#0B1D3E]/10 dark:hover:bg-[#4a7ab5]/20 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {e.type === 'Property' ? <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{e.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{e.count} payment{e.count !== 1 ? 's' : ''}</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{fmt(e.total)}</span>
                  <Printer className="w-3.5 h-3.5 text-slate-400 hover:text-[#0B1D3E]" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-slate-400" /><span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filters</span></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search entity, receipt #..."
              value={entitySearch}
              onChange={(e) => { setEntitySearch(e.target.value); setPage(1); }}
              className={`${inputCls} pl-10`}
            />
          </div>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} placeholder="From date" className={inputCls} />
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} placeholder="To date" className={inputCls} />
          <select value={entityTypeFilter} onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1); }} className={inputCls}>
            <option value="All">All Types</option>
            <option value="Business">Business</option>
            <option value="Property">Property</option>
          </select>
          <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }} className={inputCls}>
            <option value="All">All Methods</option>
            <option value="Cash">Cash</option>
            <option value="Mobile Money">Mobile Money</option>
            <option value="Bank">Bank</option>
            <option value="POS">POS</option>
            <option value="Online">Online</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={inputCls}>
            <option value="All">All Statuses</option>
            <option value="Full">Full</option>
            <option value="Partial">Partial</option>
            <option value="Advance">Advance</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Receipt #</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Entity</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap hidden lg:table-cell">Bill No</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap hidden md:table-cell">Collector</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Method</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Amount</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Balance</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {paginated.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-slate-400 dark:text-slate-500">No payment history found for the selected criteria.</td></tr>
              ) : (
                paginated.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#0B1D3E] dark:text-[#4a7ab5] whitespace-nowrap">{p.receiptNo}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{p.date}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{p.business}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap hidden lg:table-cell">{p.billNo}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap hidden md:table-cell">{p.collector}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${p.method === 'Cash' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : p.method === 'Mobile Money' ? 'bg-[#0B1D3E]/10 text-[#0B1D3E] dark:bg-[#4a7ab5]/20 dark:text-[#4a7ab5]' : p.method === 'Bank' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : p.method === 'POS' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400'}`}>
                        {p.method === 'Mobile Money' ? 'MoMo' : p.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${p.status === 'Full' ? 'bg-green-100 text-green-800' : p.status === 'Partial' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white whitespace-nowrap">{fmt(p.amount)}</td>
                    <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${p.balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>{p.balance > 0 ? fmt(p.balance) : '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handlePrintEntity(p.business)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#0B1D3E] dark:hover:text-[#4a7ab5] hover:bg-[#0B1D3E]/10 dark:hover:bg-[#4a7ab5]/20 transition-colors cursor-pointer"
                        title="Print all payments for this entity"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">Showing {showingFrom}–{showingTo} of {filtered.length}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button key={pg} onClick={() => setPage(pg)} className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${pg === safePage ? 'bg-[#0B1D3E] text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{pg}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
