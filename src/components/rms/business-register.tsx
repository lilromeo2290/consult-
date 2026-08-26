'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Building2,
  MapPin,
  User,
  Save,
  Crosshair,
  Loader2,
  X,
  Download,
  Upload,
  Briefcase,
} from 'lucide-react';
import { exportToExcel, importFromExcel, BUSINESS_FIELDS } from '@/lib/import-export';
import { LOCALITIES, LOCALITY_AREA_CODE_MAP } from '@/lib/localities';
import { BUSINESS_REVENUE_CODES, BIZ_CODE_TO_DESC, BIZ_DESC_TO_CODE } from '@/lib/business-revenue-codes';
import {
  CLASS_TO_FIRST_CODE,
  CLASS_TO_CODES,
  CODE_TO_CLASS,
} from '@/lib/business-class-code-map';
import { CODE_TO_CATEGORY } from '@/lib/business-code-to-category';
import { BUSINESS_CLASS_CODES } from '@/lib/business-class-codes';
import { Combobox } from '@/components/ui/combobox';
import { AutoSuggestInput } from '@/components/ui/auto-suggest-input';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Business {
  regNumber: string;
  // A. Business Location
  locality: string;
  areaCode: string;
  streetName: string;
  houseNo: string;
  ghanaPostGPS: string;
  latitude: string;
  longitude: string;
  landmark: string;
  // B. Business Information
  daAssignmentNo: string;
  businessUniqueNumber: string;
  businessCertNo: string;
  name: string;
  revenueCode: string;
  revenueDescription: string;
  businessClassCode: string;
  businessClassDesc: string;
  category: string;
  amount: string;
  employees: string;
  dateRegistered: string;
  status: string;
  yearEstablished: string;
  // C. Owner Information
  owner: string;
  ghanaCard: string;
  phone: string;
  email: string;
  ownerTin: string;
  comments: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockBusinesses: Business[] = [];

// ─── Constants ──────────────────────────────────────────────────────────────

const businessStatuses = ['All', 'Active', 'Inactive'];
const businessTypes = ['All'];

// ─── Business Register Component ───────────────────────────────────────

const _BIZ_REG_VERSION = '2.0';

export function BusinessRegisterPage() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingRegNumber, setEditingRegNumber] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [businesses, setBusinesses] = useSyncedStorage<Business[]>('rms-business-register', mockBusinesses);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 10;

  // ── Import / Export ───────────────────────────────────────────────────────
  const handleExport = () => {
    if (businesses.length === 0) { alert('No businesses to export.'); return; }
    exportToExcel(businesses as unknown as Record<string, unknown>[], BUSINESS_FIELDS, 'Businesses');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importFromExcel<Business>(file, BUSINESS_FIELDS);
      if (imported.length === 0) { alert('No data found in the file.'); return; }
      const existing = new Map(businesses.map((b) => [b.regNumber, b]));
      for (const item of imported) {
        const key = item.regNumber || `BIZ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        item.regNumber = key;
        existing.set(key, item);
      }
      setBusinesses(Array.from(existing.values()));
      alert(`${imported.length} business(es) imported successfully.`);
    } catch (err) {
      alert('Failed to import file. Please ensure it is a valid Excel file exported from this system.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Auto-generate functions ───────────────────────────────────────────────
  const generateBusinessUniqueNumber = (areaCode?: string) => {
    const nextNum = businesses.length + 1;
    const prefix = areaCode || 'KpMA/KZC/ABX';
    return `${prefix}/BP/${String(nextNum).padStart(4, '0')}`;
  };

  const generateBusinessCertNo = () => {
    const nextNum = businesses.length + 1;
    return `GCR-${String(nextNum).padStart(4, '0')}`;
  };

  const generateDaAssignmentNo = () => {
    const yearSuffix = String(new Date().getFullYear()).slice(-2);
    const nextNum = businesses.length + 1;
    return `KpMA-${yearSuffix}-${String(nextNum).padStart(4, '0')}/BP`;
  };

  // ── Form State ───────────────────────────────────────────────────────────
  const defaultForm: Omit<Business, 'regNumber'> & { regNumber?: string } = {
    regNumber: '',
    // A. Business Location
    locality: '',
    areaCode: '',
    streetName: '',
    houseNo: '',
    ghanaPostGPS: '',
    latitude: '',
    longitude: '',
    landmark: '',
    // B. Business Information
    daAssignmentNo: '',
    businessUniqueNumber: '',
    businessCertNo: '',
    name: '',
    revenueCode: '',
    revenueDescription: '',
    businessClassCode: '',
    businessClassDesc: '',
    category: '',
    amount: '',
    employees: '',
    dateRegistered: '',
    status: 'Active',
    yearEstablished: '',
    // C. Owner Information
    owner: '',
    ghanaCard: '',
    phone: '',
    email: '',
    ownerTin: '',
    comments: '',
  };

  const [form, setForm] = useState({ ...defaultForm });
  const [locating, setLocating] = useState(false);

  // ── Business Revenue Code/Description Search ───────────────────────────
  const bizRevenueCodeRef = useRef<HTMLDivElement>(null);
  const bizRevenueDescRef = useRef<HTMLDivElement>(null);
  const [bizRevenueCodeSearch, setBizRevenueCodeSearch] = useState('');
  const [bizRevenueDescSearch, setBizRevenueDescSearch] = useState('');
  const [bizRevenueCodeShowDropdown, setBizRevenueCodeShowDropdown] = useState(false);
  const [bizRevenueDescShowDropdown, setBizRevenueDescShowDropdown] = useState(false);

  const bizRevenueCodeFiltered = bizRevenueCodeSearch
    ? BUSINESS_REVENUE_CODES.filter(
        (item) =>
          item.code.includes(bizRevenueCodeSearch) ||
          item.description.toLowerCase().includes(bizRevenueCodeSearch.toLowerCase())
      )
    : BUSINESS_REVENUE_CODES;

  const bizRevenueDescFiltered = bizRevenueDescSearch
    ? BUSINESS_REVENUE_CODES.filter(
        (item) =>
          item.description.toLowerCase().includes(bizRevenueDescSearch.toLowerCase()) ||
          item.code.includes(bizRevenueDescSearch)
      )
    : BUSINESS_REVENUE_CODES;

  const handleBizRevenueSelect = (item: { code: string; description: string }) => {
    setForm((prev) => ({ ...prev, revenueCode: item.code, revenueDescription: item.description }));
    setBizRevenueCodeSearch(item.code);
    setBizRevenueDescSearch(item.description);
    setBizRevenueCodeShowDropdown(false);
    setBizRevenueDescShowDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bizRevenueCodeRef.current && !bizRevenueCodeRef.current.contains(e.target as Node)) {
        setBizRevenueCodeShowDropdown(false);
      }
      if (bizRevenueDescRef.current && !bizRevenueDescRef.current.contains(e.target as Node)) {
        setBizRevenueDescShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Fetch amount from rate config ──────────────────────────────────────
  const fetchAmountForCode = async (code: string) => {
    if (!code) { setForm((p) => ({ ...p, amount: '' })); return; }
    try {
      const res = await fetch(`/api/rms-data?key=rate-config-fees&_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const data = json?.data || json;
        if (data && data[code] && typeof data[code].amount === 'number') {
          setForm((p) => ({ ...p, amount: String(data[code].amount) }));
          return;
        }
      }
    } catch { /* fallback */ }
    setForm((p) => ({ ...p, amount: '' }));
  };

  // ── Autocomplete suggestion sources ─────────────────────────────────────
  const daAssignmentSuggestions = [...new Set(businesses.map((b) => b.daAssignmentNo).filter(Boolean))];
  const businessUniqueNoSuggestions = [...new Set(businesses.map((b) => b.businessUniqueNumber).filter(Boolean))];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFormChange(e as unknown as React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>);
  };

  // Cascading: when Class Description is set, filter codes
  const classCodes = form.businessClassDesc ? (CLASS_TO_CODES[form.businessClassDesc] || []) : BUSINESS_CLASS_CODES;

  // ── Fetch GPS ───────────────────────────────────────────────────────────
  const fetchGps = () => {
    if (!navigator.geolocation) { alert('Geolocation is not supported by your browser.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: String(pos.coords.latitude),
          longitude: String(pos.coords.longitude),
        }));
        setLocating(false);
      },
      () => { alert('Unable to retrieve your location.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = businesses.filter((b) => {
    const matchSearch =
      searchQuery === '' ||
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.businessUniqueNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.regNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIdx = (safeCurrentPage - 1) * itemsPerPage;
  const paged = filtered.slice(startIdx, startIdx + itemsPerPage);
  const showingFrom = filtered.length === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(startIdx + itemsPerPage, filtered.length);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, type } = e.target;
    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value,
      };
      // Auto-fill area code when locality changes
      if (name === 'locality' && LOCALITY_AREA_CODE_MAP[updated.locality]) {
        updated.areaCode = LOCALITY_AREA_CODE_MAP[updated.locality];
      }
      // Update business unique number when area code changes
      if ((name === 'locality' || name === 'areaCode') && updated.areaCode) {
        const nextNum = businesses.length + 1;
        updated.businessUniqueNumber = `${updated.areaCode}/BP/${String(nextNum).padStart(4, '0')}`;
      }
      // Link Revenue Description <-> Revenue Code
      if (name === 'revenueDescription' && BIZ_DESC_TO_CODE[updated.revenueDescription]) {
        updated.revenueCode = BIZ_DESC_TO_CODE[updated.revenueDescription];
      }
      if (name === 'revenueCode' && BIZ_CODE_TO_DESC[updated.revenueCode]) {
        updated.revenueDescription = BIZ_CODE_TO_DESC[updated.revenueCode];
      }
      // Link Business Code -> Business Class + Business Category
      if (name === 'businessClassCode') {
        const code = updated.businessClassCode;
        updated.businessClassDesc = CODE_TO_CLASS[code] || '';
        updated.category = CODE_TO_CATEGORY[code] || '';
        // Fetch amount from rate config when code changes
        setTimeout(() => fetchAmountForCode(code), 0);
      }
      return updated;
    });
  };

  const handleSave = () => {
    const missing: string[] = [];
    if (!form.name?.trim()) missing.push('Business Name');
    if (!form.owner?.trim()) missing.push('Owner Name');
    if (missing.length > 0) {
      alert('Please complete the following required field(s):\n\n' + missing.map((f) => '• ' + f).join('\n'));
      return;
    }
    const regNum = editingRegNumber || form.regNumber || `BIZ-${String(businesses.length + 1).padStart(4, '0')}`;
    const newBiz: Business = { ...form, regNumber: regNum };

    if (editingRegNumber) {
      setBusinesses((prev) => prev.map((b) => (b.regNumber === editingRegNumber ? { ...b, ...newBiz } : b)));
    } else {
      setBusinesses((prev) => [...prev, newBiz]);
    }

    toast.success('Successfully saved');
    setEditingRegNumber(null);
    setForm({ ...defaultForm });
    setView('list');
  };

  const handleCancel = () => {
    setEditingRegNumber(null);
    setForm({ ...defaultForm });
    setView('list');
  };

  const handleEdit = (biz: Business) => {
    setEditingRegNumber(biz.regNumber);
    setForm({
      regNumber: biz.regNumber,
      // A. Business Location
      locality: biz.locality || '',
      areaCode: biz.areaCode || '',
      streetName: biz.streetName || '',
      houseNo: biz.houseNo || '',
      ghanaPostGPS: biz.ghanaPostGPS || '',
      latitude: biz.latitude || '',
      longitude: biz.longitude || '',
      landmark: biz.landmark || '',
      // B. Business Information
      daAssignmentNo: biz.daAssignmentNo || '',
      businessUniqueNumber: biz.businessUniqueNumber || '',
      businessCertNo: biz.businessCertNo || '',
      name: biz.name || '',
      revenueCode: biz.revenueCode || '',
      revenueDescription: biz.revenueDescription || '',
      businessClassCode: biz.businessClassCode || '',
      businessClassDesc: biz.businessClassDesc || (biz.businessClassCode ? CODE_TO_CLASS[biz.businessClassCode] || '' : ''),
      category: biz.category || '',
      amount: biz.amount || '',
      employees: biz.employees || '',
      dateRegistered: biz.dateRegistered || '',
      status: biz.status || 'Active',
      yearEstablished: biz.yearEstablished || '',
      // C. Owner Information
      owner: biz.owner || '',
      ghanaCard: biz.ghanaCard || '',
      phone: biz.phone || '',
      email: biz.email || '',
      ownerTin: biz.ownerTin || '',
      comments: biz.comments || '',
    });
    setView('form');
  };

  const handleDelete = (regNumber: string) => {
    if (!confirm('Are you sure you want to delete this business? This action cannot be undone.')) return;
    setBusinesses((prev) => prev.filter((b) => b.regNumber !== regNumber));
  };

  // ── Form Helpers ─────────────────────────────────────────────────────────
  const inputClass =
    'w-full rounded-lg border border-slate-300 dark:border-slate-500 bg-white dark:bg-muted px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition';
  const labelClass =
    'text-sm font-medium text-foreground mb-1.5';

  const formatVal = (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n)) return 'GH\u20b5 0';
    return `GH\u20b5 ${n.toLocaleString('en-GH')}`;
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'list') {
    return (
      <div className="space-y-6">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Business Register</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Register and manage businesses within the assembly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingRegNumber(null);
                setForm({
                  ...defaultForm,
                  businessUniqueNumber: generateBusinessUniqueNumber(),
                  businessCertNo: generateBusinessCertNo(),
                  daAssignmentNo: generateDaAssignmentNo(),
                });
                setView('form');
              }}
              className="inline-flex items-center gap-2 bg-primary hover:bg-destructive text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Register New Business
            </button>
            <button onClick={handleExport} className="inline-flex items-center gap-2 border border-border bg-white dark:bg-muted text-foreground text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-card dark:hover:bg-slate-700 transition-colors whitespace-nowrap cursor-pointer">
              <Download className="w-4 h-4" /> Export
            </button>
            <label className="inline-flex items-center gap-2 border border-border bg-white dark:bg-muted text-foreground text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-card dark:hover:bg-slate-700 transition-colors whitespace-nowrap cursor-pointer">
              <Upload className="w-4 h-4" /> Import
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            </label>
          </div>
        </div>

        {/* ── Search & Filters ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, owner, or unique number..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className={`${inputClass} pl-10`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className={`${inputClass} w-full sm:w-48`}
          >
            {businessStatuses.map((s) => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
            ))}
          </select>
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <div className="rounded-xl border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-card dark:bg-muted/60 border-b border-border">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Business Unique #</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Business Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Owner's Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Business Class</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Category</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Amount</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No businesses registered yet</p>
                      <p className="text-xs mt-1">Click &quot;Register New Business&quot; to get started.</p>
                    </td>
                  </tr>
                ) : (
                  paged.map((biz) => (
                    <tr key={biz.regNumber} className="border-b border-border dark:border-border/50 hover:bg-card/50 dark:hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground dark:text-muted-foreground whitespace-nowrap">{biz.businessUniqueNumber || '—'}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{biz.name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground dark:text-muted-foreground">{biz.owner || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground dark:text-muted-foreground">{biz.businessClassDesc || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground dark:text-muted-foreground">{biz.category || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">GHS {(parseFloat(biz.amount) || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${biz.status === 'Active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground dark:bg-slate-700 dark:text-muted-foreground'}`}>
                          {biz.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => handleEdit(biz)} className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button onClick={() => handleDelete(biz.regNumber)} className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs font-medium px-2 py-1 rounded hover:bg-destructive/10 transition-colors ml-1 cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {filtered.length > itemsPerPage && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card/50 dark:bg-muted/30">
              <span className="text-sm text-muted-foreground">
                Showing {showingFrom}–{showingTo} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground dark:text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span className="px-3 text-sm text-muted-foreground dark:text-muted-foreground">Page {safeCurrentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground dark:text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  FORM VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* ── Form Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button onClick={() => setView('list')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-slate-200 transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {editingRegNumber ? 'Edit Business' : 'Register New Business'}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {editingRegNumber ? 'Update the business details below.' : 'Fill in the details below to register a new business.'}
        </p>
      </div>

      <div className="space-y-6">
        {/* ════════════════════════════════════════════════════════════════════
            CARD A: BUSINESS LOCATION
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-muted rounded-xl border-border overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-card/60 border-b border-border">
            <MapPin className="w-4.5 h-4.5 text-muted-foreground dark:text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">A. Business Location</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              {/* Locality */}
              <div>
                <label className={`${labelClass} block`}>Locality</label>
                <select name="locality" value={form.locality} onChange={handleFormChange} className={inputClass}>
                  <option value="">Select locality</option>
                  {LOCALITIES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              {/* Area Code */}
              <div>
                <label className={`${labelClass} block`}>Area Code</label>
                <input type="text" name="areaCode" value={form.areaCode} onChange={handleFormChange} placeholder="Auto-fills from Locality" className={inputClass} />
              </div>
              {/* Street Name */}
              <div>
                <label className={`${labelClass} block`}>Street Name</label>
                <input type="text" name="streetName" value={form.streetName} onChange={handleFormChange} placeholder="e.g. Main St" className={inputClass} />
              </div>
              {/* House Number */}
              <div>
                <label className={`${labelClass} block`}>House Number</label>
                <input type="text" name="houseNo" value={form.houseNo} onChange={handleFormChange} placeholder="e.g. 26" className={inputClass} />
              </div>
              {/* Ghana Post GPS Address */}
              <div>
                <label className={`${labelClass} block`}>Ghana Post GPS Address</label>
                <input type="text" name="ghanaPostGPS" value={form.ghanaPostGPS} onChange={handleFormChange} placeholder="e.g. AK-034-5521" className={inputClass} />
              </div>
              {/* GPS Coordinates */}
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>GPS Coordinates (Latitude / Longitude)</label>
                <div className="flex gap-2">
                  <input type="text" name="latitude" value={form.latitude} onChange={handleFormChange} placeholder="Latitude" className={`${inputClass} flex-1`} />
                  <input type="text" name="longitude" value={form.longitude} onChange={handleFormChange} placeholder="Longitude" className={`${inputClass} flex-1`} />
                  <button type="button" onClick={fetchGps} disabled={locating} className="inline-flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg border-border border-primary/40 dark:border-primary text-primary dark:text-primary hover:bg-primary/10 dark:hover:dark:bg-primary/20 disabled:opacity-50 transition-colors text-xs font-medium whitespace-nowrap cursor-pointer">
                    {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                    {locating ? '...' : 'GPS'}
                  </button>
                </div>
              </div>
              {/* Exact Business Location Description (Landmark) */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Exact Business Location Description (Landmark)</label>
                <textarea name="landmark" value={form.landmark} onChange={handleFormChange} placeholder="e.g. Opposite the old post office, near the traffic light" rows={2} className={`${inputClass} resize-none`} />
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            CARD B: BUSINESS INFORMATION
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-muted rounded-xl border-border overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-card/60 border-b border-border">
            <Briefcase className="w-4.5 h-4.5 text-muted-foreground dark:text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">B. Business Information</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              {/* Business Name - full width */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Business Name <span className="text-red-500">*</span></label>
                <input type="text" name="name" value={form.name} onChange={handleFormChange} placeholder="Enter registered business name" className={inputClass} />
              </div>
              {/* DA Assessment Number */}
              <div>
                <label className={`${labelClass} block`}>DA Assessment Number</label>
                <AutoSuggestInput
                  name="daAssignmentNo"
                  value={form.daAssignmentNo}
                  onChange={handleInputChange}
                  suggestions={daAssignmentSuggestions}
                  placeholder="Type to search existing or enter new..."
                  className={inputClass}
                />
              </div>
              {/* Business Unique Number */}
              <div>
                <label className={`${labelClass} block`}>Business Unique Number</label>
                <AutoSuggestInput
                  name="businessUniqueNumber"
                  value={form.businessUniqueNumber}
                  onChange={handleInputChange}
                  suggestions={businessUniqueNoSuggestions}
                  placeholder="Type to search existing or enter new..."
                  className={inputClass}
                />
              </div>
              {/* Business Certificate Number (GCR) */}
              <div>
                <label className={`${labelClass} block`}>Business Certificate Number (GCR)</label>
                <input type="text" name="businessCertNo" value={form.businessCertNo} onChange={handleFormChange} placeholder="e.g. GCR-0001" className={inputClass} />
              </div>
              {/* Business Code */}
              <div>
                <label className={`${labelClass} block`}>Business Code</label>
                <Combobox
                  name="businessClassCode"
                  value={form.businessClassCode}
                  onChange={handleFormChange}
                  options={classCodes.map((c) => ({ value: c, label: c }))}
                  placeholder="Select code..."
                  emptyMessage="No matching code"
                  className={inputClass}
                />
              </div>
              {/* Revenue Description */}
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>Revenue Description</label>
                <div className="relative" ref={bizRevenueDescRef}>
                  <input
                    type="text"
                    value={bizRevenueDescShowDropdown ? bizRevenueDescSearch : form.revenueDescription}
                    onChange={(e) => { setBizRevenueDescSearch(e.target.value); setBizRevenueDescShowDropdown(true); }}
                    onFocus={() => { setBizRevenueDescSearch(form.revenueDescription || ''); setBizRevenueDescShowDropdown(true); }}
                    placeholder="Search business revenue description..."
                    className={inputClass}
                  />
                  {bizRevenueDescShowDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-muted border border-border dark:border-border rounded-lg shadow-lg">
                      {bizRevenueDescFiltered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
                      ) : bizRevenueDescFiltered.slice(0, 50).map((item) => (
                        <button key={item.code} type="button" onClick={() => { handleBizRevenueSelect(item); setBizRevenueDescShowDropdown(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-primary/10 dark:hover:dark:bg-primary/20 transition-colors cursor-pointer border-b border-border dark:border-border last:border-0">
                          <span className="text-foreground dark:text-foreground">{item.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Business Class */}
              <div>
                <label className={`${labelClass} block`}>Business Class</label>
                <input
                  type="text"
                  value={form.businessClassDesc}
                  readOnly
                  placeholder="Auto-filled from Class Code"
                  className={`${inputClass} bg-card dark:bg-muted/50 text-muted-foreground dark:text-muted-foreground cursor-not-allowed`}
                />
              </div>
              {/* Business Category */}
              <div>
                <label className={`${labelClass} block`}>Business Category</label>
                <input
                  type="text"
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                  placeholder="Enter category"
                  className={inputClass}
                />
              </div>
              {/* Amount (from rate configuration) */}
              <div>
                <label className={`${labelClass} block`}>Amount (from Rate Configuration)</label>
                <input
                  type="text"
                  value={form.amount ? `GH\u20b5 ${parseFloat(form.amount).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                  readOnly
                  placeholder="Auto-fetched from Rate Config"
                  className={`${inputClass} bg-card dark:bg-muted/50 text-muted-foreground dark:text-muted-foreground cursor-not-allowed`}
                />
              </div>
              {/* Number of Employees */}
              <div>
                <label className={`${labelClass} block`}>Number of Employees</label>
                <input type="number" name="employees" value={form.employees} onChange={handleFormChange} placeholder="e.g. 5" min="0" className={inputClass} />
              </div>
              {/* Date Registered */}
              <div>
                <label className={`${labelClass} block`}>Date Registered</label>
                <input type="date" name="dateRegistered" value={form.dateRegistered} onChange={handleFormChange} className={inputClass} />
              </div>
              {/* Status */}
              <div>
                <label className={`${labelClass} block`}>Status</label>
                <select name="status" value={form.status} onChange={handleFormChange} className={inputClass}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              {/* Year Established */}
              <div>
                <label className={`${labelClass} block`}>Year Established</label>
                <input type="number" name="yearEstablished" value={form.yearEstablished} onChange={handleFormChange} placeholder="e.g. 2020" min="1900" max={String(new Date().getFullYear())} className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            CARD C: OWNER INFORMATION
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-muted rounded-xl border-border overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-card/60 border-b border-border">
            <User className="w-4.5 h-4.5 text-muted-foreground dark:text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">C. Owner Information</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              {/* Business Owner's Name - full width */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Business Owner's Name <span className="text-red-500">*</span></label>
                <input type="text" name="owner" value={form.owner} onChange={handleFormChange} placeholder="Enter full name of business owner" className={inputClass} />
              </div>
              {/* National ID (Ghana Card Number) */}
              <div>
                <label className={`${labelClass} block`}>National ID (Ghana Card Number)</label>
                <input type="text" name="ghanaCard" value={form.ghanaCard} onChange={handleFormChange} placeholder="e.g. GHA-123456789-0" className={inputClass} />
              </div>
              {/* Phone Number */}
              <div>
                <label className={`${labelClass} block`}>Phone Number</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleFormChange} placeholder="e.g. +233 24 567 8901" className={inputClass} />
              </div>
              {/* Email Address */}
              <div>
                <label className={`${labelClass} block`}>Email Address</label>
                <input type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="e.g. owner@email.com" className={inputClass} />
              </div>
              {/* Owner TIN */}
              <div>
                <label className={`${labelClass} block`}>Owner TIN</label>
                <input type="text" name="ownerTin" value={form.ownerTin} onChange={handleFormChange} placeholder="Owner's TIN" className={inputClass} />
              </div>
              {/* Comments - full width */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Comments</label>
                <textarea name="comments" value={form.comments} onChange={handleFormChange} placeholder="Any additional notes..." rows={3} className={`${inputClass} resize-none`} />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Action Buttons ──────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button onClick={handleCancel} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-card0 hover:bg-slate-600 text-white text-sm font-medium transition-colors cursor-pointer">
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-destructive text-white text-sm font-medium transition-colors cursor-pointer">
            <Save className="w-4 h-4" />
            {editingRegNumber ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
