'use client';

import { useState, useRef } from 'react';
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
  // Rent Object
  rentObjectName: string;
  rentRevenueCode: string;
  rentRevenueDescription: string;
  rentCode: string;
  rentClass: string;
  rentCategory: string;
  rentUnit: string;
  rentValue: string;
  vacant: string;
  // Contract
  startDate: string;
  endDate: string;
  contractId: string;
  contractValue: string;
  area: string;
  // Renter Information
  renterName: string;
  renterAddress: string;
  renterGhanaPostGPS: string;
  renterLatitude: string;
  renterLongitude: string;
  phone: string;
  email: string;
  tin: string;
  nationalId: string;
  // Other
  excludedFromRenting: boolean;
  comments: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockRents: Rent[] = [];

// ─── Constants ──────────────────────────────────────────────────────────────

const RENT_CODE_MAP: Record<string, string> = {
  'Bill Boards|CAT A': '50010001',
  'Bill Boards|CAT B': '50010002',
  'Bill Boards|CAT C': '50010003',
  'Assembly Hall|CAT A - Large': '50020101',
  'Assembly Hall|CAT B - Medium': '50020102',
  'Assembly Hall|CAT C - Small': '50020103',
  'Assembly Conference Room|Assembly Conference Room': '50020301',
  'Community Centres|Community Centres': '50020401',
  'Sub-district/Metro Halls|Sub-district/Metro Halls': '50020501',
  'Assembly Forecourt|Assembly Forecourt': '50020601',
  'Stores|CAT A - In CBD (Central Business District)': '50030101',
  'Stores|CAT B - Satellite Markets': '50030102',
  'Stores|CAT C - Outside CBD': '50030103',
  'Stores|CAT D - Sub District Store': '50030104',
  'Stalls|CAT A - In CBD': '50030201',
  'Stalls|CAT B - Satellite Market': '50030202',
  'Stalls|CAT C - Outside CBD': '50030203',
  'Stalls|CAT D - Sub District Store': '50030204',
  'Sheds|CAT A - In CBD': '50030301',
  'Sheds|CAT B - Satellite Markets': '50030302',
  'Sheds|CAT C - Outside CBD': '50030303',
  'Sheds|CAT D - Sub District Store': '50030304',
  'Others|Others': '50030401',
  'Rent of Undeveloped Lands|Rent of Undeveloped Lands': '50040001',
  'Hiring of Parks|CAT A - Government Recreational Park': '50040002',
  'Hiring of Parks|CAT B - Lorry Park (space rent)': '50040003',
  'Hiring of Parks|CAT C - Parade Grounds (Jubilee Parks)': '50040004',
  'Hiring of Parks|CAT D - School Compound (Social functions)': '50040005',
  'Rent on Leased Buildings|Rent on Leased Buildings': '50050001',
  'Rent for Vendor Stands|Rent for Vendor Stands': '50060001',
  'Guest House|Guest House': '50070001',
  'Restaurant/Canteen|Restaurant/Canteen': '50070002',
  'Club House|Club House': '50070003',
  'Stadium|Stadium': '50070004',
};

const RENT_CLASS_CATEGORIES: Record<string, string[]> = {
  'Bill Boards': ['CAT A', 'CAT B', 'CAT C'],
  'Assembly Hall': ['CAT A - Large', 'CAT B - Medium', 'CAT C - Small'],
  'Assembly Conference Room': ['Assembly Conference Room'],
  'Community Centres': ['Community Centres'],
  'Sub-district/Metro Halls': ['Sub-district/Metro Halls'],
  'Assembly Forecourt': ['Assembly Forecourt'],
  'Others': ['Others'],
  'Stores': ['CAT A - In CBD (Central Business District)', 'CAT B - Satellite Markets', 'CAT C - Outside CBD', 'CAT D - Sub District Store'],
  'Stalls': ['CAT A - In CBD', 'CAT B - Satellite Market', 'CAT C - Outside CBD', 'CAT D - Sub District Store'],
  'Sheds': ['CAT A - In CBD', 'CAT B - Satellite Markets', 'CAT C - Outside CBD', 'CAT D - Sub District Store'],
  'Rent of Undeveloped Lands': ['Rent of Undeveloped Lands'],
  'Hiring of Parks': ['CAT A - Government Recreational Park', 'CAT B - Lorry Park (space rent)', 'CAT C - Parade Grounds (Jubilee Parks)', 'CAT D - School Compound (Social functions)'],
  'Rent on Leased Buildings': ['Rent on Leased Buildings'],
  'Rent for Vendor Stands': ['Rent for Vendor Stands'],
  'Guest House': ['Guest House'],
  'Restaurant/Canteen': ['Restaurant/Canteen'],
  'Club House': ['Club House'],
  'Stadium': ['Stadium'],
};

const RENT_CATEGORIES = [...new Set(Object.values(RENT_CLASS_CATEGORIES).flat())];

const RENT_CLASSES = Object.keys(RENT_CLASS_CATEGORIES);

const RENT_UNITS = [
  'Whole Building',
  'Single Room',
  'Flat/Apartment',
  'Office Space',
  'Warehouse',
  'Shop/Stall',
  'Hall/Event Space',
  'Other',
];

const VACANT_OPTIONS = ['Yes', 'No'];

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
    rentObjectName: '',
    rentRevenueCode: '',
    rentRevenueDescription: '',
    rentCode: '',
    rentClass: '',
    rentCategory: '',
    rentUnit: '',
    rentValue: '',
    vacant: 'No',
    startDate: '',
    endDate: '',
    contractId: '',
    contractValue: '',
    area: '',
    renterName: '',
    renterAddress: '',
    renterGhanaPostGPS: '',
    renterLatitude: '',
    renterLongitude: '',
    phone: '',
    email: '',
    tin: '',
    nationalId: '',
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
      r.renterName.toLowerCase().includes(q) ||
      r.upn.toLowerCase().includes(q) ||
      r.rentPropertyLocation.toLowerCase().includes(q) ||
      r.rentObjectName.toLowerCase().includes(q) ||
      r.rentClass.toLowerCase().includes(q) ||
      r.contractId.toLowerCase().includes(q);
    const matchClass = classFilter === 'All' || r.rentClass === classFilter;
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
    } else if (name === 'rentClass') {
      // Auto-fill category: if only one option, select it; otherwise reset
      const cats = RENT_CLASS_CATEGORIES[value] || [];
      const autoCat = cats.length === 1 ? cats[0] : '';
      const autoCode = autoCat ? (RENT_CODE_MAP[`${value}|${autoCat}`] || '') : '';
      setForm((prev) => ({ ...prev, rentClass: value, rentCategory: autoCat, rentCode: autoCode }));
    } else if (name === 'rentCategory') {
      // Auto-fill code when category is selected
      const code = RENT_CODE_MAP[`${form.rentClass}|${value}`] || '';
      setForm((prev) => ({ ...prev, rentCategory: value, rentCode: code }));
    } else if (name === 'rentRevenueDescription') {
      // Link Rent Revenue Description -> Rent Revenue Code
      setForm((prev) => ({
        ...prev,
        rentRevenueDescription: value,
        rentRevenueCode: DESCRIPTION_TO_CODE[value] || prev.rentRevenueCode,
      }));
    } else if (name === 'rentRevenueCode') {
      // Link Rent Revenue Code -> Rent Revenue Description
      setForm((prev) => ({
        ...prev,
        rentRevenueCode: value,
        rentRevenueDescription: CODE_TO_DESCRIPTION[value] || prev.rentRevenueDescription,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.renterName) {
      alert('Please fill in the required field: Renter Name.');
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
      rentObjectName: rent.rentObjectName,
      rentRevenueCode: rent.rentRevenueCode || '',
      rentRevenueDescription: rent.rentRevenueDescription || '',
      rentCode: rent.rentCode || '',
      rentClass: rent.rentClass,
      rentCategory: rent.rentCategory || (RENT_CLASS_CATEGORIES[rent.rentClass]?.[0]) || '',
      rentUnit: rent.rentUnit,
      rentValue: rent.rentValue,
      vacant: rent.vacant,
      startDate: rent.startDate,
      endDate: rent.endDate,
      contractId: rent.contractId,
      contractValue: rent.contractValue,
      area: rent.area,
      renterName: rent.renterName,
      renterAddress: rent.renterAddress,
      renterGhanaPostGPS: rent.renterGhanaPostGPS,
      renterLatitude: rent.renterLatitude,
      renterLongitude: rent.renterLongitude,
      phone: rent.phone,
      email: rent.email,
      tin: rent.tin,
      nationalId: rent.nationalId,
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
              onClick={() => { setForm(defaultForm); setEditingId(null); setView('form'); }}
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
              placeholder="Search by renter, UPN, location, rent object, class..."
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
            <option value="All">All Rent Classes</option>
            {RENT_CLASSES.map((c) => (
              <option key={c} value={c}>{c}</option>
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
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">UPN</th>
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
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">{rent.renterName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap max-w-[200px] truncate">{rent.rentObjectName || '--'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{rent.rentClass || '--'}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{rent.rentValue ? `GHS ${Number(rent.rentValue).toLocaleString()}` : '-'}</td>
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
          <button type="button" onClick={handleSave} disabled={!form.renterName || saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
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
                <input type="text" name="rentPropertyLocation" value={form.rentPropertyLocation} onChange={handleFormChange} placeholder="Search to select property location" className={inputClass} />
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
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>GPS Coordinates (Lat/Long)</label>
                <div className="flex gap-1.5">
                  <input type="text" value={form.propertyLatitude && form.propertyLongitude ? `${form.propertyLatitude}, ${form.propertyLongitude}` : ''} placeholder="e.g. 5.603717, -0.187028 (Auto-generated)" className={`${inputClass} bg-slate-50 dark:bg-slate-900/40`} readOnly />
                  <button type="button" onClick={fetchGps} disabled={locating} className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium transition-colors" title="Detect GPS">
                    {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            CARD 2: RENT OBJECT
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <Building2 className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Rent Object</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Rent Object Name</label>
                <input type="text" name="rentObjectName" value={form.rentObjectName} onChange={handleFormChange} placeholder="Enter rent object name" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Rent Revenue Code</label>
                <input type="text" name="rentRevenueCode" value={form.rentRevenueCode} onChange={handleFormChange} placeholder="e.g. 1412025" className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>Rent Revenue Description</label>
                <input type="text" name="rentRevenueDescription" value={form.rentRevenueDescription} onChange={handleFormChange} placeholder="Select or enter revenue description" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Rent Class</label>
                <select name="rentClass" value={form.rentClass} onChange={handleFormChange} className={inputClass}>
                  <option value="">Select rent class</option>
                  {RENT_CLASSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`${labelClass} block`}>Rent Unit</label>
                <select name="rentUnit" value={form.rentUnit} onChange={handleFormChange} className={inputClass}>
                  <option value="">Select unit</option>
                  {RENT_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`${labelClass} block`}>Vacant</label>
                <select name="vacant" value={form.vacant} onChange={handleFormChange} className={inputClass}>
                  {VACANT_OPTIONS.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`${labelClass} block`}>Rent Value (GHS)</label>
                <input type="number" name="rentValue" value={form.rentValue} onChange={handleFormChange} placeholder="0.00" min="0" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Category</label>
                <select name="rentCategory" value={form.rentCategory} onChange={handleFormChange} disabled={!form.rentClass} className={inputClass}>
                  <option value="">{form.rentClass ? 'Select category' : 'Select class first'}</option>
                  {(RENT_CLASS_CATEGORIES[form.rentClass] || []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`${labelClass} block`}>Code</label>
                <input type="text" name="rentCode" value={form.rentCode} readOnly className={`${inputClass} bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-not-allowed`} placeholder="Auto-filled" />
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
            CARD 4: RENTER INFORMATION
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <User className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Renter Information</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              {/* Renter Name — full width */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Renter Name <span className="text-red-500">*</span></label>
                <input type="text" name="renterName" value={form.renterName} onChange={handleFormChange} placeholder="Enter full name of renter" className={inputClass} />
              </div>
              {/* Renter Address | Renter GhanaPost GPS */}
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>Renter Address</label>
                <input type="text" name="renterAddress" value={form.renterAddress} onChange={handleFormChange} placeholder="Enter renter address" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Renter GhanaPost GPS</label>
                <input type="text" name="renterGhanaPostGPS" value={form.renterGhanaPostGPS} onChange={handleFormChange} placeholder="XX-XXX-XXXX" className={inputClass} />
              </div>
              {/* Phone | Email | TIN */}
              <div>
                <label className={`${labelClass} block`}>Phone</label>
                <input type="text" name="phone" value={form.phone} onChange={handleFormChange} placeholder="e.g. 024 XXX XXXX" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Email</label>
                <input type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="email@example.com" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>TIN</label>
                <input type="text" name="tin" value={form.tin} onChange={handleFormChange} placeholder="Tax Identification Number" className={inputClass} />
              </div>
              {/* National ID — full width */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>National ID</label>
                <input type="text" name="nationalId" value={form.nationalId} onChange={handleFormChange} placeholder="e.g. GHA-XXXXXXXXX" className={inputClass} />
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
          <button type="button" onClick={handleSave} disabled={!form.renterName || saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : (editingId ? 'Update' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
