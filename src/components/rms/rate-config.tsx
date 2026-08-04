'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Download,
  RefreshCw,
  Save,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from 'lucide-react';
import { FEE_CODE_LOOKUP, FeeCodeEntry } from '@/lib/fee-code-lookup';

// ─── Types ───────────────────────────────────────────────────────────────────

type RateTab = 'Business' | 'Property' | 'Fines' | 'Fees' | 'Rent';

type SortColumn = 'code' | 'class' | 'category' | 'amount';
type SortDir = 'asc' | 'desc';

interface RateRow {
  code: string;
  businessClass: string;
  category: string;
  amount: number;
  originalAmount: number;
  selected: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS: RateTab[] = ['Business', 'Property', 'Fines', 'Fees', 'Rent'];
const PAGE_SIZE = 25;

function buildBusinessRows(): RateRow[] {
  return Object.entries(FEE_CODE_LOOKUP).map(([code, entry]: [string, FeeCodeEntry]) => ({
    code,
    businessClass: entry.businessClass,
    category: entry.category,
    amount: entry.amount,
    originalAmount: entry.amount,
    selected: false,
  }));
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RateConfigPage() {
  const [activeTab, setActiveTab] = useState<RateTab>('Business');
  const [rows, setRows] = useState<RateRow[]>(buildBusinessRows);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState<SortColumn>('code');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [radioCode, setRadioCode] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const saveRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (saveRef.current && !saveRef.current.contains(e.target as Node)) setSaveOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Filtering + Sorting + Pagination ─────────────────────────────────────

  const filtered = useMemo(() => {
    let data = activeTab === 'Business' ? rows : [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.businessClass.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q),
      );
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    data = [...data].sort((a, b) => {
      switch (sortCol) {
        case 'code':
          return a.code.localeCompare(b.code) * dir;
        case 'class':
          return a.businessClass.localeCompare(b.businessClass) * dir;
        case 'category':
          return a.category.localeCompare(b.category) * dir;
        case 'amount':
          return (a.amount - b.amount) * dir;
        default:
          return 0;
      }
    });
    return data;
  }, [rows, activeTab, searchQuery, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset page when search/tab changes
  useEffect(() => { setPage(1); }, [searchQuery, activeTab]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleSort = useCallback(
    (col: SortColumn) => {
      if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      else { setSortCol(col); setSortDir('asc'); }
    },
    [sortCol],
  );

  const handleAmountEdit = (code: string, val: string) => {
    const num = parseFloat(val) || 0;
    setRows((prev) => prev.map((r) => (r.code === code ? { ...r, amount: num } : r)));
  };

  const handleRadio = (code: string) => setRadioCode(code);
  const handleCheck = (code: string) => {
    setRows((prev) => prev.map((r) => (r.code === code ? { ...r, selected: !r.selected } : r)));
  };

  const modifiedCount = rows.filter((r) => r.amount !== r.originalAmount).length;
  const isMod = (r: RateRow) => r.amount !== r.originalAmount;

  // ── Sort icon helper ────────────────────────────────────────────────────

  const SortIcon = ({ col }: { col: SortColumn }) => {
    if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 inline ml-0.5 opacity-40" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 inline ml-0.5" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-0.5" />
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-0">
      {/* ── Page Title ───────────────────────────────────────────────────── */}
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
        Rate Configuration
      </h1>

      {/* ── Year Header Bar ─────────────────────────────────────────────── */}
      <div className="bg-blue-700 text-white text-center py-2 font-bold text-base rounded-t-lg">
        {new Date().getFullYear()}
      </div>

      {/* ── Tab Navigation Bar ──────────────────────────────────────────── */}
      <div className="flex bg-gradient-to-r from-amber-500 to-yellow-500">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === tab
                ? 'bg-white text-amber-700 border-amber-500'
                : 'text-blue-900 border-transparent hover:bg-white/30'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 border border-t-0 border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export */}
          <button className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium px-3 py-2 rounded transition-colors">
            <Download className="w-3.5 h-3.5" />
            Export
            <ChevronDown className="w-3 h-3" />
          </button>

          {/* Reload */}
          <button className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium px-3 py-2 rounded transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            Reload rates from database
          </button>

          {/* Save as new rates */}
          <div className="relative" ref={saveRef}>
            <button
              onClick={() => setSaveOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium px-3 py-2 rounded transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save as new rates
              <ChevronDown className="w-3 h-3" />
            </button>
            {saveOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded shadow-lg z-20 min-w-[180px]">
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors"
                  onClick={() => setSaveOpen(false)}
                >
                  For next year
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors"
                  onClick={() => setSaveOpen(false)}
                >
                  For current year
                </button>
              </div>
            )}
          </div>

          {modifiedCount > 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              {modifiedCount} unsaved change{modifiedCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Search:
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
            placeholder="Search rates..."
          />
        </div>
      </div>

      {/* ── Data Table ──────────────────────────────────────────────────── */}
      <div className="border border-t-0 border-slate-200 dark:border-slate-700 rounded-b-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            {/* Header */}
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <th className="w-10 px-1 py-2.5" />
                <th className="w-10 px-1 py-2.5" />
                <th
                  onClick={() => handleSort('code')}
                  className="px-3 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  Code <SortIcon col="code" />
                </th>
                <th
                  onClick={() => handleSort('class')}
                  className="px-3 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  Class <SortIcon col="class" />
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className="px-3 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  Category <SortIcon col="category" />
                </th>
                <th
                  onClick={() => handleSort('amount')}
                  className="px-3 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  Amount <SortIcon col="amount" />
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {activeTab !== 'Business' ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-16 text-slate-400 dark:text-slate-500"
                  >
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No rates loaded for {activeTab}. Click &quot;Reload rates from database&quot; to load.
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-16 text-slate-400 dark:text-slate-500"
                  >
                    No rates found matching your search.
                  </td>
                </tr>
              ) : (
                paged.map((row, idx) => (
                  <tr
                    key={row.code}
                    className={
                      idx % 2 === 0
                        ? 'bg-white dark:bg-slate-900'
                        : 'bg-slate-50 dark:bg-slate-800/40'
                    }
                  >
                    {/* Radio */}
                    <td className="px-1 py-1.5 text-center">
                      <input
                        type="radio"
                        name="rateRadio"
                        checked={radioCode === row.code}
                        onChange={() => handleRadio(row.code)}
                        className="accent-blue-600"
                      />
                    </td>
                    {/* Checkbox */}
                    <td className="px-1 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => handleCheck(row.code)}
                        className="accent-blue-600"
                      />
                    </td>
                    {/* Code */}
                    <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200 font-mono whitespace-nowrap">
                      {row.code}
                    </td>
                    {/* Class */}
                    <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200 max-w-[260px] truncate">
                      {row.businessClass}
                    </td>
                    {/* Category */}
                    <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200 max-w-[300px] truncate">
                      {row.category}
                    </td>
                    {/* Amount (editable, pink if modified) */}
                    <td
                      className={`px-1 py-0.5 ${
                        isMod(row)
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : ''
                      }`}
                    >
                      <input
                        type="number"
                        value={row.amount || ''}
                        onChange={(e) => handleAmountEdit(row.code, e.target.value)}
                        className="w-full text-right px-2 py-1.5 bg-transparent border-0 outline-none text-slate-800 dark:text-slate-200 font-mono text-xs focus:ring-1 focus:ring-inset focus:ring-amber-500 rounded"
                        step="0.01"
                        min="0"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
            <span>
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of{' '}
              {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={safePage <= 1}
                onClick={() => setPage(1)}
                className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                «
              </button>
              <button
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                ‹
              </button>
              <span className="px-2">
                Page {safePage} of {totalPages}
              </span>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                ›
              </button>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage(totalPages)}
                className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
