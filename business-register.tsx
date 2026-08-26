'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import {
  Search,
  Plus,
  ArrowLeft,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
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
import { REVENUE_DESCRIPTIONS } from '@/lib/revenue-descriptions';
import { BUSINESS_REVENUE_CODES, BIZ_CODE_TO_DESC, BIZ_DESC_TO_CODE } from '@/lib/business-revenue-codes';
import {
  CLASS_TO_FIRST_CODE,
  CLASS_TO_CODES,
  CODE_TO_CLASS,
} from '@/lib/business-class-code-map';
import { BUSINESS_CLASS_CODES } from '@/lib/business-class-codes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';
import { AutoSuggestInput } from '@/components/ui/auto-suggest-input';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Business {
  regNumber: string;
  name: string;
  owner: string;
  type: string;
  category: string;
  tin: string;
  status: string;
  dateRegistered: string;
  ghanaCard: string;
  phone: string;
  email: string;
  ghanaPostGPS: string;
  latitude: string;
  longitude: string;
  digitalAddress: string;
  residentialAddress: string;
  businessAddress: string;
  ward: string;
  electoralArea: string;
  zone: string;
  revenueArea: string;
  licenseNumber: string;
  subCategory: string;
  streetName: string;
  houseNo: string;
  streetCode: string;
  locality: string;
  areaCode: string;
  code: string;
  daAssignmentNo: string;
  businessCertNo: string;
  businessUniqueNumber: string;
  revenueDescription: string;
  revenueDescription2: string;
  revenueCode: string;
  businessClassCode: string;
  employees: string;
  yearEstablished: string;
  excludedFromFees: boolean;
  ownerAddress: string;
  ownerLatitude: string;
  ownerLongitude: string;
  ownerTin: string;
  comments: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockBusinesses: Business[] = [];

// ─── Constants ──────────────────────────────────────────────────────────────

const businessStatuses = ['All', 'Active', 'Inactive'];
const businessTypes = ['All'];

// ─── Business Register Component ───────────────────────────────────────

const _BIZ_REG_VERSION = '1.0';

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
    return `${prefix}/BZ/${String(nextNum).padStart(4, '0')}`;
  };

  const generateBusinessCertNo = () => {
    const nextNum = businesses.length + 1;
    return `GBC-${String(nextNum).padStart(4, '0')}`;
  };

  const generateDaAssignmentNo = () => {
    const yearSuffix = String(new Date().getFullYear()).slice(-2);
    const nextNum = businesses.length + 1;
    return `KpMA-${yearSuffix}-${String(nextNum).padStart(4, '0')}/BZ`;
  };

  // ── Form State ───────────────────────────────────────────────────────────
  const defaultForm = {
    regNumber: '',
    name: '',
    owner: '',
    type: '',
    category: '',
    tin: '',
    status: 'Active',
    dateRegistered: '',
    ghanaCard: '',
    phone: '',
    email: '',
    ghanaPostGPS: '',
    latitude: '',
    longitude: '',
    digitalAddress: '',
    residentialAddress: '',
    businessAddress: '',
    ward: '',
    electoralArea: '',
    zone: '',
    revenueArea: '',
    licenseNumber: '',
    subCategory: '',
    streetName: '',
    houseNo: '',
    streetCode: '',
    locality: '',
    areaCode: '',
    code: '',
    daAssignmentNo: '',
    businessCertNo: '',
    businessUniqueNumber: '',
    revenueDescription: 'Business License Fees',
    revenueDescription2: '',
    revenueCode: '1422008',
    businessClassCode: '',
    employees: '',
    yearEstablished: '',
    excludedFromFees: false,
    ownerAddress: '',
    ownerLatitude: '',
    ownerLongitude: '',
    ownerTin: '',
    comments: '',
  };

  const [form, setForm] = useState({ ...defaultForm });
  const [locating, setLocating] = useState(false);
  const [locatingOwner, setLocatingOwner] = useState(false);

  // ── Business Revenue Code/Description Search ────────────────────────────
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

  const fetchGps = () => {
    if (!navigator.geolocation) { alert('Geolocation is not supported.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm((p) => ({ ...p, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) })); setLocating(false); },
      (err) => { alert('Unable to retrieve location: ' + err.message); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const fetchOwnerGps = () => {
    if (!navigator.geolocation) { alert('Geolocation is not supported.'); return; }
    setLocatingOwner(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm((p) => ({ ...p, ownerLatitude: pos.coords.latitude.toFixed(6), ownerLongitude: pos.coords.longitude.toFixed(6) })); setLocatingOwner(false); },
      (err) => { alert('Unable to retrieve location: ' + err.message); setLocatingOwner(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  // ── Autocomplete suggestion sources from existing businesses ────────────
  const daAssignmentSuggestions = [...new Set(businesses.map((b) => b.daAssignmentNo).filter(Boolean))];
  const businessUniqueNoSuggestions = [...new Set(businesses.map((b) => b.businessUniqueNumber).filter(Boolean))];

  // Wrapper to handle Combobox's select-like onChange for AutoSuggestInput
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFormChange(e as unknown as React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>);
  };

  // Cascading Code/Class/Category: when Class is selected, filter codes; otherwise show all
  const classCodes = form.type ? (CLASS_TO_CODES[form.type] || []) : BUSINESS_CLASS_CODES;
  const classNames = [...new Set(Object.keys(CLASS_TO_FIRST_CODE))];

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = businesses.filter((b) => {
    const matchSearch =
      searchQuery === '' ||
      b.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.regNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.businessUniqueNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'All' || b.type?.toLowerCase().includes(typeFilter.toLowerCase());
    const matchStatus = statusFilter === 'All' || b.status?.toLowerCase().includes(statusFilter.toLowerCase());
    return matchSearch && matchType && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIdx = (safeCurrentPage - 1) * itemsPerPage;
  const paged = filtered.slice(startIdx, startIdx + itemsPerPage);
  const showingFrom = filtered.length === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(startIdx + itemsPerPage, filtered.length);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, type } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value };
      // Auto-fill area code when locality changes
      if (name === 'locality' && LOCALITY_AREA_CODE_MAP[updated.locality]) {
        updated.areaCode = LOCALITY_AREA_CODE_MAP[updated.locality];
      }
      // Update business unique number whenever area code changes
      if ((name === 'locality' || name === 'areaCode') && updated.areaCode) {
        const nextNum = businesses.length + 1;
        updated.businessUniqueNumber = `${updated.areaCode}/BZ/${String(nextNum).padStart(4, '0')}`;
      }
      // Link Revenue Description <-> Revenue Code
      if (name === 'revenueDescription' && BIZ_DESC_TO_CODE[updated.revenueDescription]) {
        updated.revenueCode = BIZ_DESC_TO_CODE[updated.revenueDescription];
      }
      if (name === 'revenueCode' && BIZ_CODE_TO_DESC[updated.revenueCode]) {
        updated.revenueDescription = BIZ_CODE_TO_DESC[updated.revenueCode];
      }
      // Link Business Class <-> Business Class Code
      if (name === 'type' && CLASS_TO_FIRST_CODE[updated.type]) {
        updated.businessClassCode = CLASS_TO_FIRST_CODE[updated.type];
      }
      if (name === 'businessClassCode') {
        const code = updated.businessClassCode;
        // Auto-fill Business Class from code mapping
        if (CODE_TO_CLASS[code]) {
          updated.type = CODE_TO_CLASS[code];
        }
      }
      return updated;
    });
  };

  const handleSave = () => {
    // Validate compulsory fields
    const missing: string[] = [];
    if (!form.name?.trim()) missing.push('Business Name');
    if (!form.owner?.trim()) missing.push('Owner Name');
    if (!form.locality?.trim()) missing.push('Locality');
    if (!form.businessAddress?.trim()) missing.push('Business Address');
    if (missing.length > 0) {
      alert('Please complete the following required field(s):\n\n' + missing.map((f) => '• ' + f).join('\n'));
      return;
    }
    const regNum = editingRegNumber || form.regNumber || `BZ-${String(businesses.length + 1).padStart(4, '0')}`;
    const newBiz: Business = {
      ...form,
      regNumber: regNum,
    };

    if (editingRegNumber) {
      setBusinesses((prev) =>
        prev.map((b) =>
          b.regNumber === editingRegNumber
            ? { ...b, ...newBiz }
            : b
        )
      );
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
      name: biz.name,
      owner: biz.owner,
      type: biz.type,
      category: biz.category,
      tin: biz.tin,
      status: biz.status,
      dateRegistered: biz.dateRegistered,
      ghanaCard: biz.ghanaCard,
      phone: biz.phone,
      email: biz.email,
      ghanaPostGPS: biz.ghanaPostGPS,
      latitude: biz.latitude,
      longitude: biz.longitude,
      digitalAddress: biz.digitalAddress,
      residentialAddress: biz.residentialAddress,
      businessAddress: biz.businessAddress,
      ward: biz.ward,
      electoralArea: biz.electoralArea,
      zone: biz.zone,
      revenueArea: biz.revenueArea,
      licenseNumber: biz.licenseNumber,
      subCategory: biz.subCategory,
      streetName: biz.streetName,
      houseNo: biz.houseNo,
      streetCode: biz.streetCode,
      locality: biz.locality,
      areaCode: biz.areaCode || '',
      code: biz.code,
      daAssignmentNo: biz.daAssignmentNo || '',
      businessCertNo: biz.businessCertNo || '',
      businessUniqueNumber: biz.businessUniqueNumber || '',
      revenueDescription: biz.revenueDescription || '',
      revenueDescription2: biz.revenueDescription2 || '',
      revenueCode: biz.revenueCode || '',
      businessClassCode: biz.businessClassCode || '',
      employees: biz.employees || '',
      yearEstablished: biz.yearEstablished || '',
      excludedFromFees: biz.excludedFromFees || false,
      ownerAddress: biz.ownerAddress || '',
      ownerLatitude: biz.ownerLatitude || '',
      ownerLongitude: biz.ownerLongitude || '',
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
    'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0B1D3E] focus:border-[#0B1D3E] outline-none transition';
  const labelClass =
    'text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  // ══════════════════════════════════════════════════════════════════════════
  //  LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'list') {
    return (
      <div className="space-y-6">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Business Registration</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage and register businesses within the assembly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditingRegNumber(null); setForm({ ...defaultForm, businessUniqueNumber: generateBusinessUniqueNumber(), businessCertNo: generateBusinessCertNo(), daAssignmentNo: generateDaAssignmentNo() }); setView('form'); }}
              className="inline-flex items-center gap-2 bg-[#0B1D3E] hover:bg-[#E31E24] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Register New Business
            </button>
            <button onClick={handleExport} className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap cursor-pointer">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap cursor-pointer">
              <Upload className="w-4 h-4" /> Import
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          </div>
        </div>

        {/* ── Search & Filters ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Business Unique Number, owner, or business name..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className={`${inputClass} pl-10`}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className={`${inputClass} w-full sm:w-48`}
          >
            {businessTypes.map((t) => (
              <option key={t} value={t}>{t === 'All' ? 'All Business Types' : t}</option>
            ))}
          </select>
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
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Business Unique Number</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Business Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Owner</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 dark:text-slate-500">
                      <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      No businesses found.
                    </td>
                  </tr>
                ) : (
                  paged.map((biz) => (
                    <tr key={biz.regNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">{biz.businessUniqueNumber || biz.regNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">{biz.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{biz.owner}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          biz.status === 'Active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}>
                          {biz.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => handleEdit(biz)} className="p-1.5 rounded-md text-slate-400 hover:text-[#0B1D3E] hover:bg-[#0B1D3E]/10 dark:hover:bg-[#4a7ab5]/20 transition-colors cursor-pointer" title="Edit"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(biz.regNumber)} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <p className="text-slate-500 dark:text-slate-400">Showing {showingFrom}-{showingTo} of {filtered.length}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safeCurrentPage <= 1} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">{safeCurrentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safeCurrentPage >= totalPages} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  FORM VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <button onClick={handleCancel} className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {editingRegNumber ? 'Edit Business' : 'Register New Business'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {editingRegNumber ? 'Update the business details below.' : 'Fill in the details below to register a new business.'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ════════════════════════════════════════════════════════════════════
            CARD 1: BUSINESS INFORMATION
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <Briefcase className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Business Information</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              {/* Business Name - full width */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Business Name <span className="text-red-500">*</span></label>
                <input type="text" name="name" value={form.name} onChange={handleFormChange} placeholder="Enter registered business name" className={inputClass} />
              </div>
              {/* DA Assignment No. */}
              <div>
                <label className={`${labelClass} block`}>DA Assignment No.</label>
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
              {/* Business Cert No. */}
              <div>
                <label className={`${labelClass} block`}>Business Certificate No.</label>
                <input type="text" name="businessCertNo" value={form.businessCertNo} onChange={handleFormChange} placeholder="e.g. GBC-0001" className={inputClass} />
              </div>
              {/* License Number */}
              <div>
                <label className={`${labelClass} block`}>License Number</label>
                <input type="text" name="licenseNumber" value={form.licenseNumber} onChange={handleFormChange} placeholder="Enter license number" className={inputClass} />
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
              {/* Business Revenue Code */}
              <div>
                <label className={`${labelClass} block`}>Business Revenue Code</label>
                <div className="relative" ref={bizRevenueCodeRef}>
                  <input
                    type="text"
                    value={bizRevenueCodeShowDropdown ? bizRevenueCodeSearch : form.revenueCode}
                    onChange={(e) => { setBizRevenueCodeSearch(e.target.value); setBizRevenueCodeShowDropdown(true); }}
                    onFocus={() => { setBizRevenueCodeSearch(form.revenueCode || ''); setBizRevenueCodeShowDropdown(true); }}
                    placeholder="Search business revenue code..."
                    className={inputClass}
                  />
                  {bizRevenueCodeShowDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg">
                      {bizRevenueCodeFiltered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-400">No matches</div>
                      ) : bizRevenueCodeFiltered.slice(0, 50).map((item) => (
                        <button key={item.code} type="button" onClick={() => { handleBizRevenueSelect(item); setBizRevenueCodeShowDropdown(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#0B1D3E]/10 dark:hover:bg-[#4a7ab5]/20 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0">
                          <span className="font-mono text-slate-800 dark:text-white">{item.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Business Revenue Description */}
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>Business Revenue Description</label>
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
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg">
                      {bizRevenueDescFiltered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-400">No matches</div>
                      ) : bizRevenueDescFiltered.slice(0, 50).map((item) => (
                        <button key={item.code} type="button" onClick={() => { handleBizRevenueSelect(item); setBizRevenueDescShowDropdown(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#0B1D3E]/10 dark:hover:bg-[#4a7ab5]/20 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0">
                          <span className="text-slate-800 dark:text-white">{item.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Business Class Code */}
              <div>
                <label className={`${labelClass} block`}>Code</label>
                <Combobox
                  name="businessClassCode"
                  value={form.businessClassCode}
                  onChange={handleFormChange}
                  options={classCodes.map((c) => ({ value: c, label: `${c} – ${CODE_TO_CLASS[c] || ''}` }))}
                  placeholder="Select code..."
                  emptyMessage="No matching code"
                  className={inputClass}
                />
              </div>
              {/* Business Class */}
              <div>
                <label className={`${labelClass} block`}>Class</label>
                <Combobox
                  name="type"
                  value={form.type}
                  onChange={handleFormChange}
                  options={classNames.map((n) => ({ value: n, label: n }))}
                  placeholder="Select class..."
                  emptyMessage="No matching class"
                  className={inputClass}
                />
              </div>
              {/* Category */}
              <div>
                <label className={`${labelClass} block`}>Category</label>
                <input type="text" name="category" value={form.category} onChange={handleFormChange} placeholder="Enter category" className={inputClass} />
              </div>
              {/* Sub Category */}
              <div>
                <label className={`${labelClass} block`}>Sub Category</label>
                <input type="text" name="subCategory" value={form.subCategory} onChange={handleFormChange} placeholder="Enter sub-category" className={inputClass} />
              </div>
              {/* Employees */}
              <div>
                <label className={`${labelClass} block`}>Number of Employees</label>
                <input type="number" name="employees" value={form.employees} onChange={handleFormChange} placeholder="e.g. 5" min="0" className={inputClass} />
              </div>
              {/* Year Established */}
              <div>
                <label className={`${labelClass} block`}>Year Established</label>
                <input type="number" name="yearEstablished" value={form.yearEstablished} onChange={handleFormChange} placeholder="e.g. 2020" min="1900" max={String(new Date().getFullYear())} className={inputClass} />
              </div>
              {/* Excluded from Fees */}
              <div className="flex items-end">
                <label className="flex items-center gap-2 pb-2.5 cursor-pointer select-none">
                  <input type="checkbox" name="excludedFromFees" checked={form.excludedFromFees} onChange={handleFormChange} className="w-4 h-4 rounded border-slate-300 text-[#0B1D3E] focus:ring-[#0B1D3E]" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Excluded from fees</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            CARD 2: LOCATION
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <MapPin className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Business Location</h2>
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
              {/* House No */}
              <div>
                <label className={`${labelClass} block`}>House Number</label>
                <input type="text" name="houseNo" value={form.houseNo} onChange={handleFormChange} placeholder="e.g. 26" className={inputClass} />
              </div>
              {/* Street Code */}
              <div>
                <label className={`${labelClass} block`}>Street Code</label>
                <input type="text" name="streetCode" value={form.streetCode} onChange={handleFormChange} placeholder="Enter code" className={inputClass} />
              </div>
              {/* Ghana Post GPS */}
              <div>
                <label className={`${labelClass} block`}>Ghana Post GPS</label>
                <input type="text" name="ghanaPostGPS" value={form.ghanaPostGPS} onChange={handleFormChange} placeholder="e.g. AK-034-5521" className={inputClass} />
              </div>
              {/* Digital Address */}
              <div>
                <label className={`${labelClass} block`}>Digital Address</label>
                <input type="text" name="digitalAddress" value={form.digitalAddress} onChange={handleFormChange} placeholder="e.g. AK-034-5521" className={inputClass} />
              </div>
              {/* GPS: Latitude & Longitude */}
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>GPS Coordinates</label>
                <div className="flex gap-2">
                  <input type="text" name="latitude" value={form.latitude} onChange={handleFormChange} placeholder="Latitude" className={`${inputClass} flex-1`} />
                  <input type="text" name="longitude" value={form.longitude} onChange={handleFormChange} placeholder="Longitude" className={`${inputClass} flex-1`} />
                  <button type="button" onClick={fetchGps} disabled={locating} className="inline-flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg border border-[#0B1D3E]/40 dark:border-[#0B1D3E] text-[#0B1D3E] dark:text-[#4a7ab5] hover:bg-[#0B1D3E]/10 dark:hover:bg-[#4a7ab5]/20 disabled:opacity-50 transition-colors text-xs font-medium whitespace-nowrap">
                    {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                    {locating ? '...' : 'GPS'}
                  </button>
                </div>
              </div>
              {/* Business Address - full width */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Business Address <span className="text-red-500">*</span></label>
                <input type="text" name="businessAddress" value={form.businessAddress} onChange={handleFormChange} placeholder="Enter full business address" className={inputClass} />
              </div>
              {/* Ward */}
              <div>
                <label className={`${labelClass} block`}>Ward</label>
                <input type="text" name="ward" value={form.ward} onChange={handleFormChange} placeholder="Enter ward" className={inputClass} />
              </div>
              {/* Electoral Area */}
              <div>
                <label className={`${labelClass} block`}>Electoral Area</label>
                <input type="text" name="electoralArea" value={form.electoralArea} onChange={handleFormChange} placeholder="Enter electoral area" className={inputClass} />
              </div>
              {/* Zone */}
              <div>
                <label className={`${labelClass} block`}>Zone</label>
                <input type="text" name="zone" value={form.zone} onChange={handleFormChange} placeholder="Enter zone" className={inputClass} />
              </div>
              {/* Revenue Area */}
              <div>
                <label className={`${labelClass} block`}>Revenue Area</label>
                <input type="text" name="revenueArea" value={form.revenueArea} onChange={handleFormChange} placeholder="Enter revenue area" className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            CARD 3: OWNER INFORMATION
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <User className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Owner Information</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              {/* Owner Name - full width */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Owner Name <span className="text-red-500">*</span></label>
                <input type="text" name="owner" value={form.owner} onChange={handleFormChange} placeholder="Enter full name of business owner" className={inputClass} />
              </div>
              {/* Ghana Card / National ID */}
              <div>
                <label className={`${labelClass} block`}>Ghana Card / National ID</label>
                <input type="text" name="ghanaCard" value={form.ghanaCard} onChange={handleFormChange} placeholder="e.g. GHA-123456789-0" className={inputClass} />
              </div>
              {/* Phone */}
              <div>
                <label className={`${labelClass} block`}>Phone Number</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleFormChange} placeholder="e.g. +233 24 567 8901" className={inputClass} />
              </div>
              {/* Email */}
              <div>
                <label className={`${labelClass} block`}>Email</label>
                <input type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="e.g. owner@email.com" className={inputClass} />
              </div>
              {/* Business TIN */}
              <div>
                <label className={`${labelClass} block`}>Business TIN</label>
                <input type="text" name="tin" value={form.tin} onChange={handleFormChange} placeholder="Business TIN" className={inputClass} />
              </div>
              {/* Owner TIN */}
              <div>
                <label className={`${labelClass} block`}>Owner TIN</label>
                <input type="text" name="ownerTin" value={form.ownerTin} onChange={handleFormChange} placeholder="Owner's TIN" className={inputClass} />
              </div>
              {/* Residential Address */}
              <div>
                <label className={`${labelClass} block`}>Residential Address</label>
                <input type="text" name="residentialAddress" value={form.residentialAddress} onChange={handleFormChange} placeholder="Enter residential address" className={inputClass} />
              </div>
              {/* Owner Address - full width */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Owner Address</label>
                <input type="text" name="ownerAddress" value={form.ownerAddress} onChange={handleFormChange} placeholder="Enter owner address" className={inputClass} />
              </div>
              {/* Owner GPS Coordinates */}
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>Owner GPS Coordinates</label>
                <div className="flex gap-2">
                  <input type="text" name="ownerLatitude" value={form.ownerLatitude} onChange={handleFormChange} placeholder="Latitude" className={`${inputClass} flex-1`} />
                  <input type="text" name="ownerLongitude" value={form.ownerLongitude} onChange={handleFormChange} placeholder="Longitude" className={`${inputClass} flex-1`} />
                  <button type="button" onClick={fetchOwnerGps} disabled={locatingOwner} className="inline-flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg border border-[#0B1D3E]/40 dark:border-[#0B1D3E] text-[#0B1D3E] dark:text-[#4a7ab5] hover:bg-[#0B1D3E]/10 dark:hover:bg-[#4a7ab5]/20 disabled:opacity-50 transition-colors text-xs font-medium whitespace-nowrap">
                    {locatingOwner ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                    {locatingOwner ? '...' : 'GPS'}
                  </button>
                </div>
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
          <button onClick={handleCancel} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-500 hover:bg-slate-600 text-white text-sm font-medium transition-colors cursor-pointer">
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0B1D3E] hover:bg-[#E31E24] text-white text-sm font-medium transition-colors cursor-pointer">
            <Save className="w-4 h-4" />
            {editingRegNumber ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
