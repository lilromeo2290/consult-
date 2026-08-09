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
  Home,
  MapPin,
  User,
  Building2,
  Save,
  Crosshair,
  Loader2,
  X,
  Download,
  Upload,
  Briefcase,
} from 'lucide-react';
import { exportToExcel, importFromExcel, PROPERTY_FIELDS } from '@/lib/import-export';
import { LOCALITIES, LOCALITY_AREA_CODE_MAP } from '@/lib/localities';
import { REVENUE_DESCRIPTIONS } from '@/lib/revenue-descriptions';
import { PROPERTY_REVENUE_CODES, PROP_CODE_TO_DESC, PROP_DESC_TO_CODE } from '@/lib/property-revenue-codes';
import {
  PROP_CODE_TO_CLASS,
  PROP_CLASS_TO_FIRST_CODE,
  PROP_CLASS_TO_CODES,
  PROP_CODE_TO_CATEGORY,
  PROPERTY_CLASS_CODES,
  PROPERTY_CLASS_NAMES,
} from '@/lib/property-class-code-map';
import { Combobox } from '@/components/ui/combobox';
import { AutoSuggestInput } from '@/components/ui/auto-suggest-input';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Property {
  propNumber: string;
  streetName: string;
  houseNo: string;
  streetCode: string;
  ghanaPostGPS: string;
  latitude: string;
  longitude: string;
  locality: string;
  areaCode: string;
  code: string;
  ownerName: string;
  ownerAddress: string;
  ownerLatitude: string;
  ownerLongitude: string;
  phone: string;
  email: string;
  tin: string;
  ownerTin: string;
  nationalId: string;
  ownershipType: string;
  propertyUseType: string;
  category: string;
  value: string;
  rooms: string;
  hasBuildingPermit: string;
  permitNumber: string;
  excludedFromRating: boolean;
  comments: string;
  // New fields (matching Businesses arrangement)
  daAssignmentNo: string;
  propertyUniqueNumber: string;
  propertyCertNo: string;
  revenueDescription: string;
  revenueDescription2: string;
  revenueCode: string;
  businessClassCode: string;
  type: string;
  employees: string;
  yearEstablished: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockProperties: Property[] = [];

// ─── Constants ──────────────────────────────────────────────────────────────

const OWNERSHIP_TYPES = [
  'Private Individual',
  'Private Company',
  'Government',
  'State Enterprise',
  'Religious Body',
  'Traditional Authority',
  'Joint Ownership',
  'Other',
];

const propertyUseTypes = [
  '20121 : Residential : 3rd Class Residential : 420',
  '20122 : Residential : 2nd Class Residential : 520',
  '20123 : Residential : 1st Class Residential : 750',
  '20201 : Commercial : 3rd Class Commercial : 650',
  '20202 : Commercial : 2nd Class Commercial : 850',
  '20203 : Commercial : 1st Class Commercial : 1200',
  '20301 : Industrial : Light Industrial : 500',
  '20302 : Industrial : Heavy Industrial : 800',
  '20401 : Institutional : Educational : 400',
  '20402 : Institutional : Health : 450',
  '20501 : Mixed Use : Residential-Commercial : 900',
];

const propertyTypes = ['All', 'Residential', 'Commercial', 'Industrial', 'Institutional', 'Mixed Use'];
const occupancyStatuses = ['All', 'Occupied', 'Vacant', 'Under Construction'];

// ─── Component ───────────────────────────────────────────────────────────────

export function PropertiesPage() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingPropNumber, setEditingPropNumber] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [properties, setProperties] = useSyncedStorage<Property[]>('rms-properties', mockProperties);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 10;

  // ── Import / Export ───────────────────────────────────────────────────────
  const handleExport = () => {
    if (properties.length === 0) { alert('No properties to export.'); return; }
    exportToExcel(properties as unknown as Record<string, unknown>[], PROPERTY_FIELDS, 'Properties');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importFromExcel<Property>(file, PROPERTY_FIELDS);
      if (imported.length === 0) { alert('No data found in the file.'); return; }
      const existing = new Map(properties.map((p) => [p.propNumber, p]));
      for (const item of imported) {
        const key = item.propNumber || `IMP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        item.propNumber = key;
        existing.set(key, item);
      }
      setProperties(Array.from(existing.values()));
      alert(`${imported.length} propert(y/ies) imported successfully.`);
    } catch (err) {
      alert('Failed to import file. Please ensure it is a valid Excel file exported from this system.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Auto-generate functions ───────────────────────────────────────────────
  const generatePropertyUniqueNumber = (areaCode?: string) => {
    const nextNum = properties.length + 1;
    const prefix = areaCode || 'KpMA/KZC/ABX';
    return `${prefix}/PR/${String(nextNum).padStart(4, '0')}`;
  };

  const generatePropertyCertNo = () => {
    const nextNum = properties.length + 1;
    return `GPC-${String(nextNum).padStart(4, '0')}`;
  };

  const generateDaAssignmentNo = () => {
    const yearSuffix = String(new Date().getFullYear()).slice(-2);
    const nextNum = properties.length + 1;
    return `KpMA-${yearSuffix}-${String(nextNum).padStart(4, '0')}/PR`;
  };

  // ── Form State ───────────────────────────────────────────────────────────
  const defaultForm = {
    propNumber: '',
    streetName: '',
    houseNo: '',
    streetCode: '',
    ghanaPostGPS: '',
    latitude: '',
    longitude: '',
    locality: '',
    areaCode: '',
    code: '',
    ownerName: '',
    ownerAddress: '',
    ownerLatitude: '',
    ownerLongitude: '',
    phone: '',
    email: '',
    tin: '',
    ownerTin: '',
    nationalId: '',
    ownershipType: '',
    propertyUseType: '',
    category: '',
    value: '',
    rooms: '',
    hasBuildingPermit: 'No',
    permitNumber: '',
    excludedFromRating: false,
    comments: '',
    // New fields
    daAssignmentNo: '',
    propertyUniqueNumber: '',
    propertyCertNo: '',
    revenueDescription: '',
    revenueDescription2: '',
    revenueCode: '',
    businessClassCode: '',
    type: '',
    employees: '',
    yearEstablished: '',
  };

  const [form, setForm] = useState({ ...defaultForm });
  const [locating, setLocating] = useState(false);
  const [locatingOwner, setLocatingOwner] = useState(false);

  // Property Revenue Code/Description Search
  const propRevenueCodeRef = useRef<HTMLDivElement>(null);
  const propRevenueDescRef = useRef<HTMLDivElement>(null);
  const [propRevenueCodeSearch, setPropRevenueCodeSearch] = useState('');
  const [propRevenueDescSearch, setPropRevenueDescSearch] = useState('');
  const [propRevenueCodeShowDropdown, setPropRevenueCodeShowDropdown] = useState(false);
  const [propRevenueDescShowDropdown, setPropRevenueDescShowDropdown] = useState(false);

  const propRevenueCodeFiltered = propRevenueCodeSearch
    ? PROPERTY_REVENUE_CODES.filter(
        (item) =>
          item.code.includes(propRevenueCodeSearch) ||
          item.description.toLowerCase().includes(propRevenueCodeSearch.toLowerCase())
      )
    : PROPERTY_REVENUE_CODES;

  const propRevenueDescFiltered = propRevenueDescSearch
    ? PROPERTY_REVENUE_CODES.filter(
        (item) =>
          item.description.toLowerCase().includes(propRevenueDescSearch.toLowerCase()) ||
          item.code.includes(propRevenueDescSearch)
      )
    : PROPERTY_REVENUE_CODES;

  const handlePropRevenueSelect = (item: { code: string; description: string }) => {
    setForm((prev) => ({ ...prev, revenueCode: item.code, revenueDescription: item.description }));
    setPropRevenueCodeSearch(item.code);
    setPropRevenueDescSearch(item.description);
    setPropRevenueCodeShowDropdown(false);
    setPropRevenueDescShowDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (propRevenueCodeRef.current && !propRevenueCodeRef.current.contains(e.target as Node)) {
        setPropRevenueCodeShowDropdown(false);
      }
      if (propRevenueDescRef.current && !propRevenueDescRef.current.contains(e.target as Node)) {
        setPropRevenueDescShowDropdown(false);
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

  // ── Derived categories for class-based filtering ────────────────────────
  // ── Autocomplete suggestion sources from existing properties ────────────
  const daAssignmentSuggestions = [...new Set(properties.map((p) => (p as any).daAssignmentNo).filter(Boolean))];
  const propertyUniqueNoSuggestions = [...new Set(properties.map((p) => (p as any).propertyUniqueNumber).filter(Boolean))];
  const propertyUseTypeOptions = propertyUseTypes.map((t) => ({ value: t, label: t }));

  // Wrapper to handle Combobox's select-like onChange for AutoSuggestInput
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFormChange(e as unknown as React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>);
  };

  const classCodes = form.type ? (PROP_CLASS_TO_CODES[form.type] || []) : [];
  const classCategories = classCodes
    .map((code) => PROP_CODE_TO_CATEGORY[code])
    .filter(Boolean);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = properties.filter((p) => {
    const matchSearch =
      searchQuery === '' ||
      p.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.propNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ((p as any).propertyUniqueNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.streetName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'All' || p.propertyUseType.toLowerCase().includes(typeFilter.toLowerCase());
    return matchSearch && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIdx = (safeCurrentPage - 1) * itemsPerPage;
  const paged = filtered.slice(startIdx, startIdx + itemsPerPage);
  const showingFrom = filtered.length === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(startIdx + itemsPerPage, filtered.length);

  // ── Handlers ─────────────────────────────────────────────────────────────
  // Derived: unique categories from propertyUseTypes
  const categories = [...new Set(propertyUseTypes.map((t) => t.split(':')[1]?.trim()).filter(Boolean))];

  // Derived: sub-categories for the selected category
  const subCategories = form.category
    ? propertyUseTypes.filter((t) => t.split(':')[1]?.trim() === form.category)
    : [];

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
      // Update property unique number whenever area code changes
      if ((name === 'locality' || name === 'areaCode') && updated.areaCode) {
        const nextNum = properties.length + 1;
        updated.propertyUniqueNumber = `${updated.areaCode}/PR/${String(nextNum).padStart(4, '0')}`;
      }
      // Link Revenue Description <-> Revenue Code
      if (name === 'revenueDescription' && PROP_DESC_TO_CODE[updated.revenueDescription]) {
        updated.revenueCode = PROP_DESC_TO_CODE[updated.revenueDescription];
      }
      if (name === 'revenueCode' && PROP_CODE_TO_DESC[updated.revenueCode]) {
        updated.revenueDescription = PROP_CODE_TO_DESC[updated.revenueCode];
      }
      // Link Property Class <-> Property Class Code
      if (name === 'type' && PROP_CLASS_TO_FIRST_CODE[updated.type]) {
        updated.businessClassCode = PROP_CLASS_TO_FIRST_CODE[updated.type];
        // Also auto-fill category from the default code
        const defaultCode = PROP_CLASS_TO_FIRST_CODE[updated.type];
        if (PROP_CODE_TO_CATEGORY[defaultCode]) {
          updated.category = PROP_CODE_TO_CATEGORY[defaultCode];
        }
      }
      if (name === 'businessClassCode') {
        const code = updated.businessClassCode;
        // Auto-fill Property Class from code mapping
        if (PROP_CODE_TO_CLASS[code]) {
          updated.type = PROP_CODE_TO_CLASS[code];
        }
        // Auto-fill category from property code mapping
        if (PROP_CODE_TO_CATEGORY[code]) {
          updated.category = PROP_CODE_TO_CATEGORY[code];
        }
      }
      return updated;
    });
  };

  const handleSave = () => {
    // Validate compulsory fields
    const missing: string[] = [];
    if (!form.ownerName?.trim()) missing.push('Owner Name');
    if (!form.propertyUseType) missing.push('Property Use Type');
    if (!form.locality?.trim()) missing.push('Locality');
    if (!form.streetName?.trim()) missing.push('Street Name');
    if (!form.houseNo?.trim()) missing.push('House Number');
    if (missing.length > 0) {
      alert('Please complete the following required field(s):\n\n' + missing.map((f) => '• ' + f).join('\n'));
      return;
    }
    const propNum = form.propNumber || `UPN-${String(properties.length + 1).padStart(4, '0')}`;
    const newProp: Property = {
      propNumber: propNum,
      ...form,
    };

    if (editingPropNumber) {
      setProperties((prev) =>
        prev.map((p) =>
          p.propNumber === editingPropNumber
            ? { ...p, ...newProp }
            : p
        )
      );
    } else {
      setProperties((prev) => [...prev, newProp]);
    }

    toast.success('Successfully saved');
    setEditingPropNumber(null);
    setForm({ ...defaultForm });
    setView('list');
  };

  const handleCancel = () => {
    setEditingPropNumber(null);
    setForm({ ...defaultForm });
    setView('list');
  };

  const handleEdit = (prop: Property) => {
    setEditingPropNumber(prop.propNumber);
    setForm({
      propNumber: prop.propNumber,
      streetName: prop.streetName,
      houseNo: prop.houseNo,
      streetCode: prop.streetCode,
      ghanaPostGPS: prop.ghanaPostGPS,
      latitude: prop.latitude,
      longitude: prop.longitude,
      locality: prop.locality,
      areaCode: (prop as any).areaCode || '',
      code: prop.code,
      ownerName: prop.ownerName,
      ownerAddress: prop.ownerAddress,
      ownerLatitude: prop.ownerLatitude,
      ownerLongitude: prop.ownerLongitude,
      phone: prop.phone,
      email: prop.email,
      tin: prop.tin,
      ownerTin: (prop as any).ownerTin || '',
      nationalId: prop.nationalId,
      ownershipType: prop.ownershipType,
      propertyUseType: prop.propertyUseType,
      category: prop.category,
      value: prop.value,
      rooms: prop.rooms,
      hasBuildingPermit: prop.hasBuildingPermit,
      permitNumber: prop.permitNumber,
      excludedFromRating: prop.excludedFromRating,
      comments: prop.comments,
      daAssignmentNo: (prop as any).daAssignmentNo || '',
      propertyUniqueNumber: (prop as any).propertyUniqueNumber || '',
      propertyCertNo: (prop as any).propertyCertNo || '',
      revenueDescription: (prop as any).revenueDescription || '',
      revenueDescription2: (prop as any).revenueDescription2 || '',
      revenueCode: (prop as any).revenueCode || '',
      businessClassCode: (prop as any).businessClassCode || '',
      type: (prop as any).type || '',
      employees: (prop as any).employees || '',
      yearEstablished: (prop as any).yearEstablished || '',
    });
    setView('form');
  };

  const handleDelete = (propNumber: string) => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) return;
    setProperties((prev) => prev.filter((p) => p.propNumber !== propNumber));
  };

  // ── Form Helpers ─────────────────────────────────────────────────────────
  const inputClass =
    'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition';
  const labelClass =
    'text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Property Registration</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage and register properties within the assembly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditingPropNumber(null); setForm({ ...defaultForm, propertyUniqueNumber: generatePropertyUniqueNumber(), propertyCertNo: generatePropertyCertNo(), daAssignmentNo: generateDaAssignmentNo() }); setView('form'); }}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Register New Property
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
              placeholder="Search by Property Unique Number, owner, or street..."
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
            {propertyTypes.map((t) => (
              <option key={t} value={t}>{t === 'All' ? 'All Property Types' : t}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className={`${inputClass} w-full sm:w-48`}
          >
            {occupancyStatuses.map((s) => (
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
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Property Unique Number</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Owner</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Property Use Type</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Value</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Street</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 dark:text-slate-500">
                      <Home className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      No properties found.
                    </td>
                  </tr>
                ) : (
                  paged.map((prop) => (
                    <tr key={prop.propNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">{(prop as any).propertyUniqueNumber || prop.propNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">{prop.ownerName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap max-w-[200px] truncate">{(prop.propertyUseType || '').split(':')[1] ? (prop.propertyUseType || '').split(':')[1].trim() : (prop.propertyUseType || '')}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatVal(prop.value)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{prop.streetName}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => handleEdit(prop)} className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer" title="Edit"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(prop.propNumber)} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
            {editingPropNumber ? 'Edit Property' : 'Register New Property'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {editingPropNumber ? 'Update the property details below.' : 'Fill in the details below to register a new property.'}
          </p>
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
                <input type="text" name="streetName" value={form.streetName} onChange={handleFormChange} placeholder="e.g. Powder St" className={inputClass} />
              </div>
              {/* Ghana Post GPS */}
              <div>
                <label className={`${labelClass} block`}>Ghana Post GPS</label>
                <input type="text" name="ghanaPostGPS" value={form.ghanaPostGPS} onChange={handleFormChange} placeholder="e.g. AK-034-5521" className={inputClass} />
              </div>
              {/* GPS: Latitude & Longitude */}
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>GPS Coordinates</label>
                <div className="flex gap-2">
                  <input type="text" name="latitude" value={form.latitude} onChange={handleFormChange} placeholder="Latitude" className={`${inputClass} flex-1`} />
                  <input type="text" name="longitude" value={form.longitude} onChange={handleFormChange} placeholder="Longitude" className={`${inputClass} flex-1`} />
                  <button type="button" onClick={fetchGps} disabled={locating} className="inline-flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50 transition-colors text-xs font-medium whitespace-nowrap">
                    {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                    {locating ? '...' : 'GPS'}
                  </button>
                </div>
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
              {/* Code (auto from locality) */}
              <div>
                <label className={`${labelClass} block`}>Code</label>
                <input type="text" name="code" value={form.code} readOnly placeholder="Auto-generated from locality" className={`${inputClass} bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400`} />
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            CARD 2: PROPERTY INFORMATION
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <Briefcase className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Property Information</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              {/* DA Assignment No. / Property Permit */}
              <div>
                <label className={`${labelClass} block`}>DA Assignment No. / Property Permit</label>
                <AutoSuggestInput
                  name="daAssignmentNo"
                  value={form.daAssignmentNo}
                  onChange={handleInputChange}
                  suggestions={daAssignmentSuggestions}
                  placeholder="Type to search existing or enter new..."
                  className={inputClass}
                />
              </div>
              {/* Property Unique Number */}
              <div>
                <label className={`${labelClass} block`}>Property Unique Number</label>
                <AutoSuggestInput
                  name="propertyUniqueNumber"
                  value={form.propertyUniqueNumber}
                  onChange={handleInputChange}
                  suggestions={propertyUniqueNoSuggestions}
                  placeholder="Type to search existing or enter new..."
                  className={inputClass}
                />
              </div>
              {/* Property Revenue Code */}
              <div>
                <label className={`${labelClass} block`}>Property Revenue Code</label>
                <div className="relative" ref={propRevenueCodeRef}>
                  <input
                    type="text"
                    value={propRevenueCodeShowDropdown ? propRevenueCodeSearch : form.revenueCode}
                    onChange={(e) => { setPropRevenueCodeSearch(e.target.value); setPropRevenueCodeShowDropdown(true); }}
                    onFocus={() => { setPropRevenueCodeSearch(form.revenueCode || ''); setPropRevenueCodeShowDropdown(true); }}
                    placeholder="Type to search code..."
                    className={inputClass}
                  />
                  {propRevenueCodeShowDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg">
                      {propRevenueCodeFiltered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-400">No matches</div>
                      ) : propRevenueCodeFiltered.slice(0, 50).map((item) => (
                        <button key={item.code} type="button" onClick={() => { handlePropRevenueSelect(item); setPropRevenueCodeShowDropdown(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0">
                          <span className="font-mono text-xs text-slate-500 mr-2">{item.code}</span>
                          <span className="text-slate-800 dark:text-white">{item.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Property Revenue Description */}
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>Property Revenue Description</label>
                <div className="relative" ref={propRevenueDescRef}>
                  <input
                    type="text"
                    value={propRevenueDescShowDropdown ? propRevenueDescSearch : form.revenueDescription}
                    onChange={(e) => { setPropRevenueDescSearch(e.target.value); setPropRevenueDescShowDropdown(true); }}
                    onFocus={() => { setPropRevenueDescSearch(form.revenueDescription || ''); setPropRevenueDescShowDropdown(true); }}
                    placeholder="Type to search description..."
                    className={inputClass}
                  />
                  {propRevenueDescShowDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg">
                      {propRevenueDescFiltered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-400">No matches</div>
                      ) : propRevenueDescFiltered.slice(0, 50).map((item) => (
                        <button key={item.code} type="button" onClick={() => { handlePropRevenueSelect(item); setPropRevenueDescShowDropdown(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0">
                          <span className="text-slate-800 dark:text-white">{item.description}</span>
                          <span className="ml-2 font-mono text-xs text-slate-400">{item.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Property Use Type */}
              <div>
                <label className={`${labelClass} block`}>Property Use Type <span className="text-red-500">*</span></label>
                <Combobox
                  name="propertyUseType"
                  value={form.propertyUseType}
                  onChange={handleFormChange}
                  options={propertyUseTypeOptions}
                  placeholder="Type to search use types..."
                  emptyMessage="No matching use type"
                  className={inputClass}
                />
              </div>
              {/* Value */}
              <div>
                <label className={`${labelClass} block`}>Value (GHS)</label>
                <input type="number" name="value" value={form.value} onChange={handleFormChange} placeholder="0.00" min="0" className={inputClass} />
              </div>
              {/* Rooms */}
              <div>
                <label className={`${labelClass} block`}>Rooms</label>
                <input type="number" name="rooms" value={form.rooms} onChange={handleFormChange} placeholder="e.g. 3" min="0" className={inputClass} />
              </div>
              {/* Building Permit */}
              <div>
                <label className={`${labelClass} block`}>Building Permit</label>
                <div className="flex items-center gap-6 mt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="hasBuildingPermit" value="Yes" checked={form.hasBuildingPermit === 'Yes'} onChange={handleFormChange} className="accent-emerald-600 w-4 h-4" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Yes</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="hasBuildingPermit" value="No" checked={form.hasBuildingPermit === 'No'} onChange={handleFormChange} className="accent-emerald-600 w-4 h-4" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">No</span>
                  </label>
                </div>
              </div>
              {/* Permit Number */}
              <div>
                <label className={`${labelClass} block`}>Permit Number</label>
                <input type="text" name="permitNumber" value={form.permitNumber} onChange={handleFormChange} placeholder="Enter permit number" disabled={form.hasBuildingPermit === 'No'} className={`${inputClass} ${form.hasBuildingPermit === 'No' ? 'opacity-50 cursor-not-allowed' : ''}`} />
              </div>
              {/* Excluded from rating */}
              <div className="flex items-end">
                <label className="flex items-center gap-2 pb-2.5 cursor-pointer select-none">
                  <input type="checkbox" name="excludedFromRating" checked={form.excludedFromRating} onChange={handleFormChange} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Excluded from rating</span>
                </label>
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
                <input type="text" name="ownerName" value={form.ownerName} onChange={handleFormChange} placeholder="Enter full name of property owner" className={inputClass} />
              </div>
              {/* National ID */}
              <div>
                <label className={`${labelClass} block`}>National ID</label>
                <input type="text" name="nationalId" value={form.nationalId} onChange={handleFormChange} placeholder="e.g. GHA-123456789-0" className={inputClass} />
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
              {/* Owner TIN */}
              <div>
                <label className={`${labelClass} block`}>Owner TIN</label>
                <input type="text" name="ownerTin" value={form.ownerTin} onChange={handleFormChange} placeholder="Owner's TIN" className={inputClass} />
              </div>
              {/* Owner Address - full width */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Owner Address</label>
                <input type="text" name="ownerAddress" value={form.ownerAddress} onChange={handleFormChange} placeholder="Enter owner address" className={inputClass} />
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
          <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors cursor-pointer">
            <Save className="w-4 h-4" />
            {editingPropNumber ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
