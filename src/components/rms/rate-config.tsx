'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Plus,
  X,
  Download,
  Upload,
} from 'lucide-react';
import { FEE_CODE_LOOKUP } from '@/lib/fee-code-lookup';
import { BUSINESS_CLASS_CODES } from '@/lib/business-class-codes';
import { CODE_TO_CLASS } from '@/lib/business-class-code-map';
import {
  getRateOverride,
  setRateOverride,
  getRateCeiling,
  setRateCeiling,
  setRateEntry,
  getAllOverrides,
  loadOverrides,
  RateEntry,
} from '@/lib/rate-overrides';
import { Combobox } from '@/components/ui/combobox';
import { exportToExcel, importFromExcel } from '@/lib/import-export';

type RateTab = 'Business' | 'Property' | 'Fines' | 'Fees' | 'Rent';
type SortColumn = 'code' | 'class' | 'category' | 'amount' | 'ceiling';
type SortDir = 'asc' | 'desc';

interface RateRow {
  code: string;
  businessClass: string;
  category: string;
  amount: number;
  ceiling: number;
  originalAmount: number;
  originalCeiling: number;
  selected: boolean;
}

const TABS: RateTab[] = ['Business', 'Property', 'Fines', 'Fees', 'Rent'];
const PAGE_SIZE = 25;
const RATE_OVERRIDES_KEY = 'rms-rate-overrides';

// Excel field definitions for Business Rate Import/Export
const RATE_FIELDS: { key: string; label: string }[] = [
  { key: 'code', label: 'Code' },
  { key: 'businessClass', label: 'Business Class' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount' },
  { key: 'ceiling', label: 'Ceiling' },
];

function buildBusinessRows(): RateRow[] {
  return BUSINESS_CLASS_CODES.map((code) => {
    const entry = FEE_CODE_LOOKUP[code];
    return {
      code,
      businessClass: entry ? entry.businessClass : '',
      category: entry ? entry.category : '',
      amount: 0,
      ceiling: 0,
      originalAmount: 0,
      originalCeiling: 0,
      selected: false,
    };
  });
}

export function RateConfigPage() {
  const [activeTab, setActiveTab] = useState<RateTab>('Business');
  const [rows, setRows] = useState<RateRow[]>(buildBusinessRows);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState<SortColumn>('code');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [radioCode, setRadioCode] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newClass, setNewClass] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCeiling, setNewCeiling] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(false);

  // ── Persistence: load overrides from DB on mount ────────────────────────
  const [overridesLoaded, setOverridesLoaded] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/rms-data?key=${RATE_OVERRIDES_KEY}`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (json.data && typeof json.data === 'object' && !cancelled) {
          loadOverrides(json.data as Record<string, RateEntry>);
          setRows((prev) =>
            prev.map((r) => {
              const amt = getRateOverride(r.code);
              const ceil = getRateCeiling(r.code);
              return amt !== undefined || ceil !== undefined
                ? { ...r, amount: amt ?? r.amount, ceiling: ceil ?? r.ceiling, originalAmount: amt ?? r.originalAmount, originalCeiling: ceil ?? r.originalCeiling }
                : r;
            }),
          );
        }
      } catch (err) {
        console.error('Failed to load rate overrides:', err);
      }
      if (!cancelled) setOverridesLoaded(true);
    })();
    return () => { cancelled = true; mountedRef.current = false; };
  }, []);

  // ── Persistence: save overrides to DB immediately ────────────────────────
  const persistOverrides = useCallback(() => {
    if (!mountedRef.current) return;
    const overrides = getAllOverrides();
    fetch('/api/rms-data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: RATE_OVERRIDES_KEY, data: overrides }),
    }).catch((err) => {
      console.error('Failed to save rate overrides:', err);
    });
  }, []);

  // ── Save on unmount so nothing is lost on navigation ───────────────────
  useEffect(() => {
    return () => {
      const overrides = getAllOverrides();
      if (Object.keys(overrides).length > 0) {
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', '/api/rms-data', false); // synchronous
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.send(JSON.stringify({ key: RATE_OVERRIDES_KEY, data: overrides }));
        } catch {}
      }
    };
  }, []);

  // When a code is selected, auto-fill class and category
  const handleCodeSelect = (code: string) => {
    setNewCode(code);
    const cls = CODE_TO_CLASS[code] || '';
    setNewClass(cls);
    const entry = FEE_CODE_LOOKUP[code];
    setNewCategory(entry ? entry.category : '');
  };

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
        case 'code': return a.code.localeCompare(b.code) * dir;
        case 'class': return a.businessClass.localeCompare(b.businessClass) * dir;
        case 'category': return a.category.localeCompare(b.category) * dir;
        case 'amount': return (a.amount - b.amount) * dir;
        case 'ceiling': return (a.ceiling - b.ceiling) * dir;
        default: return 0;
      }
    });
    return data;
  }, [rows, activeTab, searchQuery, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [searchQuery, activeTab]);

  const handleSort = useCallback(
    (col: SortColumn) => {
      if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      else { setSortCol(col); setSortDir('asc'); }
    },
    [sortCol],
  );

  const handleAmountEdit = (code: string, val: string) => {
    const num = parseFloat(val) || 0;
    // Apply ceiling: if ceiling > 0 and amount > ceiling, cap at ceiling
    const row = rows.find((r) => r.code === code);
    const ceiling = row?.ceiling || 0;
    const capped = ceiling > 0 ? Math.min(num, ceiling) : num;
    setRows((prev) => prev.map((r) => (r.code === code ? { ...r, amount: capped } : r)));
    setRateEntry(code, capped, ceiling);
    persistOverrides();
  };

  const handleCeilingEdit = (code: string, val: string) => {
    const num = parseFloat(val) || 0;
    const row = rows.find((r) => r.code === code);
    const amount = row?.amount || 0;
    // Apply ceiling: if ceiling > 0 and amount > ceiling, cap amount
    const capped = num > 0 ? Math.min(amount, num) : amount;
    setRows((prev) => prev.map((r) => (r.code === code ? { ...r, ceiling: num, amount: capped } : r)));
    setRateEntry(code, capped, num);
    persistOverrides();
  };

  const handleRadio = (code: string) => setRadioCode(code);
  const handleCheck = (code: string) => {
    setRows((prev) => prev.map((r) => (r.code === code ? { ...r, selected: !r.selected } : r)));
  };

  const isMod = (r: RateRow) => r.amount !== r.originalAmount || r.ceiling !== r.originalCeiling;

  const handleAddRate = () => {
    const trimmedCode = newCode.trim();
    if (!trimmedCode || !newAmount.trim()) return;
    const amt = parseFloat(newAmount) || 0;
    const ceil = parseFloat(newCeiling) || 0;
    const capped = ceil > 0 ? Math.min(amt, ceil) : amt;
    setRateEntry(trimmedCode, capped, ceil);
    setRows((prev) => prev.map((r) => (r.code === trimmedCode ? { ...r, amount: capped, ceiling: ceil } : r)));
    persistOverrides();
    setNewCode('');
    setNewClass('');
    setNewCategory('');
    setNewAmount('');
    setNewCeiling('');
    setShowAddForm(false);
  };

  // ── Import / Export ───────────────────────────────────────────────────────
  const handleExportRates = () => {
    const exportData = rows.map((r) => ({
      code: r.code,
      businessClass: r.businessClass,
      category: r.category,
      amount: r.amount,
      ceiling: r.ceiling,
    }));
    exportToExcel(exportData as unknown as Record<string, unknown>[], RATE_FIELDS, 'Business_Rates');
  };

  const handleImportRates = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importFromExcel<Record<string, unknown>>(file, RATE_FIELDS);
      if (imported.length === 0) { alert('No data found in the file.'); return; }
      let updated = 0;
      const importedOverrides: string[] = [];
      setRows((prev) => {
        const newRowMap = new Map(prev.map((r) => [r.code, r]));
        for (const item of imported) {
          const code = String(item.code || '').trim();
          if (!code || !newRowMap.has(code)) continue;
          const amt = parseFloat(String(item.amount || '0')) || 0;
          const ceil = parseFloat(String(item.ceiling || '0')) || 0;
          const capped = ceil > 0 ? Math.min(amt, ceil) : amt;
          const existing = newRowMap.get(code)!;
          newRowMap.set(code, {
            ...existing,
            amount: capped,
            ceiling: ceil,
          });
          setRateEntry(code, capped, ceil);
          importedOverrides.push(code);
          updated++;
        }
        return Array.from(newRowMap.values());
      });
      if (importedOverrides.length > 0) persistOverrides();
      alert(`${updated} rate(s) imported successfully.`);
    } catch (err) {
      alert('Failed to import file. Please ensure it is a valid Excel file exported from this system.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const SortIcon = ({ col }: { col: SortColumn }) => {
    if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 inline ml-0.5 opacity-40" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline ml-0.5" />
      : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  return (
    <div className="space-y-0">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
        Rate Configuration
      </h1>

      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-t-lg p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 text-sm font-semibold transition-colors rounded-md ${
              activeTab === tab
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 px-4 py-2 border border-t-0 border-slate-200 dark:border-slate-700">
        <div />
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Search:
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            placeholder="Search rates..."
          />
          {activeTab === 'Business' && (
            <>
              {/* Export */}
              <button
                onClick={handleExportRates}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                title="Export to Excel"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              {/* Import */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                title="Import from Excel"
              >
                <Upload className="w-3.5 h-3.5" />
                Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportRates}
                className="hidden"
              />
              {/* Add Rate */}
              <div className="relative ml-2">
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Rate
                </button>
                {showAddForm && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">New Rate Entry</h3>
                      <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">Business Class Code</label>
                        <Combobox
                          name="addRateCode"
                          value={newCode}
                          onChange={(e) => handleCodeSelect(e.target.value)}
                          options={BUSINESS_CLASS_CODES.map((c) => ({ value: c, label: c }))}
                          placeholder="Select or search code..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">Business Class</label>
                        <input
                          type="text"
                          value={newClass}
                          readOnly
                          className="w-full rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 outline-none"
                          placeholder="Auto-filled from code"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">Category</label>
                        <input
                          type="text"
                          value={newCategory}
                          readOnly
                          className="w-full rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 outline-none"
                          placeholder="Auto-filled from code"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">Amount</label>
                        <input
                          type="number"
                          value={newAmount}
                          onChange={(e) => setNewAmount(e.target.value)}
                          className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">Ceiling</label>
                        <input
                          type="number"
                          value={newCeiling}
                          onChange={(e) => setNewCeiling(e.target.value)}
                          className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                          placeholder="0.00 (max limit for amount)"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <button
                        onClick={handleAddRate}
                        disabled={!newCode.trim() || !newAmount.trim()}
                        className="w-full mt-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Add Entry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="border border-t-0 border-slate-200 dark:border-slate-700 rounded-b-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <th className="w-10 px-1 py-2.5" />
                <th className="w-10 px-1 py-2.5" />
                <th onClick={() => handleSort('code')} className="px-3 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap">
                  Code <SortIcon col="code" />
                </th>
                <th onClick={() => handleSort('class')} className="px-3 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap">
                  Class <SortIcon col="class" />
                </th>
                <th onClick={() => handleSort('category')} className="px-3 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap">
                  Category <SortIcon col="category" />
                </th>
                <th onClick={() => handleSort('amount')} className="px-3 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap">
                  Amount <SortIcon col="amount" />
                </th>
                <th onClick={() => handleSort('ceiling')} className="px-3 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap">
                  Ceiling <SortIcon col="ceiling" />
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {activeTab !== 'Business' ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400 dark:text-slate-500">
                    No rates loaded for {activeTab}.
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400 dark:text-slate-500">
                    No rates found matching your search.
                  </td>
                </tr>
              ) : (
                paged.map((row, idx) => (
                  <tr key={row.code} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                    <td className="px-1 py-1.5 text-center">
                      <input type="radio" name="rateRadio" checked={radioCode === row.code} onChange={() => handleRadio(row.code)} className="accent-emerald-600" />
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      <input type="checkbox" checked={row.selected} onChange={() => handleCheck(row.code)} className="accent-emerald-600" />
                    </td>
                    <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200 font-mono whitespace-nowrap">{row.code}</td>
                    <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200 max-w-[260px] truncate">{row.businessClass}</td>
                    <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200 max-w-[300px] truncate">{row.category}</td>
                    <td className={`px-1 py-0.5 ${isMod(row) ? 'bg-red-100 dark:bg-red-900/30' : ''}`}>
                      <input type="number" value={row.amount || ''} onChange={(e) => handleAmountEdit(row.code, e.target.value)} className="w-full text-right px-2 py-1.5 bg-transparent border-0 outline-none text-slate-800 dark:text-slate-200 font-mono text-xs focus:ring-1 focus:ring-inset focus:ring-emerald-500 rounded" step="0.01" min="0" />
                    </td>
                    <td className={`px-1 py-0.5 ${isMod(row) ? 'bg-red-100 dark:bg-red-900/30' : ''}`}>
                      <input type="number" value={row.ceiling || ''} onChange={(e) => handleCeilingEdit(row.code, e.target.value)} className="w-full text-right px-2 py-1.5 bg-transparent border-0 outline-none text-slate-800 dark:text-slate-200 font-mono text-xs focus:ring-1 focus:ring-inset focus:ring-emerald-500 rounded" step="0.01" min="0" placeholder="0" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
            <span>{'Showing '}{(safePage - 1) * PAGE_SIZE + 1}{' – '}{Math.min(safePage * PAGE_SIZE, filtered.length)}{' of '}{filtered.length}</span>
            <div className="flex items-center gap-1">
              <button disabled={safePage <= 1} onClick={() => setPage(1)} className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors">{'«'}</button>
              <button disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors">{'‹'}</button>
              <span className="px-2">Page {safePage} of {totalPages}</span>
              <button disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors">{'›'}</button>
              <button disabled={safePage >= totalPages} onClick={() => setPage(totalPages)} className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors">{'»'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
