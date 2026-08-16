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
  PROP_DEFAULT_RATES,
} from '@/lib/property-class-code-map';
import { VALUED_DEFAULT_RATES } from '@/lib/valued-property-class-code-map';
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
  category: string;
  value: string;
  rooms: string;
  hasBuildingPermit: string;
  permitNumber: string;
  excludedFromRating: boolean;
  valuedProperty: string;
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

const propertyTypes = ['All', 'Residential', 'Commercial', 'Industrial', 'Institutional', 'Mixed Use'];
const occupancyStatuses = ['All', 'Occupied', 'Vacant', 'Under Construction'];

// ─── Property Register Component ───────────────────────────────────────

const _PROPS_VERSION = '2.1';

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

    category: '',
    value: '',
    rooms: '',
    hasBuildingPermit: 'No',
    permitNumber: '',
    excludedFromRating: false,
    valuedProperty: 'No',
    comments: '',
    // New fields
    daAssignmentNo: '',
    propertyUniqueNumber: '',
    propertyCertNo: '',
    revenueDescription: 'Property Rate',
    revenueDescription2: '',
    revenueCode: '1413001',
    businessClassCode: '',
    type: '',
    employees: '',
    yearEstablished: '',
  };

  const [form, setForm] = useState({ ...defaultForm });
  const [locating, setLocating] = useState(false);
  const [locatingOwner, setLocatingOwner] = useState(false);

  // ── Valued Property Dialog State ───────────────────────────────────────
  const [showValuedDialog, setShowValuedDialog] = useState(false);
  const [showAmountDialog, setShowAmountDialog] = useState(false);
  const [valuedAmountInput, setValuedAmountInput] = useState('');
  const valuedDialogTriggered = useRef<string>(''); // tracks which code triggered it

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

  // ── Valued Property Dialog Trigger ──────────────────────────────────────
  // When Code + Class + Category are all selected, ask if it's a valued property
  useEffect(() => {
    const code = form.businessClassCode;
    const cls = form.type;
    const cat = form.category;
    if (code && cls && cat && code !== valuedDialogTriggered.current) {
      valuedDialogTriggered.current = code;
      setShowValuedDialog(true);
    }
  }, [form.businessClassCode, form.type, form.category]);

  // Helper: fetch rate from DB, fallback to defaults
  const fetchRateForCode = async (dbKey: string, code: string, defaults: Record<string, number>): Promise<number> => {
    try {
      const res = await fetch(`/api/rms-data?key=${dbKey}&_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const data = json?.data || json;
        if (data && data[code] && typeof data[code].amount === 'number') return data[code].amount;
      }
    } catch { /* fallback to default */ }
    return defaults[code] ?? 0;
  };

  // Handle "Not Valued" → use flat rate from Rate Config (Property)
  const handleNotValued = async () => {
    const code = form.businessClassCode;
    setShowValuedDialog(false);
    const rate = await fetchRateForCode('rms-rate-overrides-property', code, PROP_DEFAULT_RATES);
    setForm((p) => ({ ...p, value: String(rate), valuedProperty: 'No' }));
  };

  // Handle "Valued" → show amount input dialog
  const handleValuedYes = () => {
    setShowValuedDialog(false);
    setValuedAmountInput('');
    setShowAmountDialog(true);
  };

  // Handle amount submission → multiply by valued property rate
  const handleValuedAmountSubmit = async () => {
    const amount = parseFloat(valuedAmountInput);
    if (isNaN(amount) || amount <= 0) { alert('Please enter a valid amount.'); return; }
    const code = form.businessClassCode;
    const rateFactor = await fetchRateForCode('rms-rate-overrides-valued-property', code, VALUED_DEFAULT_RATES);
    // rateFactor is a percentage (e.g., 0.50 means 0.50%)
    const calculatedValue = (amount * rateFactor) / 100;
    setShowAmountDialog(false);
    setForm((p) => ({
      ...p,
      value: calculatedValue.toFixed(2),
      valuedProperty: amount.toLocaleString(),
    }));
  };

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


  // Wrapper to handle Combobox's select-like onChange for AutoSuggestInput
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFormChange(e as unknown as React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>);
  };

  // Cascading Code/Class/Category: when Class is selected, filter codes; otherwise show all
  const classCodes = form.type ? (PROP_CLASS_TO_CODES[form.type] || []) : PROPERTY_CLASS_CODES;
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
    const matchType = typeFilter === 'All' || (p as any).type?.toLowerCase().includes(typeFilter.toLowerCase());
    return matchSearch && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIdx = (safeCurrentPage - 1) * itemsPerPage;
  const paged = filtered.slice(startIdx, startIdx + itemsPerPage);
  const showingFrom = filtered.length === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(startIdx + itemsPerPage, filtered.length);

  // ── Handlers ─────────────────────────────────────────────────────────────
  // Derived: unique categories from property class code map
  const categories = [...new Set(Object.values(PROP_CODE_TO_CATEGORY).filter(Boolean))];

  // Derived: sub-categories for the selected category
  const subCategories = form.category
    ? Object.entries(PROP_CODE_TO_CATEGORY).filter(([, v]) => v === form.category).map(([k]) => k)
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
    if (!form.locality?.trim()) missing.push('Locality');
    if (!form.streetName?.trim()) missing.push('Street Name');
    if (!form.houseNo?.trim()) missing.push('House Number');
    if (missing.length > 0) {
      alert('Please complete the following required field(s):\n\n' + missing.map((f) => '• ' + f).join('\n'));
      return;
    }

    const propNum = form.propNumber || editingPropNumber || `UPN-${String(Date.now()).padStart(4, '0')}`;
    const newProp: Property = {
      ...form,
      propNumber: propNum,
    };

    if (editingPropNumber) {
      // Find and replace the exact record by propNumber or propertyUniqueNumber
      setProperties((prev) => {
        const idx = prev.findIndex(
          (p) => p.propNumber === editingPropNumber || (p as any).propertyUniqueNumber === editingPropNumber
        );
        if (idx === -1) {
          // Fallback: try matching by owner + street combo
          const fallbackIdx = prev.findIndex(
            (p) => p.ownerName === form.ownerName && p.streetName === form.streetName && p.houseNo === form.houseNo
          );
          if (fallbackIdx !== -1) {
            const updated = [...prev];
            updated[fallbackIdx] = { ...prev[fallbackIdx], ...newProp };
            return updated;
          }
          // No match found, append as new
          return [...prev, newProp];
        }
        const updated = [...prev];
        updated[idx] = { ...prev[idx], ...newProp };
        return updated;
      });
    } else {
      // Check for duplicates before adding
      setProperties((prev) => {
        const exists = prev.some(
          (p) => p.propNumber === newProp.propNumber ||
            ((p as any).propertyUniqueNumber && (p as any).propertyUniqueNumber === newProp.propertyUniqueNumber)
        );
        if (exists) return prev;
        return [...prev, newProp];
      });
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
    // Use propertyUniqueNumber as primary edit key (more reliable), fallback to propNumber
    const editKey = (prop as any).propertyUniqueNumber || prop.propNumber;
    setEditingPropNumber(editKey);
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
      valuedProperty: (prop as any).valuedProperty || 'No',
      type: (prop as any).type || '',
      employees: (prop as any).employees || '',
      yearEstablished: (prop as any).yearEstablished || '',
    });
    valuedDialogTriggered.current = prop.businessClassCode || '';
    setView('form');
  };

  const handleDelete = (propNumber: string) => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) return;
    setProperties((prev) => prev.filter((p) => p.propNumber !== propNumber));
  };

  // ── Form Helpers ─────────────────────────────────────────────────────────
  const inputClass =
    'w-full rounded-lg border-border bg-white dark:bg-muted px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition';
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
            <h1 className="text-2xl font-bold text-foreground">Property Registration</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and register properties within the assembly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditingPropNumber(null); setForm({ ...defaultForm, propertyUniqueNumber: generatePropertyUniqueNumber(), propertyCertNo: generatePropertyCertNo(), daAssignmentNo: generateDaAssignmentNo() }); valuedDialogTriggered.current = ''; setView('form'); }}
              className="inline-flex items-center gap-2 bg-primary hover:bg-destructive text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Register New Property
            </button>
            <button onClick={handleExport} className="inline-flex items-center gap-2 border border-border bg-white dark:bg-muted text-foreground text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-card dark:hover:bg-slate-700 transition-colors whitespace-nowrap cursor-pointer">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 border border-border bg-white dark:bg-muted text-foreground text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-card dark:hover:bg-slate-700 transition-colors whitespace-nowrap cursor-pointer">
              <Upload className="w-4 h-4" /> Import
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          </div>
        </div>

        {/* ── Search & Filters ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
        <div className="rounded-xl border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-card dark:bg-muted/60 border-b border-border">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Property Unique Number</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Owner</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Property Class Description</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Property Class Category</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Use / Amount</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Details</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground dark:text-muted-foreground">
                      <Home className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      No properties found.
                    </td>
                  </tr>
                ) : (
                  paged.map((prop) => (
                    <tr key={prop.propNumber} className="hover:bg-card dark:hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap font-medium">{(prop as any).propertyUniqueNumber || prop.propNumber || '—'}</td>
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{prop.ownerName || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground dark:text-foreground whitespace-nowrap">{(prop as any).type || (prop as any).revenueDescription || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground dark:text-foreground whitespace-nowrap">{prop.category || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{formatVal(prop.value)}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap max-w-[200px] truncate" title={prop.streetName ? `${prop.streetName}, ${prop.locality || ''}` : prop.comments || ''}>{prop.streetName ? `${prop.streetName}, ${prop.locality || ''}` : (prop.comments || '—')}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => handleEdit(prop)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:dark:bg-primary/20 transition-colors cursor-pointer" title="Edit"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(prop.propNumber)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
          <p className="text-muted-foreground">Showing {showingFrom}-{showingTo} of {filtered.length}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safeCurrentPage <= 1} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-border text-muted-foreground dark:text-foreground hover:bg-card dark:hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="px-3 py-1.5 rounded-lg bg-muted text-foreground font-medium">{safeCurrentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safeCurrentPage >= totalPages} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-border text-muted-foreground dark:text-foreground hover:bg-card dark:hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
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
        <button onClick={handleCancel} className="p-2 rounded-lg border-border text-muted-foreground dark:text-foreground hover:bg-muted dark:hover:bg-muted transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {editingPropNumber ? 'Edit Property' : 'Register New Property'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {editingPropNumber ? 'Update the property details below.' : 'Fill in the details below to register a new property.'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ════════════════════════════════════════════════════════════════════
            CARD 1: LOCATION
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-muted rounded-xl border-border overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-card/60 border-b border-border">
            <MapPin className="w-4.5 h-4.5 text-muted-foreground dark:text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Location</h2>
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
                  <button type="button" onClick={fetchGps} disabled={locating} className="inline-flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg border-border border-primary/40 dark:border-primary text-primary dark:text-primary hover:bg-primary/10 dark:hover:dark:bg-primary/20 disabled:opacity-50 transition-colors text-xs font-medium whitespace-nowrap">
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
                <input type="text" name="code" value={form.code} readOnly placeholder="Auto-generated from locality" className={`${inputClass} bg-card dark:bg-muted/50 text-muted-foreground dark:text-muted-foreground`} />
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            CARD 2: PROPERTY INFORMATION
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-muted rounded-xl border-border overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-card/60 border-b border-border">
            <Briefcase className="w-4.5 h-4.5 text-muted-foreground dark:text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Property Information</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              {/* 1. DA Assessment Number */}
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
              {/* 2. Property Unique Number */}
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
              {/* 3. Property Permit Number */}
              <div>
                <label className={`${labelClass} block`}>Property Permit Number</label>
                <input type="text" name="permitNumber" value={form.permitNumber} onChange={handleFormChange} placeholder="Enter permit number" className={inputClass} />
              </div>
              {/* 4. Property Revenue Code */}
              <div>
                <label className={`${labelClass} block`}>Property Revenue Code</label>
                <div className="relative" ref={propRevenueCodeRef}>
                  <input
                    type="text"
                    value={propRevenueCodeShowDropdown ? propRevenueCodeSearch : form.revenueCode}
                    onChange={(e) => { setPropRevenueCodeSearch(e.target.value); setPropRevenueCodeShowDropdown(true); }}
                    onFocus={() => { setPropRevenueCodeSearch(form.revenueCode || ''); setPropRevenueCodeShowDropdown(true); }}
                    placeholder="Search property revenue code..."
                    className={inputClass}
                  />
                  {propRevenueCodeShowDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-muted border border-border dark:border-border rounded-lg shadow-lg">
                      {propRevenueCodeFiltered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
                      ) : propRevenueCodeFiltered.slice(0, 50).map((item) => (
                        <button key={item.code} type="button" onClick={() => { handlePropRevenueSelect(item); setPropRevenueCodeShowDropdown(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-primary/10 dark:hover:dark:bg-primary/20 transition-colors cursor-pointer border-b border-border dark:border-border last:border-0">
                          <span className="font-mono text-foreground dark:text-foreground">{item.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* 5. Property Revenue Description */}
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>Property Revenue Description</label>
                <div className="relative" ref={propRevenueDescRef}>
                  <input
                    type="text"
                    value={propRevenueDescShowDropdown ? propRevenueDescSearch : form.revenueDescription}
                    onChange={(e) => { setPropRevenueDescSearch(e.target.value); setPropRevenueDescShowDropdown(true); }}
                    onFocus={() => { setPropRevenueDescSearch(form.revenueDescription || ''); setPropRevenueDescShowDropdown(true); }}
                    placeholder="Search property revenue description..."
                    className={inputClass}
                  />
                  {propRevenueDescShowDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-muted border border-border dark:border-border rounded-lg shadow-lg">
                      {propRevenueDescFiltered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
                      ) : propRevenueDescFiltered.slice(0, 50).map((item) => (
                        <button key={item.code} type="button" onClick={() => { handlePropRevenueSelect(item); setPropRevenueDescShowDropdown(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-primary/10 dark:hover:dark:bg-primary/20 transition-colors cursor-pointer border-b border-border dark:border-border last:border-0">
                          <span className="text-foreground dark:text-foreground">{item.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* 6. Property Class Code */}
              <div>
                <label className={`${labelClass} block`}>Property Class Code</label>
                <Combobox
                  name="businessClassCode"
                  value={form.businessClassCode}
                  onChange={handleFormChange}
                  options={classCodes.map((c) => ({ value: c, label: `${c} – ${PROP_CODE_TO_CLASS[c] || ''} – ${PROP_CODE_TO_CATEGORY[c] || ''}` }))}
                  placeholder="Select code..."
                  emptyMessage="No matching code"
                  className={inputClass}
                />
              </div>
              {/* 7. Property Class Description */}
              <div>
                <label className={`${labelClass} block`}>Property Class Description</label>
                <Combobox
                  name="type"
                  value={form.type}
                  onChange={handleFormChange}
                  options={PROPERTY_CLASS_NAMES.map((n) => ({ value: n, label: n }))}
                  placeholder="Select class..."
                  emptyMessage="No matching class"
                  className={inputClass}
                />
              </div>
              {/* 8. Property Category */}
              <div>
                <label className={`${labelClass} block`}>Property Category</label>
                <Combobox
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                  options={classCategories.map((c) => ({ value: c, label: c }))}
                  placeholder="Select category..."
                  emptyMessage={form.type ? 'No categories' : 'Select class or code first'}
                  className={inputClass}
                />
              </div>
              {/* 9. Value/Amount (GHS) */}
              <div>
                <label className={`${labelClass} block`}>Value/Amount (GHS)</label>
                <input type="number" name="value" value={form.value} onChange={handleFormChange} placeholder="0.00" min="0" className={inputClass} />
              </div>
              {/* 10. Number of Rooms */}
              <div>
                <label className={`${labelClass} block`}>Number of Rooms</label>
                <input type="number" name="rooms" value={form.rooms} onChange={handleFormChange} placeholder="e.g. 3" min="0" className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            CARD 3: OWNER INFORMATION
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-muted rounded-xl border-border overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-card/60 border-b border-border">
            <User className="w-4.5 h-4.5 text-muted-foreground dark:text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Owner Information</h2>
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
          <button onClick={handleCancel} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-card0 hover:bg-slate-600 text-white text-sm font-medium transition-colors cursor-pointer">
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-destructive text-white text-sm font-medium transition-colors cursor-pointer">
            <Save className="w-4 h-4" />
            {editingPropNumber ? 'Update' : 'Save'}
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          DIALOG 1: Is this a Valued Property?
         ════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showValuedDialog} onOpenChange={setShowValuedDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Valued Property</DialogTitle>
            <DialogDescription>
              Is this property a valued property? Selecting &quot;No&quot; will use the flat rate from Rate Config. Selecting &quot;Yes&quot; will require entering the property&apos;s valued amount.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:gap-0">
            <button
              onClick={handleNotValued}
              className="flex-1 px-5 py-2.5 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              No — Use Flat Rate
            </button>
            <button
              onClick={handleValuedYes}
              className="flex-1 px-5 py-2.5 rounded-lg bg-primary hover:bg-destructive text-white text-sm font-medium transition-colors cursor-pointer"
            >
              Yes — Enter Amount
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════
          DIALOG 2: Enter Property Valued Amount
         ════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showAmountDialog} onOpenChange={setShowAmountDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Property Valued Amount</DialogTitle>
            <DialogDescription>
              Enter the total valued amount of this property. It will be multiplied by the rate impost from Rate Config to calculate the annual rate.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className={`${'text-xs font-medium text-muted-foreground uppercase tracking-wide'} block mb-1.5`}>Amount (GHS)</label>
            <input
              type="number"
              value={valuedAmountInput}
              onChange={(e) => setValuedAmountInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleValuedAmountSubmit(); }}
              placeholder="e.g. 500000"
              min="0"
              autoFocus
              className={inputClass}
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setShowAmountDialog(false)}
              className="px-5 py-2.5 rounded-lg bg-card0 hover:bg-slate-600 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleValuedAmountSubmit}
              className="px-5 py-2.5 rounded-lg bg-primary hover:bg-destructive text-white text-sm font-medium transition-colors cursor-pointer"
            >
              Calculate Value
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
