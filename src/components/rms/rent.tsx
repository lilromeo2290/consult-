'use client';

import { useState, useRef, useEffect } from 'react';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import {
  Search,
  Plus,
  ArrowLeft,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Home,
  MapPin,
  User,
  Building2,
  Save,
  Crosshair,
  Loader2,
  X,
  FileText,
  CalendarDays,
  UserCheck,
  DollarSign,
  Hash,
  Ruler,
  Download,
  Upload,
} from 'lucide-react';
import { exportToExcel, importFromExcel, RENT_FIELDS } from '@/lib/import-export';
import { REVENUE_CODE_MAP, DESCRIPTION_TO_CODE, CODE_TO_DESCRIPTION } from '@/lib/revenue-code-map';
// ─── Types ───────────────────────────────────────────────────────────────────

interface Rent {
  id: string;
  upn: string;
  // Location
  rentPropertyLocation: string;
  locationCode: string;
  exactLocation: string;
  propertyGhanaPostGPS: string;
  propertyLatitude: string;
  propertyLongitude: string;
  // Rent Property Information
  rentPropertyNumber: string;
  rentPropertyTypeCode: string;
  rentPropertyType: string;
  rentPropertyTypeCategory: string;
  rentRevenueCode: string;
  rentRevenueDescription: string;
  amount: string;
  vacant: string;
  // Contract
  startDate: string;
  endDate: string;
  contractId: string;
  contractValue: string;
  area: string;
  // Occupant's Information
  occupantUniqueId: string;
  occupantName: string;
  occupantNationalId: string;
  occupantAddress: string;
  occupantPhone: string;
  occupantEmail: string;
  // Other
  excludedFromRenting: boolean;
  comments: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockRents: Rent[] = [];

// ─── Constants ──────────────────────────────────────────────────────────────

// Rent Property Type -> Type Code mapping
const PROPERTY_TYPE_CODE_MAP: Record<string, string> = {
  'Bill Boards': 'KpMA/KZC/DBB/KPD/',
  'Assembly Hall': 'KpMA/KZC/ASH/KPD/',
  'Assembly Conference Room': 'KpMA/KZC/ACR/KPD/',
  'Community Centres': 'KpMA/KZC/CCH/KPD/',
  'Sub-district/Metro Halls': 'KpMA/KZC/SDH/KPD/',
  'Assembly Forecourt': 'KpMA/KZC/AFC/KPD/',
  'Others': 'KpMA/KZC/OTH/KPD/',
  'Stores': 'KpMA/KZC/LKS/MKS/',
  'Stalls': 'KpMA/KZC/MKT/STL/',
  'Sheds': 'KpMA/KZC/MKT/SHD/',
  'Rent of Open Market Space': 'KpMA/KZC/MKT/OPS/',
  'Rent of Market Warehouse': 'KpMA/KZC/MKT/MWH/',
  'Rent of Undeveloped Lands': 'KpMA/KZC/RUL/KPD/',
  'Hiring of Parks': 'KpMA/KZC/HPK/KPD/',
  'Rent on Leased Buildings': 'KpMA/KZC/RLB/KPD/',
  'Rent for Vendor Stands': 'KpMA/KZC/RVS/KPD/',
  'Official Residence': 'KpMA/KZC/BGL/KPD/',
  'Guest House': 'KpMA/KZC/GHR/KPD/',
  'Restaurant/Canteen': 'KpMA/KZC/RCR/KPD/',
  'Club House': 'KpMA/KZC/CHR/KPD/',
  'Stadium': 'KpMA/KZC/SSR/KPD/',
};

const PROPERTY_TYPES = Object.keys(PROPERTY_TYPE_CODE_MAP);

const VACANT_OPTIONS = ['Yes', 'No'];

// Rent-relevant revenue codes for search
const RENT_REVENUE_CODES = REVENUE_CODE_MAP.filter(
  (item) =>
    item.code.startsWith('1415') ||
    item.description.toLowerCase().includes('market and stores') ||
    item.description.toLowerCase().includes('rent of properties')
);


// ─── Component ───────────────────────────────────────────────────────────────

export function RentPage() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [vacantFilter, setVacantFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [rents, setRents] = useSyncedStorage<Rent[]>('rms-rents', mockRents);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const revenueDropdownRef = useRef<HTMLDivElement>(null);
  const [revenueSearch, setRevenueSearch] = useState('');
  const [showRevenueDropdown, setShowRevenueDropdown] = useState(false);
  const itemsPerPage = 10;

  // ── Import / Export ───────────────────────────────────────────────────────
  const handleExport = () => {
    if (rents.length === 0) { alert('No rent records to export.'); return; }
    exportToExcel(rents as unknown as Record<string, unknown>[], RENT_FIELDS, 'Rents');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importFromExcel<Rent>(file, RENT_FIELDS);
      if (imported.length === 0) { alert('No data found in the file.'); return; }
      const existing = new Map(rents.map((r) => [r.id, r]));
      for (const item of imported) {
        const key = item.id || `IMP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        item.id = key;
        existing.set(key, item);
      }
      setRents(Array.from(existing.values()));
      alert(`${imported.length} rent record(s) imported successfully.`);
    } catch (err) {
      alert('Failed to import file. Please ensure it is a valid Excel file exported from this system.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Form State ───────────────────────────────────────────────────────────
  const defaultForm = {
    upn: '',
    rentPropertyLocation: '',
    locationCode: '',
    exactLocation: '',
    propertyGhanaPostGPS: '',
    propertyLatitude: '',
    propertyLongitude: '',
    rentPropertyNumber: '',
    rentPropertyTypeCode: '',
    rentPropertyType: '',
    rentPropertyTypeCategory: '',
    rentRevenueCode: '',
    rentRevenueDescription: '',
    amount: '',
    vacant: 'No',
    startDate: '',
    endDate: '',
    contractId: '',
    contractValue: '',
    area: '',
    occupantUniqueId: '',
    occupantName: '',
    occupantNationalId: '',
    occupantAddress: '',
    occupantPhone: '',
    occupantEmail: '',
    excludedFromRenting: false,
    comments: '',
  };

  const [form, setForm] = useState(defaultForm);
  const [locating, setLocating] = useState(false);

  const fetchGps = () => {
    if (!navigator.geolocation) { alert('Geolocation is not supported.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm((p) => ({ ...p, propertyLatitude: pos.coords.latitude.toFixed(6), propertyLongitude: pos.coords.longitude.toFixed(6) })); setLocating(false); },
      (err) => { alert('Unable to retrieve location: ' + err.message); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = rents.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !searchQuery ||
      r.occupantName.toLowerCase().includes(q) ||
      r.upn.toLowerCase().includes(q) ||
      r.rentPropertyLocation.toLowerCase().includes(q) ||
      r.rentPropertyType.toLowerCase().includes(q) ||
      r.contractId.toLowerCase().includes(q);
    const matchClass = classFilter === 'All' || r.rentPropertyType === classFilter;
    const matchVacant = vacantFilter === 'All' || r.vacant === vacantFilter;
    return matchSearch && matchClass && matchVacant;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paged = filtered.slice(startIdx, startIdx + itemsPerPage);
  const showingFrom = filtered.length === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(startIdx + itemsPerPage, filtered.length);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (name === 'rentPropertyType') {
      // Auto-fill type code and generate property number
      const typeCode = PROPERTY_TYPE_CODE_MAP[value] || '';
      // Count existing rents with same type to determine next number
      const existingCount = rents.filter((r) => r.rentPropertyType === value).length;
      const nextNum = String(existingCount + 1).padStart(4, '0');
      const propertyNumber = typeCode ? `${typeCode}${nextNum}` : '';
      setForm((prev) => ({
        ...prev,
        rentPropertyType: value,
        rentPropertyTypeCode: typeCode,
        rentPropertyNumber: propertyNumber,
        rentPropertyTypeCategory: '',
      }));
    } else if (name === 'rentRevenueCode') {
      const desc = CODE_TO_DESCRIPTION[value] || '';
      setForm((prev) => ({ ...prev, rentRevenueCode: value, rentRevenueDescription: desc }));
      setRevenueSearch(desc || value);
      setShowRevenueDropdown(false);
    } else if (name === 'rentRevenueDescription') {
      const code = DESCRIPTION_TO_CODE[value] || '';
      setForm((prev) => ({ ...prev, rentRevenueDescription: value, rentRevenueCode: code }));
      setRevenueSearch(value || code);
      setShowRevenueDropdown(false);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const filteredRevenueCodes = revenueSearch
    ? RENT_REVENUE_CODES.filter(
        (item) =>
          item.description.toLowerCase().includes(revenueSearch.toLowerCase()) ||
          item.code.includes(revenueSearch)
      )
    : RENT_REVENUE_CODES;

  const selectRevenue = (item: { code: string; description: string }) => {
    setForm((prev) => ({ ...prev, rentRevenueCode: item.code, rentRevenueDescription: item.description }));
    setRevenueSearch(item.description);
    setShowRevenueDropdown(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (revenueDropdownRef.current && !revenueDropdownRef.current.contains(e.target as Node)) {
        setShowRevenueDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const [saving, setSaving] = useState(false);

  // Generate Unique ID: KPMA + year + ascending number
  const generateUniqueId = () => {
    const year = new Date().getFullYear();
    const prefix = `KPMA${year}`;
    const existingIds = rents.filter((r) => r.occupantUniqueId && r.occupantUniqueId.startsWith(prefix));
    const maxNum = existingIds.reduce((max, r) => {
      const numStr = r.occupantUniqueId.replace(prefix, '');
      const num = parseInt(numStr, 10);
      return num > max ? num : max;
    }, 0);
    return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleSave = async () => {
    if (!form.occupantName) {
      alert('Please fill in the required field: Occupant\'s Name.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        setRents((prev) =>
          prev.map((r) => (r.id === editingId ? { ...r, ...form } : r))
        );
        setEditingId(null);
      } else {
        const newRent: Rent = {
          id: `RNT-${Date.now()}`,
          ...form,
        };
        setRents((prev) => [...prev, newRent]);
      }
      setForm(defaultForm);
      setView('list');
      setCurrentPage(1);
      setSearchQuery('');
    } catch (err) {
      console.error('Failed to save rent record:', err);
      alert('Failed to save rent record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (rent: Rent) => {
    setForm({
      upn: rent.upn,
      rentPropertyLocation: rent.rentPropertyLocation,
      locationCode: rent.locationCode,
      exactLocation: rent.exactLocation,
      propertyGhanaPostGPS: rent.propertyGhanaPostGPS,
      propertyLatitude: rent.propertyLatitude,
      propertyLongitude: rent.propertyLongitude,
      rentPropertyNumber: rent.rentPropertyNumber,
      rentPropertyTypeCode: rent.rentPropertyTypeCode || '',
      rentPropertyType: rent.rentPropertyType,
      rentPropertyTypeCategory: rent.rentPropertyTypeCategory || '',
      amount: rent.amount,
      vacant: rent.vacant,
      startDate: rent.startDate,
      endDate: rent.endDate,
      contractId: rent.contractId,
      contractValue: rent.contractValue,
      area: rent.area,
      renterName: rent.occupantName,
      occupantUniqueId: rent.occupantUniqueId || '',
      occupantName: rent.occupantName,
      occupantNationalId: rent.occupantNationalId,
      occupantAddress: rent.occupantAddress,
      occupantPhone: rent.occupantPhone,
      occupantEmail: rent.occupantEmail,
      excludedFromRenting: rent.excludedFromRenting,
      comments: rent.comments,
    });
    setEditingId(rent.id);
    setView('form');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this rent record?')) {
      setRents((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleCancel = () => {
    setForm(defaultForm);
    setEditingId(null);
    setView('list');
    setSearchQuery('');
    setClassFilter('All');
    setVacantFilter('All');
    setCurrentPage(1);
  };

  // ── Shared classes ──────────────────────────────────────────────────────
  const inputClass =     'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition';
  const labelClass =     'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5';

  // ══════════════════════════════════════════════════════════════════════════
  //  LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'list') {
    return (
      <div className="space-y-6">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Lease Management
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage and track lease/rent agreements within the assembly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setForm({ ...defaultForm, occupantUniqueId: generateUniqueId() }); setEditingId(null); setView('form'); setRevenueSearch(''); setShowRevenueDropdown(false); }}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Rent
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
              placeholder="Search by renter, Rent Property Number, location, rent object, class..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className={`${inputClass} pl-10`}
            />
          </div>
          <select
            value={classFilter}
            onChange={(e) => { setClassFilter(e.target.value); setCurrentPage(1); }}
            className={`${inputClass} w-full sm:w-48`}
          >
            <option value="All">All Property Types</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={vacantFilter}
            onChange={(e) => { setVacantFilter(e.target.value); setCurrentPage(1); }}
            className={`${inputClass} w-full sm:w-48`}
          >
            <option value="All">All Vacancy Status</option>
            {VACANT_OPTIONS.map((v) => (
              <option key={v} value={v}>{v === 'Yes' ? 'Vacant' : 'Occupied'}</option>
            ))}
          </select>
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Rent Property Number</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Renter</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Rent Object</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Rent Class</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Rent Value</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Vacant</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500">
                      <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      {searchQuery || classFilter !== 'All' || vacantFilter !== 'All'
                        ? 'No rents match your filters.'
                        : 'No rents recorded yet. Click "Add Rent" to create one.'}
                    </td>
                  </tr>
                ) : (
                  paged.map((rent) => (
                    <tr key={rent.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{rent.upn}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">{rent.occupantName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap max-w-[200px] truncate">{rent.rentPropertyType || '--'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{rent.rentPropertyTypeCategory || '--'}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{rent.amount ? `GHS ${Number(rent.amount).toLocaleString()}` : '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${
                          rent.vacant === 'Yes'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                          {rent.vacant || 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => handleEdit(rent)} className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer" title="Edit"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(rent.id)} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
          <p className="text-slate-500 dark:text-slate-400">Showing {showingFrom}–{showingTo} of {filtered.length}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
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
            {editingId ? 'Edit Rent' : 'Add Rent'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {editingId ? 'Update the lease/rent details below.' : 'Fill in the details below to register a new lease/rent.'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={handleCancel} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors cursor-pointer">
            <X className="w-4 h-4" /> Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={!form.occupantName || saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saving ? 'Saving...' : (editingId ? 'Update' : 'Save')}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* ════════════════════════════════════════════════════════════════════
            CARD 1: LOCATION
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <MapPin className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Location</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Rent Property Location</label>
                <select name="rentPropertyLocation" value={form.rentPropertyLocation} onChange={handleFormChange} className={inputClass}>
                  <option value="">-- Select Property Location --</option>
                  <option value="Kpando Central Market">Kpando Central Market</option>
                  <option value="Kpando 24-Hour Market">Kpando 24-Hour Market</option>
                  <option value="Kpando Torkor Market">Kpando Torkor Market</option>
                  <option value="Kpando Lorry Park">Kpando Lorry Park</option>
                  <option value="Kpando Aloyi (Low-Cost)">Kpando Aloyi (Low-Cost)</option>
                  <option value="Kpando Tsadome (Agric)">Kpando Tsadome (Agric)</option>
                  <option value="Kpando Todzi">Kpando Todzi</option>
                  <option value="Kpando Fesi">Kpando Fesi</option>
                  <option value="Assembly Office (Fesi)">Assembly Office (Fesi)</option>
                  <option value="Assembly Office (Old)">Assembly Office (Old)</option>
                </select>
              </div>
              <div>
                <label className={`${labelClass} block`}>Location Code</label>
                <input type="text" name="locationCode" value={form.locationCode} onChange={handleFormChange} placeholder="Auto-generated" className={`${inputClass} bg-slate-50 dark:bg-slate-900/40`} readOnly />
              </div>
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>Exact Location</label>
                <input type="text" name="exactLocation" value={form.exactLocation} onChange={handleFormChange} placeholder="Enter exact location description" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4 mt-1">
              <div>
                <label className={`${labelClass} block`}>Ghana Post GPS / Digital Address</label>
                <input type="text" name="propertyGhanaPostGPS" value={form.propertyGhanaPostGPS} onChange={handleFormChange} placeholder="e.g. GA-123-4567" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>GPS Coordinates (Lat)</label>
                <input type="text" name="propertyLatitude" value={form.propertyLatitude} onChange={handleFormChange} placeholder="e.g. 5.603717" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>GPS Coordinates (Long)</label>
                <div className="flex gap-1.5">
                  <input type="text" name="propertyLongitude" value={form.propertyLongitude} onChange={handleFormChange} placeholder="e.g. -0.187028" className={inputClass} />
                  <button type="button" onClick={fetchGps} disabled={locating} className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium transition-colors" title="Auto-detect GPS">
                    {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            CARD 2: RENT PROPERTY INFORMATION
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <Building2 className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Rent Property Information</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              <div>
                <label className={`${labelClass} block`}>Unique ID</label>
                <input type="text" name="occupantUniqueId" value={form.occupantUniqueId} placeholder="Auto-generated" className={`${inputClass} bg-slate-50 dark:bg-slate-900/40`} readOnly />
              </div>
              <div>
                <label className={`${labelClass} block`}>Rent Property Number</label>
                <input type="text" name="rentPropertyNumber" value={form.rentPropertyNumber} placeholder="Auto-generated" className={`${inputClass} bg-slate-50 dark:bg-slate-900/40`} readOnly />
              </div>
              <div>
                <label className={`${labelClass} block`}>Rent Property Type Code</label>
                <input type="text" name="rentPropertyTypeCode" value={form.rentPropertyTypeCode} placeholder="Auto-filled" className={`${inputClass} bg-slate-50 dark:bg-slate-900/40`} readOnly />
              </div>
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>Rent Property Type</label>
                <select name="rentPropertyType" value={form.rentPropertyType} onChange={handleFormChange} className={inputClass}>
                  <option value="">Search to select property type</option>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`${labelClass} block`}>Rent Property Type Category</label>
                <input type="text" name="rentPropertyTypeCategory" value={form.rentPropertyTypeCategory} onChange={handleFormChange} placeholder="Enter category" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Rent Revenue Code</label>
                <input type="text" name="rentRevenueCode" value={form.rentRevenueCode} onChange={handleFormChange} onFocus={() => { setRevenueSearch(form.rentRevenueDescription || form.rentRevenueCode); setShowRevenueDropdown(true); }} placeholder="Search to select" className={inputClass} />
              </div>
              <div className="sm:col-span-2 relative" ref={revenueDropdownRef}>
                <label className={`${labelClass} block`}>Rent Revenue Description</label>
                <div className="relative">
                  <input
                    type="text"
                    value={showRevenueDropdown ? revenueSearch : form.rentRevenueDescription}
                    onChange={(e) => { setRevenueSearch(e.target.value); setShowRevenueDropdown(true); }}
                    onFocus={() => { setRevenueSearch(form.rentRevenueDescription || ''); setShowRevenueDropdown(true); }}
                    placeholder="Type to search revenue description"
                    className={inputClass}
                  />
                  {showRevenueDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg">
                      {filteredRevenueCodes.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-400">No matches found</div>
                      ) : (
                        filteredRevenueCodes.map((item) => (
                          <button
                            key={item.code}
                            type="button"
                            onClick={() => selectRevenue(item)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0"
                          >
                            <span className="font-medium text-slate-800 dark:text-white">{item.description}</span>
                            <span className="ml-2 text-xs text-slate-400 font-mono">{item.code}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className={`${labelClass} block`}>Amount (GHS)</label>
                <input type="number" name="amount" value={form.amount} onChange={handleFormChange} placeholder="0.00" min="0" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Vacant</label>
                <select name="vacant" value={form.vacant} onChange={handleFormChange} className={inputClass}>
                  {VACANT_OPTIONS.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            CARD 3: CONTRACT
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <FileText className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Contract</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              <div>
                <label className={`${labelClass} block`}>Start Date</label>
                <input type="date" name="startDate" value={form.startDate} onChange={handleFormChange} className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>End Date</label>
                <input type="date" name="endDate" value={form.endDate} onChange={handleFormChange} className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Contract ID</label>
                <input type="text" name="contractId" value={form.contractId} onChange={handleFormChange} placeholder="Enter contract ID" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Contract Value (GHS)</label>
                <input type="number" name="contractValue" value={form.contractValue} onChange={handleFormChange} placeholder="0.00" min="0" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Area (m²)</label>
                <input type="number" name="area" value={form.area} onChange={handleFormChange} placeholder="0.00" min="0" step="0.01" className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            CARD 4: OCCUPANT'S INFORMATION
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <User className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Occupant's Information</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Occupant's Name <span className="text-red-500">*</span></label>
                <input type="text" name="occupantName" value={form.occupantName} onChange={handleFormChange} placeholder="Enter full name of occupant" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>National ID Number</label>
                <input type="text" name="occupantNationalId" value={form.occupantNationalId} onChange={handleFormChange} placeholder="e.g. GHA-XXXXXXXXX" className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>Address</label>
                <input type="text" name="occupantAddress" value={form.occupantAddress} onChange={handleFormChange} placeholder="Enter occupant address" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Phone Number</label>
                <input type="text" name="occupantPhone" value={form.occupantPhone} onChange={handleFormChange} placeholder="e.g. 024 XXX XXXX" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Email Address</label>
                <input type="email" name="occupantEmail" value={form.occupantEmail} onChange={handleFormChange} placeholder="email@example.com" className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            CARD 5: OTHER
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <FileText className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Other</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              <label className="flex items-center gap-2 pb-2.5 cursor-pointer select-none">
                <input type="checkbox" name="excludedFromRenting" checked={form.excludedFromRenting} onChange={handleFormChange} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                <span className="text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">Excluded from renting</span>
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={`${labelClass} block`}>Comments</label>
              <textarea name="comments" value={form.comments} onChange={handleFormChange} rows={3} placeholder="Additional notes or comments" className={`${inputClass} resize-none`} />
            </div>
          </div>
        </div>
        {/* ─── Action Buttons ──────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button onClick={handleCancel} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-500 hover:bg-slate-600 text-white text-sm font-medium transition-colors">
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={!form.occupantName || saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : (editingId ? 'Update' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
