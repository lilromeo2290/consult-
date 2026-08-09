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
import { FEE_CODE_LOOKUP } from '@/lib/fee-code-lookup';
import { BUSINESS_CLASS_CODES } from '@/lib/business-class-codes';
import { CODE_TO_CLASS } from '@/lib/business-class-code-map';
import {
  PROPERTY_CLASS_CODES,
  PROP_CODE_TO_CLASS,
  PROP_CODE_TO_CATEGORY,
} from '@/lib/property-class-code-map';
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
import {
  RENT_CLASS_CODES,
  RENT_CODE_TO_CLASS,
  RENT_CODE_TO_CATEGORY,
} from '@/lib/rent-class-code-map';
import {
  setRateEntry,
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

// ── Per-tab configuration ─────────────────────────────────────────────────
interface TabConfig {
  dbKey: string;
  codes: string[];
  classLabel: string;
  /** Lookup code → { businessClass, category } */
  lookup: Record<string, { businessClass: string; category: string }>;
  /** Code → class name map for Combobox */
  codeToClass: Record<string, string>;
}

// Build a property lookup from the property maps
const propertyLookup: Record<string, { businessClass: string; category: string }> = {};
for (const code of PROPERTY_CLASS_CODES) {
  propertyLookup[code] = {
    businessClass: PROP_CODE_TO_CLASS[code] || '',
    category: PROP_CODE_TO_CATEGORY[code] || '',
  };
}

// Build a fines lookup from the fines maps
const finesLookup: Record<string, { businessClass: string; category: string }> = {};
for (const code of FINE_CLASS_CODES) {
  finesLookup[code] = {
    businessClass: FINE_CODE_TO_CLASS[code] || '',
    category: FINE_CODE_TO_CATEGORY[code] || '',
  };
}

// Build a fees lookup from the fees maps
const feesLookup: Record<string, { businessClass: string; category: string }> = {};
for (const code of FEE_CLASS_CODES) {
  feesLookup[code] = {
    businessClass: FEE_CODE_TO_CLASS[code] || '',
    category: FEE_CODE_TO_CATEGORY[code] || '',
  };
}

// Build a rent lookup from the rent maps
const rentLookup: Record<string, { businessClass: string; category: string }> = {};
for (const code of RENT_CLASS_CODES) {
  rentLookup[code] = {
    businessClass: RENT_CODE_TO_CLASS[code] || '',
    category: RENT_CODE_TO_CATEGORY[code] || '',
  };
}

function getTabConfig(tab: RateTab): TabConfig {
  switch (tab) {
    case 'Business':
      return {
        dbKey: 'rms-rate-overrides',
        codes: BUSINESS_CLASS_CODES,
        classLabel: 'Business Class',
        lookup: FEE_CODE_LOOKUP as unknown as Record<string, { businessClass: string; category: string }>,
        codeToClass: CODE_TO_CLASS,
      };
    case 'Property':
      return {
        dbKey: 'rms-rate-overrides-property',
        codes: PROPERTY_CLASS_CODES,
        classLabel: 'Property Class',
        lookup: propertyLookup,
        codeToClass: PROP_CODE_TO_CLASS,
      };
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
    case 'Rent':
      return {
        dbKey: 'rms-rate-overrides-rent',
        codes: RENT_CLASS_CODES,
        classLabel: 'Rent Type',
        lookup: rentLookup,
        codeToClass: RENT_CODE_TO_CLASS,
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

/** Build rows from a code list + lookup + saved DB data. */
function buildRowsFromData(
  codes: string[],
  lookup: Record<string, { businessClass: string; category: string }>,
  savedData: Record<string, RateEntry>,
): RateRow[] {
  // For tabs with predefined codes: iterate codes
  // For tabs without predefined codes: iterate saved data keys
  const codeSet = new Set(codes);
  const savedKeys = Object.keys(savedData);
  const allCodes = codes.length > 0
    ? codes
    : savedKeys;

  return allCodes.map((code) => {
    const entry = lookup[code];
    const override = savedData[code];
    const amount = override?.amount || 0;
    const ceiling = override?.ceiling || 0;
    return {
      code,
      businessClass: entry?.businessClass || override?.businessClass || savedData[code]?.businessClass || '',
      category: entry?.category || override?.category || savedData[code]?.category || '',
      amount,
      ceiling,
      originalAmount: amount,
      originalCeiling: ceiling,
      selected: false,
    };
  });
}

export function RateConfigPage() {
  const [activeTab, setActiveTab] = useState<RateTab>('Business');
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

  // Keep a ref to rows
  const rowsRef = useRef<RateRow[]>(rows);
  rowsRef.current = rows;

  // Save status
  const [saveStatus, setSaveStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Track unsaved changes
  const hasUnsavedChanges = useMemo(
    () => rows.some((r) => r.amount !== r.originalAmount || r.ceiling !== r.originalCeiling),
    [rows],
  );
  const changedCount = useMemo(
    () => rows.filter((r) => r.amount !== r.originalAmount || r.ceiling !== r.originalCeiling).length,
    [rows],
  );

  // ── Load overrides from DB when tab changes or on mount ────────────────
  const loadTabData = useCallback(async (tab: RateTab) => {
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
      // Also populate in-memory store for Business tab
      if (tab === 'Business') loadOverrides(savedData);
      setOverridesLoaded(true);
      const entryCount = Object.keys(savedData).length;
      if (entryCount > 0) {
        setLoadInfo(`Loaded ${entryCount} saved rate(s)`);
        setTimeout(() => setLoadInfo(''), 3000);
      }
    } catch (err) {
      console.error('Failed to load rate overrides:', err);
      setLoadError('Load failed (network error)');
      const config = getTabConfig(tab);
      setRows(buildRowsFromData(config.codes, config.lookup, {}));
      setOverridesLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, loadTabData]);

  // ── Save overrides to DB ──────────────────────────────────────────────
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
      // Read current DB data
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

  // ── Handlers ────────────────────────────────────────────────────────────
  const tabConfig = getTabConfig(activeTab);
  const hasPredefinedCodes = tabConfig.codes.length > 0;

  const handleCodeSelect = (code: string) => {
    setNewCode(code);
    const cls = tabConfig.codeToClass[code] || '';
    setNewClass(cls);
    const cat = tabConfig.lookup[code]?.category || '';
    setNewCategory(cat);
  };

  const handleAmountEdit = (code: string, val: string) => {
    const num = parseFloat(val) || 0;
    const row = rowsRef.current.find((r) => r.code === code);
    const ceiling = row?.ceiling || 0;
    if (ceiling > 0 && num > ceiling) {
      setTimeout(() => {}, 2000);
    }
    const capped = ceiling > 0 ? Math.min(num, ceiling) : num;
    const newRows = rowsRef.current.map((r) => (r.code === code ? { ...r, amount: capped } : r));
    rowsRef.current = newRows;
    setRows(newRows);
    setRateEntry(code, capped, ceiling);
  };

  const handleCeilingEdit = (code: string, val: string) => {
    const num = parseFloat(val) || 0;
    const row = rowsRef.current.find((r) => r.code === code);
    const amount = row?.amount || 0;
    const capped = num > 0 ? Math.min(amount, num) : amount;
    const newRows = rowsRef.current.map((r) => (r.code === code ? { ...r, ceiling: num, amount: capped } : r));
    rowsRef.current = newRows;
    setRows(newRows);
    setRateEntry(code, capped, num);
  };

  const handleRadio = (code: string) => setRadioCode(code);
  const handleCheck = (code: string) => {
    setRows((prev) => prev.map((r) => (r.code === code ? { ...r, selected: !r.selected } : r)));
  };
  const isMod = (r: RateRow) => r.amount !== r.originalAmount || r.ceiling !== r.originalCeiling;

  const handleAddRate = async () => {
    const trimmedCode = newCode.trim();
    if (!trimmedCode || !newAmount.trim()) return;
    const amt = parseFloat(newAmount) || 0;
    const ceil = parseFloat(newCeiling) || 0;
    const capped = ceil > 0 ? Math.min(amt, ceil) : amt;
    const cls = newClass.trim();
    const cat = newCategory.trim();

    // Add to rows
    const newRows = [...rowsRef.current];
    const existingIdx = newRows.findIndex((r) => r.code === trimmedCode);
    if (existingIdx >= 0) {
      newRows[existingIdx] = { ...newRows[existingIdx], amount: capped, ceiling: ceil, businessClass: cls || newRows[existingIdx].businessClass, category: cat || newRows[existingIdx].category };
    } else {
      newRows.push({ code: trimmedCode, businessClass: cls, category: cat, amount: capped, ceiling: ceil, originalAmount: 0, originalCeiling: 0, selected: false });
    }
    rowsRef.current = newRows;
    setRows(newRows);
    setRateEntry(trimmedCode, capped, ceil);

    // Persist immediately for Add
    const config = getTabConfig(activeTab);
    try {
      const res = await fetch(`/api/rms-data?key=${config.dbKey}&_t=${Date.now()}`, { cache: 'no-store' });
      let existing: Record<string, RateEntry> = {};
      if (res.ok) {
        const json = await res.json();
        if (json.data && typeof json.data === 'object') existing = json.data as Record<string, RateEntry>;
      }
      const entry: RateEntry = { amount: capped, ceiling: ceil };
      if (cls) (entry as Record<string, unknown>).businessClass = cls;
      if (cat) (entry as Record<string, unknown>).category = cat;
      existing[trimmedCode] = entry;
      await fetch('/api/rms-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: config.dbKey, data: existing }),
      });
      // Update originals so it's not marked as dirty
      setRows((prev) => prev.map((r) => r.code === trimmedCode ? { ...r, originalAmount: capped, originalCeiling: ceil } : r));
      setSaveStatus('Rate added and saved');
      toast.success('Successfully saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch { /* best effort */ }

    setNewCode(''); setNewClass(''); setNewCategory(''); setNewAmount(''); setNewCeiling('');
    setShowAddForm(false);
  };

  // ── Import / Export ────────────────────────────────────────────────────
  const handleExportRates = () => {
    const exportData = rows.map((r) => ({ code: r.code, businessClass: r.businessClass, category: r.category, amount: r.amount, ceiling: r.ceiling }));
    exportToExcel(exportData as unknown as Record<string, unknown>[], RATE_FIELDS, `${activeTab}_Rates`);
  };

  const handleImportRates = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importFromExcel<Record<string, unknown>>(file, RATE_FIELDS);
      if (imported.length === 0) { alert('No data found in the file.'); return; }
      let updated = 0;
      const importedEntries: Record<string, RateEntry> = {};
      const newRows = [...rowsRef.current];
      const existingMap = new Map(newRows.map((r) => [r.code, r]));

      for (const item of imported) {
        const code = String(item.code || '').trim();
        if (!code) continue;
        const amt = parseFloat(String(item.amount || '0')) || 0;
        const ceil = parseFloat(String(item.ceiling || '0')) || 0;
        const capped = ceil > 0 ? Math.min(amt, ceil) : amt;
        const cls = String(item.businessClass || '').trim();
        const cat = String(item.category || '').trim();
        const entry: RateEntry = { amount: capped, ceiling: ceil };
        if (cls) (entry as Record<string, unknown>).businessClass = cls;
        if (cat) (entry as Record<string, unknown>).category = cat;
        importedEntries[code] = entry;
        setRateEntry(code, capped, ceil);

        if (existingMap.has(code)) {
          const idx = newRows.findIndex((r) => r.code === code);
          newRows[idx] = { ...newRows[idx], amount: capped, ceiling: ceil, businessClass: cls || newRows[idx].businessClass, category: cat || newRows[idx].category };
        } else {
          newRows.push({ code, businessClass: cls, category: cat, amount: capped, ceiling: ceil, originalAmount: 0, originalCeiling: 0, selected: false });
        }
        updated++;
      }
      rowsRef.current = newRows;
      setRows(newRows);

      // Persist import
      if (Object.keys(importedEntries).length > 0) {
        const config = getTabConfig(activeTab);
        try {
          const res = await fetch(`/api/rms-data?key=${config.dbKey}`);
          if (res.ok) {
            const json = await res.json();
            const existing = (json.data && typeof json.data === 'object') ? json.data as Record<string, RateEntry> : {};
            await fetch('/api/rms-data', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: config.dbKey, data: { ...existing, ...importedEntries } }),
            });
            setRows((prev) => prev.map((r) => importedEntries[r.code] ? { ...r, originalAmount: r.amount, originalCeiling: r.ceiling } : r));
          }
        } catch { /* best effort */ }
      }
      alert(`${updated} rate(s) imported successfully.`);
    } catch {
      alert('Failed to import file.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Filtering / Sorting / Pagination ───────────────────────────────────
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
      {/* Unsaved changes warning */}
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rate Configuration</h1>
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
            placeholder="Search rates..."
          />
          <button onClick={handleExportRates} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm" title="Export to Excel">
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
                      <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value)} className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" placeholder="Enter code (e.g. FINE-001)" />
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
                <tr><td colSpan={7} className="text-center py-16 text-slate-400 dark:text-slate-500">Loading rates...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-slate-400 dark:text-slate-500">{searchQuery ? 'No rates found matching your search.' : `No rates configured for ${activeTab}. Click "Add Rate" to get started.`}</td></tr>
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
