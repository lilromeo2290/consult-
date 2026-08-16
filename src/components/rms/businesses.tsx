'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
  Award,
  MapPin,
  Briefcase,
  User,
  Save,
  Crosshair,
  Loader2,
  Printer,
  X,
  FileText,
} from 'lucide-react';
import { BUSINESS_CLASSES } from '@/lib/fee-schedule';
import { USER_CATEGORIES } from '@/lib/user-categories';
import type { UserCategory } from '@/lib/user-categories';
import { exportToExcel, importFromExcel, BUSINESS_FIELDS } from '@/lib/import-export';
import { LOCALITIES, LOCALITY_AREA_CODE_MAP } from '@/lib/localities';
import { REVENUE_DESCRIPTIONS } from '@/lib/revenue-descriptions';
import { REVENUE_CODE_MAP, DESCRIPTION_TO_CODE, CODE_TO_DESCRIPTION } from '@/lib/revenue-code-map';
import { CLASS_TO_FIRST_CODE, CLASS_TO_CODES, CODE_TO_CLASS } from '@/lib/business-class-code-map';
import { BUSINESS_CLASS_CODES } from '@/lib/business-class-codes';
import { FEE_CODE_LOOKUP } from '@/lib/fee-code-lookup';
import { getRateOverride, loadOverrides, type RateEntry } from '@/lib/rate-overrides';
import { Combobox } from '@/components/ui/combobox';
import { BUSINESS_REVENUE_CODES, BIZ_CODE_TO_DESC, BIZ_DESC_TO_CODE } from '@/lib/business-revenue-codes';
import QRCode from 'qrcode';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BusinessCert {
  id: string;
  certNumber: string;
  regNumber: string;
  businessUniqueNumber: string;
  businessName: string;
  ownerName: string;
  businessType: string;
  category: string;
  businessLocation: string;
  businessAddress: string;
  dateRegistered: string;
  dateIssued: string;
  expiryDate: string;
  status: string;
  assemblyName: string;
  assemblyAddress: string;
  tradingName: string;
  receiptNumber: string;
}

interface Business {
  regNumber: string;
  name: string;
  owner: string;
  type: string;
  category: string;
  tin: string;
  status: 'Active' | 'Inactive';
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
  // New fields
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

// ─── Component ───────────────────────────────────────────────────────────────

const businessTypes = BUSINESS_CLASSES;

const defaultForm = {
  regNumber: '',
  name: '',
  ownerName: '',
  type: '',
  category: '',
  subCategory: '',
  businessClassCode: '',
  tin: '',
  licenseNumber: '',
  dateRegistered: '',
  status: 'Active',
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
  streetName: '',
  houseNo: '',
  streetCode: '',
  locality: '',
  areaCode: '',
  code: '',
  daAssignmentNo: '',
  businessCertNo: '',
  businessUniqueNumber: '',
  revenueDescription: '',
  revenueDescription2: '',
  revenueCode: '',
  employees: '',
  yearEstablished: '',
  excludedFromFees: false,
  ownerAddress: '',
  ownerLatitude: '',
  ownerLongitude: '',
  ownerTin: '',
  comments: '',
};

export function BusinessesPage() {
  // QR code generation helper
  const generateQRDataUrl = useCallback(async (text: string): Promise<string> => {
    try {
      return await QRCode.toDataURL(text, { width: 120, margin: 1, errorCorrectionLevel: 'M' });
    } catch {
      return '';
    }
  }, []);

  const [certQrUrl, setCertQrUrl] = useState<string>('');

  // Generate QR code when viewing a certificate
  useEffect(() => {
    if (viewingCert) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://rms.kma.gov.gh';
      const url = `${origin}/verify/certificate?cert=${viewingCert.certNumber}`;
      generateQRDataUrl(url).then(setCertQrUrl);
    } else {
      setCertQrUrl('');
    }
  }, [viewingCert, generateQRDataUrl]);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingRegNumber, setEditingRegNumber] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingCert, setViewingCert] = useState<BusinessCert | null>(null);
  const [businesses, setBusinesses, dataLoading] = useSyncedStorage<Business[]>('rms-businesses', mockBusinesses);
  const [bizCerts, setBizCerts] = useSyncedStorage<BusinessCert[]>('rms-business-certs', []);

  // ── Auto-migrate BIZ- prefix to BUN- (Business Unique Number) ─────────
  useEffect(() => {
    if (dataLoading) return;
    let bizChanged = false;
    const migratedBiz = businesses.map((b) => {
      if (b.regNumber.startsWith('BIZ-')) {
        bizChanged = true;
        return { ...b, regNumber: 'BUN-' + b.regNumber.slice(4) };
      }
      return b;
    });
    if (bizChanged) setBusinesses(migratedBiz);

    let certChanged = false;
    const migratedCerts = bizCerts.map((c) => {
      if (c.regNumber?.startsWith('BIZ-')) {
        certChanged = true;
        return { ...c, regNumber: 'BUN-' + c.regNumber.slice(4) };
      }
      return c;
    });
    if (certChanged) setBizCerts(migratedCerts);
  }, [dataLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bizRevenueCodeRef = useRef<HTMLDivElement>(null);
  const bizRevenueDescRef = useRef<HTMLDivElement>(null);
  const [bizRevenueCodeSearch, setBizRevenueCodeSearch] = useState('');
  const [bizRevenueDescSearch, setBizRevenueDescSearch] = useState('');
  const [bizRevenueCodeShowDropdown, setBizRevenueCodeShowDropdown] = useState(false);
  const [bizRevenueDescShowDropdown, setBizRevenueDescShowDropdown] = useState(false);
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
      // Merge: update existing by regNumber, add new ones
      const existing = new Map(businesses.map((b) => [b.regNumber, b]));
      for (const item of imported) {
        const key = item.regNumber || `IMP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        item.regNumber = key;
        item.status = (item.status as 'Active' | 'Inactive') || 'Active';
        existing.set(key, item);
      }
      setBusinesses(Array.from(existing.values()));
      alert(`${imported.length} business(es) imported successfully.`);
    } catch (err) {
      alert('Failed to import file. Please ensure it is a valid Excel file exported from this system.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Revenue Code/Description Search ───────────────────────────────────
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
    setForm((prev) => ({ ...prev, code: item.code, revenueDescription: item.description }));
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

  const getLocalityPrefix = (locality: string): string => {
    if (locality.startsWith('Kpando')) return 'KZC';
    if (locality.startsWith('Sovie')) return 'SZC';
    if (locality.startsWith('Gbefi')) return 'GZC';
    return '';
  };

  const getNextBUNForPrefix = (prefix: string, monthYear: string) => {
    if (!prefix || !monthYear) return '';
    const bunPrefix = `${prefix}${monthYear}`;
    let maxNum = 0;
    for (const b of businesses) {
      const bun = b.businessUniqueNumber || '';
      if (bun.startsWith(bunPrefix)) {
        const numStr = bun.slice(bunPrefix.length);
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    return `${bunPrefix}${String(maxNum + 1).padStart(5, '0')}`;
  };

  const generateBusinessUniqueNumber = (locality?: string, dateRegistered?: string) => {
    const loc = locality || form.locality;
    const prefix = getLocalityPrefix(loc);
    if (!prefix) return '';
    const d = dateRegistered || form.dateRegistered || new Date().toISOString().split('T')[0];
    const dt = new Date(d);
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yy = String(dt.getFullYear()).slice(-2);
    return getNextBUNForPrefix(prefix, mm + yy);
  };

  const generateBusinessCertNo = () => {
    const nextNum = businesses.length + 1;
    return `GCR-${String(nextNum).padStart(4, '0')}`;
  };

  const getNextDaNumberForAreaCode = (areaCode: string) => {
    if (!areaCode) return '';
    const prefix = `${areaCode}/BP/`;
    let maxNum = 0;
    for (const b of businesses) {
      const da = b.daAssignmentNo || '';
      if (da.startsWith(prefix)) {
        const numStr = da.slice(prefix.length);
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    return `${areaCode}/BP/${String(maxNum + 1).padStart(5, '0')}`;
  };

  const generateDaAssignmentNo = (areaCode?: string) => {
    return getNextDaNumberForAreaCode(areaCode || form.areaCode);
  };

  // ── Rate Overrides (reactive) ───────────────────────────────────────────
  // Fetch rate overrides from DB so the Amount field reacts to loaded data
  const [rateOverrides, setRateOverrides] = useState<Record<string, RateEntry>>({});
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/rms-data?key=rms-rate-overrides&_t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (json.data && typeof json.data === 'object') {
          const data = json.data as Record<string, RateEntry>;
          setRateOverrides(data);
          loadOverrides(data); // also populate in-memory store
        }
      } catch { /* silent */ }
    })();
  }, []);

  // ── Form State ───────────────────────────────────────────────────────────
  const [form, setForm] = useState({ ...defaultForm });
  const [locating, setLocating] = useState(false);
  const [locatingOwner, setLocatingOwner] = useState(false);

  const fetchGps = () => {
    if (!navigator.geolocation) { alert('Geolocation is not supported by your browser.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm((p) => ({ ...p, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) })); setLocating(false); },
      (err) => { alert('Unable to retrieve location: ' + err.message); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const fetchOwnerGps = () => {
    if (!navigator.geolocation) { alert('Geolocation is not supported by your browser.'); return; }
    setLocatingOwner(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm((p) => ({ ...p, ownerLatitude: pos.coords.latitude.toFixed(6), ownerLongitude: pos.coords.longitude.toFixed(6) })); setLocatingOwner(false); },
      (err) => { alert('Unable to retrieve location: ' + err.message); setLocatingOwner(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  // ── Derived categories based on selected business type ───────────────────
  const availableCategories: UserCategory[] = form.type
    ? (USER_CATEGORIES[form.type] || [])
    : [];

  // ── Get fee details for selected category ──────────────────────────────
  const selectedCategoryFee = availableCategories.find(
    (c) => c.name === form.category
  );
  // Show amount from rate overrides (Rate Configuration) with fallback to default fee
  // Uses reactive state (rateOverrides) for proper re-rendering, plus in-memory fallback
  const displayAmount = form.businessClassCode
    ? (rateOverrides[form.businessClassCode]?.amount ?? getRateOverride(form.businessClassCode) ?? FEE_CODE_LOOKUP[form.businessClassCode]?.amount ?? null)
    : null;

  // ── Filtering & Pagination ───────────────────────────────────────────────
  const filtered = businesses.filter((b) => {
    const matchSearch =
      searchQuery === '' ||
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.regNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' || b.status === statusFilter;
    const matchType = typeFilter === 'All' || b.type === typeFilter;
    return matchSearch && matchStatus && matchType;
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
      // Update DA Assignment No. whenever area code changes
      if ((name === 'locality' || name === 'areaCode') && updated.areaCode) {
        // DA Assignment No.: count per area code (ascending)
        const daPrefix = `${updated.areaCode}/BP/`;
        let maxDANum = 0;
        for (const b of businesses) {
          const da = b.daAssignmentNo || '';
          if (da.startsWith(daPrefix)) {
            const num = parseInt(da.slice(daPrefix.length), 10);
            if (!isNaN(num) && num > maxDANum) maxDANum = num;
          }
        }
        updated.daAssignmentNo = `${updated.areaCode}/BP/${String(maxDANum + 1).padStart(5, '0')}`;
      }
      // Update Business Unique Number when locality or date registered changes
      if (name === 'locality' || name === 'dateRegistered') {
        const loc = name === 'locality' ? updated.locality : prev.locality;
        const dt = name === 'dateRegistered' ? updated.dateRegistered : prev.dateRegistered;
        if (loc) {
          const prefix = loc.startsWith('Kpando') ? 'KZC' : loc.startsWith('Sovie') ? 'SZC' : loc.startsWith('Gbefi') ? 'GZC' : '';
          if (prefix) {
            const d = dt || new Date().toISOString().split('T')[0];
            const date = new Date(d);
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const yy = String(date.getFullYear()).slice(-2);
            const bunPfx = `${prefix}${mm}${yy}`;
            let maxBUN = 0;
            for (const b of businesses) {
              const bun = b.businessUniqueNumber || '';
              if (bun.startsWith(bunPfx)) {
                const num = parseInt(bun.slice(bunPfx.length), 10);
                if (!isNaN(num) && num > maxBUN) maxBUN = num;
              }
            }
            updated.businessUniqueNumber = `${bunPfx}${String(maxBUN + 1).padStart(5, '0')}`;
          }
        }
      }
      // Link Revenue Description ↔ Code
      if (name === 'revenueDescription' && DESCRIPTION_TO_CODE[updated.revenueDescription]) {
        updated.code = DESCRIPTION_TO_CODE[updated.revenueDescription];
      }
      if (name === 'code' && CODE_TO_DESCRIPTION[updated.code]) {
        updated.revenueDescription = CODE_TO_DESCRIPTION[updated.code];
      }
      // Link Business Class ↔ Business Class Code
      if (name === 'type' && CLASS_TO_FIRST_CODE[updated.type]) {
        updated.businessClassCode = CLASS_TO_FIRST_CODE[updated.type];
      }
      if (name === 'businessClassCode') {
        const code = updated.businessClassCode;
        // Auto-fill class from code mapping
        if (CODE_TO_CLASS[code]) {
          updated.type = CODE_TO_CLASS[code];
        }
        // Auto-fill category and amount from fee code lookup
        if (FEE_CODE_LOOKUP[code]) {
          updated.category = FEE_CODE_LOOKUP[code].category;
        }
      }
      // When category changes, find the matching business class code within the current class
      if (name === 'category' && updated.category && updated.type) {
        const codesForClass = CLASS_TO_CODES[updated.type] || [];
        const match = codesForClass.find(
          (c) => FEE_CODE_LOOKUP[c]?.category === updated.category
        );
        if (match) {
          updated.businessClassCode = match;
        }
      }
      // Reset category and sub-category when type changes (but not when triggered by code change)
      if (name === 'type') {
        updated.category = '';
        updated.subCategory = '';
      }
      return updated;
    });
  };

  const handleSave = () => {
    // Validate compulsory fields
    const missing: string[] = [];
    if (!form.name?.trim()) missing.push('Business Name');
    if (!form.type) missing.push('Business Type/Class');
    if (!form.ownerName?.trim()) missing.push('Owner Name');
    if (!form.locality?.trim()) missing.push('Locality');
    if (!form.dateRegistered) missing.push('Date Registered');
    if (!form.businessAddress?.trim()) missing.push('Business Address');
    if (missing.length > 0) {
      alert('Please complete the following required field(s):\n\n' + missing.map((f) => '• ' + f).join('\n'));
      return;
    }
    const regNum = form.regNumber || `BUN-${String(businesses.length + 1).padStart(4, '0')}`;
    // Generate final DA Assignment No. at save time (for new entries only)
    const finalDANo = editingRegNumber
      ? form.daAssignmentNo
      : (form.areaCode ? getNextDaNumberForAreaCode(form.areaCode) : form.daAssignmentNo);
    const newBusiness: Business = {
      regNumber: regNum,
      name: form.name,
      owner: form.ownerName,
      type: form.type,
      category: form.category,
      tin: form.tin,
      status: (form.status as 'Active' | 'Inactive') || 'Active',
      dateRegistered: form.dateRegistered || new Date().toISOString().split('T')[0],
      ghanaCard: form.ghanaCard,
      phone: form.phone,
      email: form.email,
      ghanaPostGPS: form.ghanaPostGPS,
      latitude: form.latitude,
      longitude: form.longitude,
      digitalAddress: form.digitalAddress,
      residentialAddress: form.residentialAddress,
      businessAddress: form.businessAddress,
      ward: form.ward,
      electoralArea: form.electoralArea,
      zone: form.zone,
      revenueArea: form.revenueArea,
      licenseNumber: form.licenseNumber,
      subCategory: form.subCategory,
      businessClassCode: form.businessClassCode,
      // New fields
      streetName: form.streetName,
      houseNo: form.houseNo,
      streetCode: form.streetCode,
      locality: form.locality,
      areaCode: form.areaCode,
      code: form.code,
      daAssignmentNo: finalDANo,
      businessCertNo: form.businessCertNo,
      businessUniqueNumber: form.businessUniqueNumber,
      revenueDescription: form.revenueDescription,
      revenueDescription2: form.revenueDescription2,
      revenueCode: form.revenueCode,
      employees: form.employees,
      yearEstablished: form.yearEstablished,
      excludedFromFees: form.excludedFromFees,
      ownerAddress: form.ownerAddress,
      ownerLatitude: form.ownerLatitude,
      ownerLongitude: form.ownerLongitude,
      ownerTin: form.ownerTin,
      comments: form.comments,
    };

    if (editingRegNumber) {
      setBusinesses((prev) =>
        prev.map((b) =>
          b.regNumber === editingRegNumber
            ? { ...b, ...newBusiness, businessName: newBusiness.name, ownerName: newBusiness.owner, businessType: newBusiness.type, category: newBusiness.category, businessAddress: newBusiness.businessAddress }
            : b
        )
      );
    } else {
      setBusinesses((prev) => [...prev, newBusiness]);
    }

    // Auto-generate business certificate
    try {
      const certSeq = bizCerts.length + 1;
      const today = new Date().toISOString().split('T')[0];
      // Expiry = Dec 31 of the current financial year
      const _finSettings = (() => { try { return JSON.parse(localStorage.getItem('rms-settings-financial') || '{}'); } catch { return {}; } })();
      const fiscalYear = parseInt(_finSettings.currentFinancialYear) || new Date().getFullYear();
      const expiryStr = `${fiscalYear}-12-31`;
      const assemblyName = (() => {
        try { const r = JSON.parse(localStorage.getItem('rms-settings-assembly') || '{}'); return r.name || 'Kpando Municipal Assembly'; } catch { return 'Kpando Municipal Assembly'; }
      })();
      const assemblyAddress = (() => {
        try { const r = JSON.parse(localStorage.getItem('rms-settings-assembly') || '{}'); return r.address || ''; } catch { return ''; }
      })();
      const newCert: BusinessCert = {
        id: `CRT-${Date.now()}`,
        certNumber: `CRT-${String(certSeq).padStart(4, '0')}`,
        regNumber: regNum,
        businessUniqueNumber: newBusiness.businessUniqueNumber || '',
        businessName: newBusiness.name,
        ownerName: newBusiness.owner,
        businessType: newBusiness.type,
        category: newBusiness.category,
        businessLocation: newBusiness.locality || '',
        businessAddress: newBusiness.businessAddress,
        dateRegistered: newBusiness.dateRegistered,
        dateIssued: today,
        expiryDate: expiryStr,
        status: 'Active' as const,
        assemblyName,
        assemblyAddress,
        tradingName: newBusiness.name,
        receiptNumber: `RCT-${String(certSeq).padStart(4, '0')}`,
      };
      setBizCerts((prev) => [...prev, newCert]);
    } catch { /* cert generation failure should not block registration */ }

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
      ownerName: biz.owner,
      type: biz.type,
      category: biz.category,
      subCategory: biz.subCategory || '',
      tin: biz.tin,
      licenseNumber: biz.licenseNumber,
      dateRegistered: biz.dateRegistered,
      status: biz.status,
      ghanaCard: biz.ghanaCard,
      phone: biz.phone,
      email: biz.email,
      ghanaPostGPS: (biz as any).ghanaPostGPS || '',
      latitude: (biz as any).latitude || '',
      longitude: (biz as any).longitude || '',
      digitalAddress: biz.digitalAddress,
      residentialAddress: biz.residentialAddress,
      businessAddress: biz.businessAddress,
      ward: biz.ward,
      electoralArea: biz.electoralArea,
      zone: biz.zone,
      revenueArea: biz.revenueArea,
      streetName: (biz as any).streetName || '',
      houseNo: (biz as any).houseNo || '',
      streetCode: (biz as any).streetCode || '',
      locality: (biz as any).locality || '',
      areaCode: (biz as any).areaCode || '',
      code: (biz as any).code || '',
      daAssignmentNo: (biz as any).daAssignmentNo || '',
      businessCertNo: (biz as any).businessCertNo || '',
      businessUniqueNumber: (biz as any).businessUniqueNumber || '',
      revenueDescription: (biz as any).revenueDescription || '',
      revenueDescription2: (biz as any).revenueDescription2 || '',
      revenueCode: (biz as any).revenueCode || '',
      businessClassCode: (biz as any).businessClassCode || '',
      employees: (biz as any).employees || '',
      yearEstablished: (biz as any).yearEstablished || '',
      excludedFromFees: (biz as any).excludedFromFees || false,
      ownerAddress: (biz as any).ownerAddress || '',
      ownerLatitude: (biz as any).ownerLatitude || '',
      ownerLongitude: (biz as any).ownerLongitude || '',
      ownerTin: (biz as any).ownerTin || '',
      comments: (biz as any).comments || '',
    });
    setView('form');
  };

  const handleDelete = (regNumber: string) => {
    if (!confirm('Are you sure you want to delete this business? This action cannot be undone.')) return;
    setBusinesses((prev) => prev.filter((b) => b.regNumber !== regNumber));
  };

  // ── Certificate View & Print ─────────────────────────────────────────────
  const handleViewCertificate = (regNumber: string) => {
    const cert = bizCerts.find((c) => c.regNumber === regNumber);
    if (cert) {
      setViewingCert(cert);
    } else {
      alert('No certificate found for this business. Certificates are generated automatically when a business is saved.');
    }
  };

  const handlePrintCertificate = async (cert: BusinessCert) => {    const _asmSettings = (() => { try { return JSON.parse(localStorage.getItem('rms-settings-assembly') || '{}'); } catch { return {}; } })();    const dynAssemblyName = _asmSettings.name || cert.assemblyName || 'Kpando Municipal Assembly';    const dynLogo = _asmSettings.logo || '';    const dynSignature = _asmSettings.signature || '';    const dynSignatoryTitle = _asmSettings.signatureTitle || '';    const businessName = cert.businessName || '';    const businessLocation = (cert as any).businessLocation || cert.businessAddress || '';    const businessType = cert.businessType || '';    const businessCategory = cert.category || '';    const _finSet = (() => { try { return JSON.parse(localStorage.getItem('rms-settings-financial') || '{}'); } catch { return {}; } })();    const currentYear = parseInt(_finSet.currentFinancialYear) || new Date().getFullYear();    const businessNumber = cert.businessUniqueNumber || cert.certNumber || '';    const fmtDateParts = (d: string) => {      if (!d) return { day: '........', month: '........', year: '....' };      try {        const dt = new Date(d);        const day = dt.getDate();        const s = ['th','st','nd','rd'];        const v = day % 100;        const suffix = s[(v-20)%10] || s[v] || s[0];        return { day: day + suffix, month: dt.toLocaleDateString('en-US', { month: 'long' }), year: String(dt.getFullYear()) };      } catch { return { day: '........', month: '........', year: '....' };      }    };    const issueParts = fmtDateParts(cert.dateIssued);    const expiryParts = fmtDateParts(cert.expiryDate);    const shortMunicipality = dynAssemblyName.replace(' Municipal Assembly','').replace(' District Assembly','').replace(' Metropolitan Assembly','');    const win = window.open('', '_blank', 'width=900,height=1200');    if (!win) { alert('Please allow popups to print the certificate.'); return; }    win.document.write(`<!DOCTYPE html><html><head>  <title>Business Operating Permit - ${businessNumber}</title>  <style>    * { margin: 0; padding: 0; box-sizing: border-box; }    @page { size: A4 portrait; margin: 10mm; }    body {      font-family: 'Times New Roman', Times, Georgia, serif;      color: #000;      background: #f0ece0;      display: flex;      align-items: center;      justify-content: center;      min-height: 100vh;      padding: 10px;    }    .cert-outer {      width: 780px;      min-height: 1050px;      background: #FFFFFF;      position: relative;      padding: 0;      border: 3px solid #8B7355;      border-radius: 20px;    }    .cert-outer::before {      content: '';      position: absolute;      top: 8px; left: 8px; right: 8px; bottom: 8px;      border: 1px solid #8B7355;      border-radius: 14px;      pointer-events: none;    }    .corner-ornament {      position: absolute;      width: 60px;      height: 60px;      z-index: 1;    }    .corner-tl { top: 12px; left: 12px; }    .corner-tr { top: 12px; right: 12px; transform: rotate(90deg); }    .corner-bl { bottom: 12px; left: 12px; transform: rotate(-90deg); }    .corner-br { bottom: 12px; right: 12px; transform: rotate(180deg); }    .corner-ornament svg { width: 100%; height: 100%; }    .cert-inner {      margin: 45px 50px;      position: relative;      z-index: 2;    }    .watermark {      position: absolute;      top: 50%;      left: 50%;      transform: translate(-50%, -50%);      width: 400px;      height: 400px;      opacity: 0.06;      z-index: 0;      pointer-events: none;    }    .watermark img {      width: 100%;      height: 100%;      object-fit: contain;      filter: grayscale(100%);    }    .header-section {      text-align: center;      margin-bottom: 30px;    }    .header-logo {      width: 110px;      height: 110px;      margin: 0 auto 14px auto;    }    .header-logo img {      width: 110px;      height: 110px;      object-fit: contain;    }    .header-divider {      width: 1px;      height: 100px;      background: #CCCCCC;      flex-shrink: 0;    }    .header-text {    }    .assembly-name {      font-family: 'Times New Roman', Times, serif;      font-size: 30px;      font-weight: 900;      text-transform: uppercase;      color: #000000;      letter-spacing: -0.5px;      line-height: 1.2;    }    .title-section {      text-align: center;      margin-bottom: 28px;    }    .cert-title {      font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;      font-size: 26px;      font-weight: 400;      letter-spacing: 2px;      color: #222222;      text-transform: uppercase;    }    .title-divider {      display: flex;      align-items: center;      justify-content: center;      margin-top: 12px;      gap: 0;    }    .title-divider-line {      height: 1px;      width: 150px;      background: #CD853F;    }    .title-divider-ornament {      width: 20px;      height: 20px;      display: flex;      align-items: center;      justify-content: center;      color: #DAA520;      font-size: 18px;    }    .identity-section {      text-align: center;      margin-bottom: 25px;    }    .identity-label {      font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;      font-size: 18px;      font-weight: 600;      color: #000000;      text-transform: uppercase;      margin-bottom: 8px;    }    .identity-number {      font-family: Georgia, 'Times New Roman', serif;      font-size: 52px;      font-weight: 700;      color: #B22222;      line-height: 1.1;      margin-bottom: 16px;    }    .legal-text {      font-family: 'Times New Roman', Times, Georgia, serif;      font-size: 14px;      line-height: 1.6;      color: #333333;      text-align: center;      max-width: 85%;      margin: 0 auto;    }    .legal-text .bold-asm {      font-weight: 700;      text-transform: uppercase;    }    .data-fields {      margin: 25px 0;    }    .data-row {      display: flex;      align-items: baseline;      margin-bottom: 20px;    }    .data-label {      font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;      font-size: 15px;      font-weight: 600;      color: #000000;      text-align: right;      width: 38%;      padding-right: 12px;      flex-shrink: 0;    }    .data-value {      flex: 1;      font-family: 'Times New Roman', Times, Georgia, serif;      font-size: 15px;      font-weight: 600;      color: #000000;      border-bottom: 1px dotted #555555;      padding-bottom: 2px;      padding-left: 8px;    }    .date-section {      margin: 20px 0 25px 0;    }    .date-row {      display: flex;      align-items: baseline;      margin-bottom: 12px;    }    .date-label {      font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;      font-size: 15px;      font-weight: 600;      color: #000000;      text-transform: uppercase;      text-align: right;      width: 38%;      padding-right: 12px;      flex-shrink: 0;    }    .date-value {      font-family: Georgia, 'Times New Roman', serif;      font-size: 17px;      font-weight: 700;      color: #000000;    }    .date-value sup {      font-size: 0.6em;      vertical-align: super;    }    .footer-section {      display: flex;      justify-content: space-between;      align-items: flex-start;      margin-top: 30px;    }    .note-block {      max-width: 300px;    }    .note-header {      font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;      font-size: 13px;      font-weight: 700;      color: #CC0000;      text-transform: uppercase;      margin-bottom: 6px;    }    .note-body {      font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;      font-size: 12px;      line-height: 1.4;      color: #333333;    }    .signature-block {      text-align: center;    }    .sign-line {      width: 200px;      border-bottom: 1px dotted #333;      margin: 0 auto 6px;    }    .sign-image {      margin-bottom: 4px;    }    .sign-image img {      width: 200px;      height: 65px;      object-fit: contain;    }    .sign-label {      font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;      font-size: 11px;      text-transform: uppercase;      color: #000000;      letter-spacing: 0.5px;      margin-bottom: 2px;    }    .sign-title {      font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;      font-size: 11px;      font-weight: 700;      text-transform: uppercase;      color: #CC0000;      letter-spacing: 0.5px;    }    @media print {      body { background: #fff; padding: 0; }      .cert-outer { border: 3px solid #8B7355; }    }  </style></head><body>  <div class="cert-outer">    <!-- Corner Ornaments -->    <div class="corner-ornament corner-tl"><svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 55V20C5 11.716 11.716 5 20 5H55" stroke="#8B7355" stroke-width="2" fill="none"/><path d="M5 48V25C5 14.507 13.507 6 24 6H48" stroke="#8B7355" stroke-width="1" fill="none" opacity="0.5"/><circle cx="8" cy="8" r="3" fill="#DAA520" opacity="0.6"/><path d="M12 5C12 5 15 12 5 12" stroke="#DAA520" stroke-width="1" fill="none" opacity="0.5"/></svg></div>    <div class="corner-ornament corner-tr"><svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 55V20C5 11.716 11.716 5 20 5H55" stroke="#8B7355" stroke-width="2" fill="none"/><path d="M5 48V25C5 14.507 13.507 6 24 6H48" stroke="#8B7355" stroke-width="1" fill="none" opacity="0.5"/><circle cx="8" cy="8" r="3" fill="#DAA520" opacity="0.6"/><path d="M12 5C12 5 15 12 5 12" stroke="#DAA520" stroke-width="1" fill="none" opacity="0.5"/></svg></div>    <div class="corner-ornament corner-bl"><svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 55V20C5 11.716 11.716 5 20 5H55" stroke="#8B7355" stroke-width="2" fill="none"/><path d="M5 48V25C5 14.507 13.507 6 24 6H48" stroke="#8B7355" stroke-width="1" fill="none" opacity="0.5"/><circle cx="8" cy="8" r="3" fill="#DAA520" opacity="0.6"/><path d="M12 5C12 5 15 12 5 12" stroke="#DAA520" stroke-width="1" fill="none" opacity="0.5"/></svg></div>    <div class="corner-ornament corner-br"><svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 55V20C5 11.716 11.716 5 20 5H55" stroke="#8B7355" stroke-width="2" fill="none"/><path d="M5 48V25C5 14.507 13.507 6 24 6H48" stroke="#8B7355" stroke-width="1" fill="none" opacity="0.5"/><circle cx="8" cy="8" r="3" fill="#DAA520" opacity="0.6"/><path d="M12 5C12 5 15 12 5 12" stroke="#DAA520" stroke-width="1" fill="none" opacity="0.5"/></svg></div>    <!-- Watermark -->    <div class="watermark">      ${dynLogo ? `<img src="${dynLogo}" alt="" />` : ''}    </div>    <div class="cert-inner">      <!-- Header: Logo + Assembly Name -->      <div class="header-section">        <div class="header-logo">          ${dynLogo ? `<img src="${dynLogo}" alt="${dynAssemblyName}" />` : '<img src="/logos/assembly-seal.png" alt="Assembly Seal" />'}        </div>        <div class="header-text">          <div class="assembly-name">${dynAssemblyName.toUpperCase().split(" ").join("<br/>")}</div>        </div>      </div>      <!-- Title -->      <div class="title-section">        <div class="cert-title">Business Operating Permit</div>        <div class="title-divider">          <div class="title-divider-line"></div>          <div class="title-divider-ornament">❦</div>          <div class="title-divider-line"></div>        </div>      </div>      <!-- Business Identity -->      <div class="identity-section">        <div class="identity-label">Business Name</div>        <div class="identity-number">${businessName.toUpperCase()}</div>        <div class="legal-text">          Issued under the Local Governance Act, 2016 (Act 936)<br/>          Section 87(1) to operate a business within the<br/>          <span class="bold-asm">${dynAssemblyName.toUpperCase().split(" ").join("<br/>")}</span><br/>          Jurisdiction for the year ${currentYear}.        </div>      </div>      <!-- Data Fields -->      <div class="data-fields">        <div class="data-row">          <div class="data-label">1. Business Number</div>          <div class="data-value">${businessNumber}</div>        </div>        <div class="data-row">          <div class="data-label">2. Business Location</div>          <div class="data-value">${businessLocation}</div>        </div>        <div class="data-row">          <div class="data-label">3. Business Class</div>          <div class="data-value">${businessType}</div>        </div>        <div class="data-row">          <div class="data-label">4. Business Category</div>          <div class="data-value">${businessCategory}</div>        </div>      </div>      <!-- Dates -->      <div class="date-section">        <div class="date-row">          <div class="date-label">Date of Issue:</div>          <div class="date-value">${issueParts.day}<sup>TH</sup> ${issueParts.month.toUpperCase()}, ${issueParts.year}</div>        </div>        <div class="date-row">          <div class="date-label">Expiry Date:</div>          <div class="date-value">${expiryParts.day}<sup>TH</sup> ${expiryParts.month.toUpperCase()}, ${expiryParts.year}</div>        </div>      </div>      <!-- Footer: Note + Signature -->      <div class="footer-section">        <div class="note-block">          <div class="note-header">Note:</div>          <div class="note-body">            This Permit is not transferable.<br/>            Display this Permit at a conspicuous place<br/>            at the business premises.          </div>        </div>        <div class="signature-block">          ${dynSignature ? `<div class="sign-image"><img src="${dynSignature}" alt="Signature" /></div>` : '<div class="sign-line"></div>'}          <div class="sign-label">Signature</div>          <div class="sign-title">${dynSignatoryTitle ? dynSignatoryTitle.toUpperCase() : 'MUNICIPAL CO-ORDINATING DIRECTOR'}</div>        </div>      </div>    </div>  </div>  <!-- QR Code -->
  <div style="text-align:center; margin-top:24px; padding-top:12px; border-top:1px solid #CCCCCC;">
    <canvas id="cert-qr-print"></canvas>
    <div style="font-family:Arial,sans-serif; font-size:8px; color:#666; margin-top:3px;">Scan to verify certificate authenticity</div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"></script>
  <script>
    window.onload = function() {
      try {
        var certUrl = window.location.origin + "/verify/certificate?cert=${businessNumber}";
        QRCode.toCanvas(document.getElementById('cert-qr-print'), certUrl, { width: 120, margin: 1, errorCorrectionLevel: 'M' });
      } catch(e) { console.warn("QR Code error", e); }
      window.print();
    };
  </script></body></html>`);    win.document.close();  };

  // ── Form Field Helper ────────────────────────────────────────────────────
  const inputClass =
    'w-full rounded-lg border-border bg-white dark:bg-muted px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition';
  const labelClass =
    'text-sm font-medium text-foreground mb-1.5';

  // ══════════════════════════════════════════════════════════════════════════
  //  LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'list') {
    return (
      <div className="space-y-6">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Business Registration
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and register businesses within the assembly. Track revenue
              collection and compliance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditingRegNumber(null); setForm({ ...defaultForm, businessUniqueNumber: generateBusinessUniqueNumber(), businessCertNo: generateBusinessCertNo(), daAssignmentNo: generateDaAssignmentNo() }); setView('form'); }}
              className="inline-flex items-center gap-2 bg-primary hover:bg-destructive text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Register New Business
            </button>
            <button onClick={handleExport} className="inline-flex items-center gap-2 border border-border bg-white dark:bg-muted text-foreground text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-card dark:hover:bg-slate-700 transition-colors whitespace-nowrap">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 border border-border bg-white dark:bg-muted text-foreground text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-card dark:hover:bg-slate-700 transition-colors whitespace-nowrap">
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
              placeholder="Search by name, owner, or registration number..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className={`${inputClass} pl-10`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className={`${inputClass} w-full sm:w-44`}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className={`${inputClass} w-full sm:w-48`}
          >
            <option value="All">All Business Classes</option>
            {businessTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <div className="rounded-xl border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-card dark:bg-muted/60 border-b border-border">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Business Unique Number</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Business Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Owner</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Business Class</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap hidden lg:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap hidden md:table-cell">TIN</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground dark:text-foreground whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground dark:text-muted-foreground">
                      <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      No businesses found. Click "Register New Business" to add one.
                    </td>
                  </tr>
                ) : (
                  paged.map((biz, i) => (
                    <tr key={`biz-${i}-${biz.regNumber || biz.name}`} className="hover:bg-card dark:hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{biz.businessUniqueNumber || biz.regNumber}</td>
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{biz.name}</td>
                      <td className="px-4 py-3 text-muted-foreground dark:text-foreground whitespace-nowrap">{biz.owner}</td>
                      <td className="px-4 py-3 text-muted-foreground dark:text-foreground whitespace-nowrap">{biz.type}</td>
                      <td className="px-4 py-3 text-muted-foreground dark:text-foreground whitespace-nowrap hidden lg:table-cell">{biz.category}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap hidden md:table-cell">{biz.tin}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          biz.status === 'Active'
                            ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                            : 'bg-[var(--accent-red-light)] text-destructive'
                        }`}>
                          {biz.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => handleViewCertificate(biz.regNumber)} className="p-1.5 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="View Certificate">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEdit(biz)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:dark:bg-primary/20 transition-colors" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(biz.regNumber)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
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
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safeCurrentPage <= 1} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-border text-muted-foreground dark:text-foreground hover:bg-card dark:hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="px-3 py-1.5 rounded-lg bg-muted text-foreground font-medium">{safeCurrentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safeCurrentPage >= totalPages} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-border text-muted-foreground dark:text-foreground hover:bg-card dark:hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Certificate Modal ──────────────────────────────────────────── */}
        {viewingCert && (() => {
          const _asm = (() => { try { return JSON.parse(localStorage.getItem('rms-settings-assembly') || '{}'); } catch { return {}; } })();
          const dynAssemblyName = _asm.name || viewingCert.assemblyName || 'Kpando Municipal Assembly';
          const _dynLogo = _asm.logo || '';
          const _dynSig = _asm.signature || '';
          const _dynSigTitle = _asm.signatureTitle || '';
          const _finYear = (() => { try { return JSON.parse(localStorage.getItem('rms-settings-financial') || '{}').currentFinancialYear || String(new Date().getFullYear()); } catch { return String(new Date().getFullYear()); } })();
          const fmtDatePartsPreview = (d: string) => {
            if (!d) return { day: '........', month: '........', year: '....' };
            try {
              const dt = new Date(d);
              const day = dt.getDate();
              const s = ['th','st','nd','rd'];
              const v = day % 100;
              const suffix = s[(v-20)%10] || s[v] || s[0];
              return { day: day + suffix, month: dt.toLocaleDateString('en-US', { month: 'long' }), year: String(dt.getFullYear()) };
            } catch { return { day: '........', month: '........', year: '....' }; }
          };
          const _issueParts = fmtDatePartsPreview(viewingCert.dateIssued);
          const _expiryParts = fmtDatePartsPreview(viewingCert.expiryDate);

          return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setViewingCert(null)}>
            <div className="rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3 bg-slate-800 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-amber-500/20">
                    <Award className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Business Operating Permit</h3>
                    <p className="text-xs text-muted-foreground">{viewingCert.businessUniqueNumber || viewingCert.certNumber}</p>
                  </div>
                </div>
                <button onClick={() => setViewingCert(null)} className="p-2 rounded-lg hover:bg-slate-700 text-muted-foreground hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Certificate Preview - Business Operating Permit design */}
              <div className="p-4">
                <div className="p-4" style={{ background: '#f0ece0' }}>
                  <div style={{ background: '#FFFFFF', border: '3px solid #8B7355', borderRadius: '20px', padding: '0', position: 'relative', overflow: 'hidden' }}>
                    {/* Inner border */}
                    <div style={{ position: 'absolute', top: '8px', left: '8px', right: '8px', bottom: '8px', border: '1px solid #8B7355', borderRadius: '14px', pointerEvents: 'none' }} />
                    {/* Watermark */}
                    {_dynLogo && (
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '350px', height: '350px', opacity: 0.06, zIndex: 0, pointerEvents: 'none' }}>
                        <img src={_dynLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'grayscale(100%)' }} />
                      </div>
                    )}
                    {/* Corner Ornaments */}
                    {[["12px","auto","auto","12px"],["12px","12px","auto","auto"],["auto","auto","12px","12px"],["auto","12px","12px","auto"]].map(([top,right,bottom,left], i) => (
                      <div key={i} style={{ position: 'absolute', top, right, bottom, left, width: '60px', height: '60px', zIndex: 1 }}>
                        <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                          <path d="M5 55V20C5 11.716 11.716 5 20 5H55" stroke="#8B7355" strokeWidth="2" fill="none"/>
                          <path d="M5 48V25C5 14.507 13.507 6 24 6H48" stroke="#8B7355" strokeWidth="1" fill="none" opacity="0.5"/>
                          <circle cx="8" cy="8" r="3" fill="#DAA520" opacity="0.6"/>
                          <path d="M12 5C12 5 15 12 5 12" stroke="#DAA520" strokeWidth="1" fill="none" opacity="0.5"/>
                        </svg>
                      </div>
                    ))}
                    {/* Content */}
                    <div style={{ margin: '35px 40px', position: 'relative', zIndex: 2 }}>
                      {/* Header: Logo + Assembly Name - Centered */}
                      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <div style={{ width: '90px', height: '90px', margin: '0 auto 12px auto' }}>
                          {_dynLogo ? <img src={_dynLogo} alt={dynAssemblyName} style={{ width: '90px', height: '90px', objectFit: 'contain' }} /> : <img src="/logos/assembly-seal.png" alt="Assembly Seal" style={{ width: '90px', height: '90px', objectFit: 'contain' }} />}
                        </div>
                        <div>
                          {dynAssemblyName.toUpperCase().split(' ').map((word: string, i: number) => (
                            <div key={i} style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '28px', fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: '-0.5px', lineHeight: 1.15 }}>{word}</div>
                          ))}
                        </div>
                      </div>

                      {/* Title */}
                      <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                        <div style={{ fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif", fontSize: '20px', fontWeight: 400, letterSpacing: '2px', color: '#222222', textTransform: 'uppercase' }}>Business Operating Permit</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '10px' }}>
                          <div style={{ height: '1px', width: '120px', background: '#CD853F' }} />
                          <div style={{ width: '16px', textAlign: 'center', color: '#DAA520', fontSize: '14px', margin: '0 4px' }}>❦</div>
                          <div style={{ height: '1px', width: '120px', background: '#CD853F' }} />
                        </div>
                      </div>

                      {/* Business Identity */}
                      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <div style={{ fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif", fontSize: '14px', fontWeight: 600, color: '#000000', textTransform: 'uppercase', marginBottom: '6px' }}>Business Name</div>
                        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '40px', fontWeight: 700, color: '#B22222', lineHeight: 1.1, marginBottom: '12px' }}>{(viewingCert.businessName || '').toUpperCase()}</div>
                        <div style={{ fontFamily: "'Times New Roman', Times, Georgia, serif", fontSize: '11px', lineHeight: 1.6, color: '#333333', textAlign: 'center' }}>
                          Issued under the Local Governance Act, 2016 (Act 936)<br/>
                          Section 87(1) to operate a business within the<br/>
                          <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{dynAssemblyName.toUpperCase()}</span><br/>
                          Jurisdiction for the year {_finYear}.
                        </div>
                      </div>

                      {/* Data Fields */}
                      <div style={{ margin: '20px 0' }}>
                        {[['1. Business Number', viewingCert.businessUniqueNumber || ''], ['2. Business Location', (viewingCert as any).businessLocation || viewingCert.businessAddress || ''], ['3. Business Class', viewingCert.businessType || ''], ['4. Business Category', viewingCert.category || '']].map(([label, val]) => (
                          <div key={label} style={{ display: 'flex', alignItems: 'baseline', marginBottom: '16px' }}>
                            <div style={{ fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif", fontSize: '12px', fontWeight: 600, color: '#000000', textAlign: 'right', width: '38%', paddingRight: '10px', flexShrink: 0 }}>{label}</div>
                            <div style={{ flex: 1, borderBottom: '1px dotted #555555', minHeight: '16px', fontSize: '12px', color: '#000', paddingBottom: '1px' }}>{val}</div>
                          </div>
                        ))}
                      </div>

                      {/* Dates */}
                      <div style={{ margin: '16px 0 20px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '10px' }}>
                          <div style={{ fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif", fontSize: '12px', fontWeight: 600, color: '#000000', textTransform: 'uppercase', textAlign: 'right', width: '38%', paddingRight: '10px', flexShrink: 0 }}>Date of Issue:</div>
                          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '14px', fontWeight: 700, color: '#000000' }}>{_issueParts.day}<sup style={{ fontSize: '0.6em', verticalAlign: 'super' }}>TH</sup> {_issueParts.month.toUpperCase()}, {_issueParts.year}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline' }}>
                          <div style={{ fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif", fontSize: '12px', fontWeight: 600, color: '#000000', textTransform: 'uppercase', textAlign: 'right', width: '38%', paddingRight: '10px', flexShrink: 0 }}>Expiry Date:</div>
                          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '14px', fontWeight: 700, color: '#000000' }}>{_expiryParts.day}<sup style={{ fontSize: '0.6em', verticalAlign: 'super' }}>TH</sup> {_expiryParts.month.toUpperCase()}, {_expiryParts.year}</div>
                        </div>
                      </div>

                      {/* Footer: Note + Signature */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '24px' }}>
                        <div style={{ maxWidth: '250px' }}>
                          <div style={{ fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif", fontSize: '11px', fontWeight: 700, color: '#CC0000', textTransform: 'uppercase', marginBottom: '4px' }}>Note:</div>
                          <div style={{ fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif", fontSize: '10px', lineHeight: 1.4, color: '#333333' }}>
                            This Permit is not transferable.<br/>
                            Display this Permit at a conspicuous place<br/>
                            at the business premises.
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          {_dynSig ? <div style={{ marginBottom: '3px' }}><img src={_dynSig} alt="Signature" style={{ width: '140px', height: '45px', objectFit: 'contain' }} /></div> : <div style={{ width: '160px', borderBottom: '1px dotted #333', marginBottom: '4px' }} />}
                          <div style={{ fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif", fontSize: '9px', textTransform: 'uppercase', color: '#000000', letterSpacing: '0.5px', marginBottom: '2px' }}>Signature</div>
                          <div style={{ fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif", fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#CC0000', letterSpacing: '0.5px' }}>{_dynSigTitle ? _dynSigTitle.toUpperCase() : 'MUNICIPAL CO-ORDINATING DIRECTOR'}</div>
                        </div>
                      </div>
                      {/* QR Code */}
                      <div style={{ textAlign: 'center', marginTop: '28px', paddingTop: '14px', borderTop: '1px solid #CCCCCC' }}>
                        {certQrUrl && <img src={certQrUrl} alt="QR Code" style={{ width: '120px', height: '120px', margin: '0 auto' }} />}
                        <div style={{ fontFamily: "'Arial', sans-serif", fontSize: '8px', color: '#666666', marginTop: '3px' }}>Scan to verify certificate authenticity</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-slate-700 bg-slate-800 rounded-b-2xl">
                <button onClick={() => setViewingCert(null)} className="px-4 py-2 rounded-lg border-border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors">
                  Close
                </button>
                <button onClick={() => handlePrintCertificate(viewingCert)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8B7355] hover:bg-[#7a6348] text-white text-sm font-medium transition-colors">
                  <Printer className="w-4 h-4" />
                  Print Permit
                </button>
              </div>
            </div>
          </div>
          );
        })()}      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  FORM VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <button onClick={handleCancel} className="p-2 rounded-lg border-border text-muted-foreground dark:text-foreground hover:bg-muted dark:hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {editingRegNumber ? 'Edit Business' : 'Register New Business'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {editingRegNumber ? 'Update the business details below.' : 'Fill in the details below to register a new business.'}
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
              {/* Business Address (full width) */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Exact Business Location <span className="text-red-500">*</span></label>
                <input type="text" name="businessAddress" value={form.businessAddress} onChange={handleFormChange} placeholder="Full business address" className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            CARD 2: BUSINESS INFORMATION
           ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-muted rounded-xl border-border overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-card/60 border-b border-border">
            <Briefcase className="w-4.5 h-4.5 text-muted-foreground dark:text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Business Information</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              {/* Row 1: DA Assignment No., Business Unique Number, Business Cert No. */}
              <div>
                <label className={`${labelClass} block`}>DA Assignment No.</label>
                <input type="text" name="daAssignmentNo" value={form.daAssignmentNo} readOnly placeholder="Select Locality to auto-generate" className={`${inputClass} bg-card dark:bg-muted/50 text-muted-foreground dark:text-muted-foreground`} />
              </div>
              {/* Business Unique Number */}
              <div>
                <label className={`${labelClass} block`}>Business Unique Number</label>
                <input type="text" name="businessUniqueNumber" value={form.businessUniqueNumber} readOnly placeholder="Select Locality & Date to auto-generate" className={`${inputClass} bg-card dark:bg-muted/50 text-muted-foreground dark:text-muted-foreground`} />
              </div>
              {/* Business Certificate Number */}
              <div>
                <label className={`${labelClass} block`}>Business Certificate Number</label>
                <input type="text" name="businessCertNo" value={form.businessCertNo} readOnly placeholder="Auto-generated" className={`${inputClass} bg-card dark:bg-muted/50 text-muted-foreground dark:text-muted-foreground`} />
              </div>
              {/* Business Name */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Business Name <span className="text-red-500">*</span></label>
                <input type="text" name="name" value={form.name} onChange={handleFormChange} placeholder="Enter business name" className={inputClass} />
              </div>
              {/* Row 2: Revenue Code, Revenue Description, Business TIN */}
              <div>
                <label className={`${labelClass} block`}>Revenue Code</label>
                <div className="relative" ref={bizRevenueCodeRef}>
                  <input
                    type="text"
                    name="code"
                    value={bizRevenueCodeShowDropdown ? bizRevenueCodeSearch : form.code}
                    onChange={(e) => { setBizRevenueCodeSearch(e.target.value); setBizRevenueCodeShowDropdown(true); }}
                    onFocus={() => { setBizRevenueCodeSearch(form.code || ''); setBizRevenueCodeShowDropdown(true); }}
                    placeholder="Type to search code..."
                    className={inputClass}
                  />
                  {bizRevenueCodeShowDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-muted border border-border dark:border-border rounded-lg shadow-lg">
                      {bizRevenueCodeFiltered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
                      ) : bizRevenueCodeFiltered.slice(0, 50).map((item) => (
                        <button key={item.code} type="button" onClick={() => { handleBizRevenueSelect(item); setBizRevenueCodeShowDropdown(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-primary/10 dark:hover:dark:bg-primary/20 transition-colors cursor-pointer border-b border-border dark:border-border last:border-0">
                          <span className="font-mono text-foreground dark:text-foreground">{item.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className={`${labelClass} block`}>Revenue Description</label>
                <div className="relative" ref={bizRevenueDescRef}>
                  <input
                    type="text"
                    name="revenueDescription"
                    value={bizRevenueDescShowDropdown ? bizRevenueDescSearch : form.revenueDescription}
                    onChange={(e) => { setBizRevenueDescSearch(e.target.value); setBizRevenueDescShowDropdown(true); }}
                    onFocus={() => { setBizRevenueDescSearch(form.revenueDescription || ''); setBizRevenueDescShowDropdown(true); }}
                    placeholder="Type to search description..."
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
              <div>
                <label className={`${labelClass} block`}>Business TIN</label>
                <input type="text" name="tin" value={form.tin} onChange={handleFormChange} placeholder="e.g. TIN-1234567890" className={inputClass} />
              </div>
              {/* Row 3: Business Class Code, Business Class, Category */}
              <div>
                <label className={`${labelClass} block`}>Business Class Code</label>
                <Combobox
                  name="businessClassCode"
                  value={form.businessClassCode}
                  onChange={handleFormChange}
                  options={(CLASS_TO_CODES[form.type] || BUSINESS_CLASS_CODES).map((c) => ({ value: c, label: c }))}
                  placeholder="Type or search code..."
                  emptyMessage="No matching codes"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={`${labelClass} block`}>Business Class <span className="text-red-500">*</span></label>
                <Combobox
                  name="type"
                  value={form.type}
                  onChange={handleFormChange}
                  options={businessTypes.map((t) => ({ value: t, label: t }))}
                  placeholder="Type or search business class..."
                  emptyMessage="No matching classes"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={`${labelClass} block`}>Category</label>
                <select name="category" value={form.category} onChange={handleFormChange} className={inputClass}>
                  <option value="">Select Business Class first...</option>
                  {availableCategories.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              {/* Amount (read-only) */}
              <div>
                <label className={`${labelClass} block`}>Amount</label>
                <input type="text" value={displayAmount !== null ? `GH\u20b5 ${displayAmount.toLocaleString()}` : ''} readOnly placeholder="Select a category" className={`${inputClass} bg-card dark:bg-muted/50 text-primary dark:text-primary font-semibold`} />
              </div>
              {/* Employees, Year Established */}
              <div>
                <label className={`${labelClass} block`}>Employees</label>
                <input type="text" name="employees" value={form.employees} onChange={handleFormChange} placeholder="e.g. 15" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Year Established</label>
                <input type="text" name="yearEstablished" value={form.yearEstablished} onChange={handleFormChange} placeholder="e.g. 2020" className={inputClass} />
              </div>
              {/* Date Registered */}
              <div>
                <label className={`${labelClass} block`}>Date Registered</label>
                <input type="date" name="dateRegistered" value={form.dateRegistered} onChange={handleFormChange} className={inputClass} />
              </div>
              {/* Active Status + Excluded from fees (same row) */}
              <div className="flex items-end gap-6">
                <div className="flex-1">
                  <label className={`${labelClass} block`}>Active Status</label>
                  <select name="status" value={form.status} onChange={handleFormChange} className={inputClass}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 pb-2.5 cursor-pointer select-none">
                  <input type="checkbox" name="excludedFromFees" checked={form.excludedFromFees} onChange={handleFormChange} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                  <span className="text-sm text-foreground whitespace-nowrap">Excluded from fees</span>
                </label>
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
                <input type="text" name="ownerName" value={form.ownerName} onChange={handleFormChange} placeholder="Enter full name of owner" className={inputClass} />
              </div>
              {/* National ID (Ghana Card) */}
              <div>
                <label className={`${labelClass} block`}>National ID</label>
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
              {/* Owner TIN */}
              <div>
                <label className={`${labelClass} block`}>TIN</label>
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
          <button onClick={handleCancel} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-card0 hover:bg-slate-600 text-white text-sm font-medium transition-colors">
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-destructive text-white text-sm font-medium transition-colors">
            <Save className="w-4 h-4" />
            {editingRegNumber ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}