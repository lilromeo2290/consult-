'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Plus,
  X,
  Download,
  Upload,
  Save,
  AlertTriangle,
} from 'lucide-react';
import {
  FINE_CLASS_CODES,
  FINE_CODE_TO_CLASS,
  FINE_CODE_TO_CATEGORY,
} from '@/lib/fines-class-code-map';
import {
  FEE_CLASS_CODES,
  FEE_CODE_TO_CLASS,
  FEE_CODE_TO_CATEGORY,
} from '@/lib/fees-class-code-map';
import type { RateEntry } from '@/lib/rate-overrides';
import { Combobox } from '@/components/ui/combobox';
import { exportToExcel, importFromExcel } from '@/lib/import-export';

type PenaltyTab = 'Fines' | 'Fees';
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

const TABS: PenaltyTab[] = ['Fines', 'Fees'];
const PAGE_SIZE = 25;

// ── Lookups ─────────────────────────────────────────────────────────────

const finesLookup: Record<string, { businessClass: string; category: string }> = {};
for (const code of FINE_CLASS_CODES) {
  finesLookup[code] = {
    businessClass: FINE_CODE_TO_CLASS[code] || '',
    category: FINE_CODE_TO_CATEGORY[code] || '',
  };
}

const feesLookup: Record<string, { businessClass: string; category: string }> = {};
for (const code of FEE_CLASS_CODES) {
  feesLookup[code] = {
    businessClass: FEE_CODE_TO_CLASS[code] || '',
    category: FEE_CODE_TO_CATEGORY[code] || '',
  };
}

function getTabConfig(tab: PenaltyTab) {
  switch (tab) {
    case 'Fines':
      return {
        dbKey: 'rms-rate-overrides-fines',
        codes: FINE_CLASS_CODES,
        classLabel: 'Fine Type',
        lookup: finesLookup,
        codeToClass: FINE_CODE_TO_CLASS,
      };
    case 'Fees':
      return {
        dbKey: 'rms-rate-overrides-fees',
        codes: FEE_CLASS_CODES,
        classLabel: 'Fee Type',
        lookup: feesLookup,
        codeToClass: FEE_CODE_TO_CLASS,
      };
  }
}

// Excel field definitions
const RATE_FIELDS: { key: string; label: string }[] = [
  { key: 'code', label: 'Code' },
  { key: 'businessClass', label: 'Class' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount' },
  { key: 'ceiling', label: 'Ceiling' },
];

function buildRowsFromData(
  codes: string[],
  lookup: Record<string, { businessClass: string; category: string }>,
  savedData: Record<string, RateEntry>,
): RateRow[] {
  const allCodes = codes.length > 0 ? codes : Object.keys(savedData);
  return allCodes.map((code) => {
    const entry = lookup[code];
    const override = savedData[code];
    const amount = override?.amount ?? 0;
    const ceiling = override?.ceiling ?? 0;
    return {
      code,
      businessClass: entry?.businessClass || override?.businessClass || '',
      category: entry?.category || override?.category || '',
      amount,
      ceiling,
      originalAmount: amount,
      originalCeiling: ceiling,
      selected: false,
    };
  });
}

export function PenaltiesPage() {
  const [activeTab, setActiveTab] = useState<PenaltyTab>('Fines');
  const [rows, setRows] = useState<RateRow[]>([]);
  const [overridesLoaded, setOverridesLoaded] = useState(false);
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

  const [loadError, setLoadError] = useState('');
  const [loadInfo, setLoadInfo] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const rowsRef = useRef<RateRow[]>(rows);
  rowsRef.current = rows;

  const hasUnsavedChanges = useMemo(
    () => rows.some((r) => r.amount !== r.originalAmount || r.ceiling !== r.originalCeiling),
    [rows],
  );
  const changedCount = useMemo(
    () => rows.filter((r) => r.amount !== r.originalAmount || r.ceiling !== r.originalCeiling).length,
    [rows],
  );

  const tabConfig = getTabConfig(activeTab);
  const hasPredefinedCodes = tabConfig.codes.length > 0;

  // ── Load data ────────────────────────────────────────────────────────────
  const loadTabData = useCallback(async (tab: PenaltyTab) => {
    setOverridesLoaded(false);
    setLoadError('');
    setLoadInfo('');
    setSearchQuery('');
    setPage(1);
    setRadioCode(null);

    const config = getTabConfig(tab);
    try {
      const res = await fetch(`/api/rms-data?key=${config.dbKey}&_t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) {
        setLoadError(`Load failed (HTTP ${res.status})`);
        return;
      }
      const json = await res.json();
      const savedData = (json.data && typeof json.data === 'object')
        ? json.data as Record<string, RateEntry>
        : {};

      const built = buildRowsFromData(config.codes, config.lookup, savedData);
      setRows(built);
      setOverridesLoaded(true);
      const entryCount = Object.keys(savedData).length;
      if (entryCount > 0) {
        setLoadInfo(`Loaded ${entryCount} saved rate(s)`);
        setTimeout(() => setLoadInfo(''), 3000);
      }
    } catch (err) {
      console.error('Failed to load:', err);
      setLoadError('Load failed (network error)');
      const config = getTabConfig(tab);
      setRows(buildRowsFromData(config.codes, config.lookup, {}));
      setOverridesLoaded(true);
    }
  }, []);

  useEffect(() => { loadTabData(activeTab); }, [activeTab, loadTabData]);

  // ── Save data ────────────────────────────────────────────────────────────
  const persistOverrides = useCallback(async () => {
    const source = rowsRef.current;
    const config = getTabConfig(activeTab);
    const changed: Record<string, RateEntry> = {};
    for (const r of source) {
      if (r.amount > 0 || r.ceiling > 0) {
        changed[r.code] = {
          amount: r.amount,
          ceiling: r.ceiling,
          ...(r.businessClass ? { businessClass: r.businessClass } : {}),
          ...(r.category ? { category: r.category } : {}),
        };
      }
    }
    if (Object.keys(changed).length === 0) return;
    const count = Object.keys(changed).length;
    setIsSaving(true);
    try {
      const getRes = await fetch(`/api/rms-data?key=${config.dbKey}&_t=${Date.now()}`, { cache: 'no-store' });
      let existing: Record<string, RateEntry> = {};
      if (getRes.ok) {
        const getJson = await getRes.json();
        if (getJson.data && typeof getJson.data === 'object') {
          existing = getJson.data as Record<string, RateEntry>;
        }
      }
      const merged = { ...existing, ...changed };
      const putRes = await fetch('/api/rms-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: config.dbKey, data: merged }),
      });
      if (putRes.ok) {
        setRows((prev) => prev.map((r) => ({ ...r, originalAmount: r.amount, originalCeiling: r.ceiling })));
        setSaveStatus(`Saved ${count} rate(s) to database`);
        toast.success('Successfully saved');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus(`Save failed (${putRes.status})`);
      }
    } catch (err) {
      setSaveStatus('Save failed (network)');
      console.error('Failed to save:', err);
    } finally {
      setIsSaving(false);
    }
  }, [activeTab]);

  // ── Row handlers ─────────────────────────────────────────────────────────
  const handleAmountEdit = useCallback((code: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.code === code ? { ...r, amount: parseFloat(value) || 0 } : r)));
  }, []);

  const handleCeilingEdit = useCallback((code: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.code === code ? { ...r, ceiling: parseFloat(value) || 0 } : r)));
  }, []);

  const handleRadio = useCallback((code: string) => setRadioCode(code), []);

  const handleCheck = useCallback((code: string) => {
    setRows((prev) => prev.map((r) => (r.code === code ? { ...r, selected: !r.selected } : r)));
  }, []);

  const handleDeleteSelected = useCallback(() => {
    setRows((prev) => {
      const selected = new Set(prev.filter((r) => r.selected).map((r) => r.code));
      return prev.length === selected.size ? prev : prev.map((r) => selected.has(r.code) ? { ...r, amount: 0, ceiling: 0 } : r);
    });
    toast.success('Selected amounts cleared');
  }, []);

  const handleCodeSelect = useCallback((code: string) => {
    setNewCode(code);
    const cls = tabConfig.codeToClass[code] || '';
    setNewClass(cls);
    const cat = tabConfig.lookup[code]?.category || '';
    setNewCategory(cat);
  }, [tabConfig]);

  const handleAddRate = useCallback(() => {
    if (!newCode.trim()) return;
    setRows((prev) => {
      if (prev.some((r) => r.code === newCode)) return prev;
      return [...prev, {
        code: newCode,
        businessClass: newClass,
        category: newCategory,
        amount: parseFloat(newAmount) || 0,
        ceiling: parseFloat(newCeiling) || 0,
        originalAmount: 0,
        originalCeiling: 0,
        selected: false,
      }];
    });
    setNewCode(''); setNewClass(''); setNewCategory(''); setNewAmount(''); setNewCeiling('');
    setShowAddForm(false);
    toast.success('Rate entry added');
  }, [newCode, newClass, newCategory, newAmount, newCeiling]);

  const handleExportRates = useCallback(() => {
    const data = rows.map((r) => ({ code: r.code, businessClass: r.businessClass, category: r.category, amount: r.amount, ceiling: r.ceiling }));
    exportToExcel(data, RATE_FIELDS, `penalties-${activeTab.toLowerCase()}`);
    toast.success('Exported to Excel');
  }, [rows, activeTab]);

  const handleImportRates = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importFromExcel<RateRow>(file, RATE_FIELDS).then((imported) => {
      if (!imported || imported.length === 0) return;
      setRows((prev) => {
        const existing = new Set(prev.map((r) => r.code));
        const newRows = imported.filter((r) => !existing.has(r.code)).map((r) => ({
          ...r, originalAmount: r.amount, originalCeiling: r.ceiling, selected: false,
        }));
        return [...prev, ...newRows];
      });
      toast.success(`Imported ${imported.length} row(s)`);
    }).catch(() => toast.error('Import failed'));
    e.target.value = '';
  }, []);

  const isMod = useCallback((r: RateRow) => r.amount !== r.originalAmount || r.ceiling !== r.originalCeiling, []);

  // ── Filtering / Sorting / Pagination ─────────────────────────────────────
  const filtered = useMemo(() => {
    let data = rows;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((r) => r.code.toLowerCase().includes(q) || r.businessClass.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
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
  }, [rows, searchQuery, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [searchQuery]);

  const handleSort = useCallback((col: SortColumn) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  }, [sortCol]);

  const SortIcon = ({ col }: { col: SortColumn }) => {
    if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 inline ml-0.5 opacity-40" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0">
      {hasUnsavedChanges && (
        <div className="flex items-center gap-2 px-4 py-2.5 mb-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/40">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
            You have {changedCount} unsaved change{changedCount !== 1 ? 's' : ''}. Click &quot;Save Changes&quot; to permanently save to the database.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Penalties</h1>
          {saveStatus && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded ${saveStatus.startsWith('Saved') || saveStatus.startsWith('Rate') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{saveStatus}</span>
          )}
          {loadInfo && <span className="text-xs font-medium px-2.5 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{loadInfo}</span>}
          {loadError && <span className="text-xs font-medium px-2.5 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{loadError}</span>}
        </div>
        <button
          onClick={persistOverrides}
          disabled={!hasUnsavedChanges || isSaving}
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg transition-all shadow-sm ${
            hasUnsavedChanges && !isSaving
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.97] shadow-emerald-200 dark:shadow-emerald-900/40'
              : 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
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

      {/* Toolbar */}
      <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 px-4 py-2 border border-t-0 border-slate-200 dark:border-slate-700">
        <div />
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Search:</label>
          <input
            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            placeholder="Search penalties..."
          />\n          <button onClick={handleExportRates} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm" title="Export to Excel">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm" title="Import from Excel">
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportRates} className="hidden" />
          <div className="relative ml-2">
            <button onClick={() => setShowAddForm(!showAddForm)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm">
              <Plus className="w-3.5 h-3.5" /> Add Rate
            </button>
            {showAddForm && (
              <div className="absolute right-0 top-full mt-1 z-50 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">New Rate Entry</h3>
                  <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">Code</label>
                    {hasPredefinedCodes ? (
                      <Combobox name="addRateCode" value={newCode} onChange={(e) => handleCodeSelect(e.target.value)} options={tabConfig.codes.map((c) => ({ value: c, label: c }))} placeholder="Select or search code..." />
                    ) : (
                      <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value)} className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" placeholder="Enter code" />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">{tabConfig.classLabel}</label>
                    {hasPredefinedCodes ? (
                      <input type="text" value={newClass} readOnly className="w-full rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 outline-none" placeholder="Auto-filled from code" />
                    ) : (
                      <input type="text" value={newClass} onChange={(e) => setNewClass(e.target.value)} className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" placeholder="Enter class name" />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">Category</label>
                    {hasPredefinedCodes ? (
                      <input type="text" value={newCategory} readOnly className="w-full rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 outline-none" placeholder="Auto-filled from code" />
                    ) : (
                      <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" placeholder="Enter category" />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">Amount</label>
                    <input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" placeholder="0.00" step="0.01" min="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">Ceiling</label>
                    <input type="number" value={newCeiling} onChange={(e) => setNewCeiling(e.target.value)} className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" placeholder="0.00 (max limit)" step="0.01" min="0" />
                  </div>
                  <button onClick={handleAddRate} disabled={!newCode.trim() || !newAmount.trim()} className="w-full mt-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Add Entry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-t-0 border-slate-200 dark:border-slate-700 rounded-b-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <th className="w-10 px-1 py-2.5" />
                <th className="w-10 px-1 py-2.5" />
                <th onClick={() => handleSort('code')} className="px-3 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap">Code <SortIcon col="code" /></th>
                <th onClick={() => handleSort('class')} className="px-3 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap">Class <SortIcon col="class" /></th>
                <th onClick={() => handleSort('category')} className="px-3 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap">Category <SortIcon col="category" /></th>
                <th onClick={() => handleSort('amount')} className="px-3 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap">Amount <SortIcon col="amount" /></th>
                <th onClick={() => handleSort('ceiling')} className="px-3 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap">Ceiling <SortIcon col="ceiling" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {!overridesLoaded ? (
                <tr><td colSpan={7} className="text-center py-16 text-slate-400 dark:text-slate-500">Loading penalties...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-slate-400 dark:text-slate-500">{searchQuery ? 'No penalties found matching your search.' : `No rates configured for ${activeTab}. Click "Add Rate" to get started.`}</td></tr>
              ) : (
                paged.map((row, idx) => (
                  <tr key={row.code} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                    <td className="px-1 py-1.5 text-center"><input type="radio" name="rateRadio" checked={radioCode === row.code} onChange={() => handleRadio(row.code)} className="accent-emerald-600" /></td>
                    <td className="px-1 py-1.5 text-center"><input type="checkbox" checked={row.selected} onChange={() => handleCheck(row.code)} className="accent-emerald-600" /></td>
                    <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200 font-mono whitespace-nowrap">{row.code}</td>
                    <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200 max-w-[260px] truncate">{row.businessClass}</td>
                    <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200 max-w-[300px] truncate">{row.category}</td>
                    <td className={`px-1 py-0.5 ${isMod(row) ? 'bg-red-100 dark:bg-red-900/30' : ''}`}>
                      <input type="number" inputMode="decimal" value={row.amount || ''} onChange={(e) => handleAmountEdit(row.code, e.target.value)} className="w-full text-right px-2 py-1.5 bg-transparent border-0 outline-none font-mono text-xs text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-inset focus:ring-emerald-500 rounded" step="0.01" min="0" />
                    </td>
                    <td className={`px-1 py-0.5 ${isMod(row) ? 'bg-red-100 dark:bg-red-900/30' : ''}`}>
                      <input type="number" inputMode="decimal" value={row.ceiling || ''} onChange={(e) => handleCeilingEdit(row.code, e.target.value)} className="w-full text-right px-2 py-1.5 bg-transparent border-0 outline-none font-mono text-xs text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-inset focus:ring-emerald-500 rounded" step="0.01" min="0" placeholder="0" />
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
