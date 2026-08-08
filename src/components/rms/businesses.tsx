'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
  Download,
  Upload,
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
import { getRateOverride } from '@/lib/rate-overrides';
import { Combobox } from '@/components/ui/combobox';
import { BUSINESS_REVENUE_CODES, BIZ_CODE_TO_DESC, BIZ_DESC_TO_CODE } from '@/lib/business-revenue-codes';
// QRCode removed - original cert design does not use QR codes

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
  const displayAmount = form.businessClassCode
    ? (getRateOverride(form.businessClassCode) ?? FEE_CODE_LOOKUP[form.businessClassCode]?.amount ?? null)
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
    if (!form.name || !form.type) return;
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

  const handlePrintCertificate = async (cert: BusinessCert) => {
    const _asmSettings = (() => { try { return JSON.parse(localStorage.getItem('rms-settings-assembly') || '{}'); } catch { return {}; } })();
    const dynAssemblyName = _asmSettings.name || cert.assemblyName || 'Kpando Municipal Assembly';
    const dynAssemblyAddress = _asmSettings.address || cert.assemblyAddress || '';
    const dynLogo = _asmSettings.logo || '';
    const dynSignature = _asmSettings.signature || '';
    const dynSignatoryName = _asmSettings.signatureName || '';
    const dynSignatoryTitle = _asmSettings.signatureTitle || '';
    const businessName = cert.businessName || '';
    const businessLocation = (cert as any).businessLocation || cert.businessAddress || '';
    const businessType = cert.businessType || '';
    const businessCategory = cert.category || '';
    const _finSet = (() => { try { return JSON.parse(localStorage.getItem('rms-settings-financial') || '{}'); } catch { return {}; } })();
    const currentYear = parseInt(_finSet.currentFinancialYear) || new Date().getFullYear();

    const fmtDateParts = (d: string) => {
      if (!d) return { day: '........', month: '........', year: '....' };
      try {
        const dt = new Date(d);
        const day = dt.getDate();
        const s = ['th','st','nd','rd'];
        const v = day % 100;
        const suffix = s[(v-20)%10] || s[v] || s[0];
        return { day: day + suffix, month: dt.toLocaleDateString('en-US', { month: 'long' }), year: String(dt.getFullYear()) };
      } catch { return { day: '........', month: '........', year: '....' };
      }
    };
    const issueParts = fmtDateParts(cert.dateIssued);

    const win = window.open('', '_blank', 'width=900,height=1200');
    if (!win) { alert('Please allow popups to print the certificate.'); return; }
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Certificate Of Registration - ${cert.certNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 10mm; }
    body {
      font-family: 'Times New Roman', Times, Georgia, serif;
      color: #000;
      background: #f0ece0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 10px;
    }
    .cert-outer {
      width: 780px;
      min-height: 1050px;
      background: #FDFBF7;
      position: relative;
      padding: 0;
      border: 18px solid #C5A059;
      border-radius: 40px;
    }
    .cert-inner {
      margin: 45px 50px;
      text-align: center;
    }
    /* Header logos */
    .header-logos {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
    }
    .header-logos .logo-item {
      text-align: center;
      width: 110px;
    }
    .header-logos .logo-item img {
      width: 95px;
      height: 95px;
      object-fit: contain;
    }
    .header-logos .logo-caption {
      font-size: 10px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #000;
      margin-top: 4px;
      font-weight: bold;
    }
    /* Assembly name */
    .assembly-name {
      font-family: 'Arial Black', 'Impact', 'Helvetica Neue', sans-serif;
      font-size: 30px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0B1B2D;
      letter-spacing: -0.5px;
      margin-bottom: 5px;
    }
    /* Certificate title */
    .cert-title {
      font-family: 'Great Vibes', cursive;
      font-size: 46px;
      color: #CC0000;
      margin-bottom: 25px;
      line-height: 1.2;
    }
    /* Body text */
    .cert-body {
      font-size: 16px;
      line-height: 1.8;
      color: #000;
      max-width: 90%;
      margin: 0 auto 20px;
      text-align: left;
    }
    .cert-body .cert-line {
      margin-bottom: 6px;
    }
    .cert-body .handwritten {
      font-family: 'Segoe Script', 'Comic Sans MS', cursive;
      color: #00008B;
      font-size: 17px;
      font-weight: bold;
      border-bottom: 2px dotted #00008B;
      display: inline;
      padding-bottom: 1px;
    }
    .cert-body .label-text {
      font-weight: bold;
      font-size: 16px;
    }
    .cert-body .highlight-text {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 18px;
    }
    /* Date section */
    .date-section {
      text-align: center;
      font-size: 15px;
      line-height: 1.8;
      color: #000;
      max-width: 85%;
      margin: 0 auto 15px;
    }
    .date-section .handwritten {
      font-family: 'Segoe Script', 'Comic Sans MS', cursive;
      color: #00008B;
      font-size: 16px;
      font-weight: bold;
      border-bottom: 2px dotted #00008B;
      display: inline;
      padding-bottom: 1px;
    }
    /* Validity */
    .validity-section {
      text-align: center;
      margin-bottom: 30px;
    }
    .validity-text {
      font-size: 14px;
      color: #000;
    }
    .renew-text {
      font-style: italic;
      color: #CC0000;
      font-size: 14px;
      font-weight: bold;
    }
    /* Signature */
    .signature-section {
      margin-top: 20px;
    }
    .sign-line {
      width: 60%;
      border-bottom: 2px dotted #333;
      margin: 0 auto 8px;
    }
    .sign-image {
      margin-bottom: 4px;
    }
    .sign-image img {
      width: 200px;
      height: 65px;
      object-fit: contain;
    }
    .sign-title-text {
      font-family: 'Arial', sans-serif;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #000;
    }
    /* Receipt */
    .receipt-section {
      text-align: center;
      margin-top: 25px;
      font-size: 13px;
    }
    .receipt-label {
      font-weight: bold;
    }
    .receipt-value {
      border-bottom: 2px dotted #333;
      padding-bottom: 1px;
      margin-left: 5px;
      font-weight: bold;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .cert-outer { border: 18px solid #C5A059; }
    }
  </style>
</head>
<body>
  <div class="cert-outer">
    <div class="cert-inner">
      <!-- Header: Ghana Coat of Arms + Assembly Seal -->
      <div class="header-logos">
        <div class="logo-item">
          <img src="/logos/ghana-coat-of-arms.png" alt="Republic of Ghana" />
          <div class="logo-caption">Republic of Ghana</div>
        </div>
        <div class="logo-item">
          ${dynLogo ? `<img src="${dynLogo}" alt="Assembly Seal" />` : '<img src="/logos/assembly-seal.png" alt="Assembly Seal" />'}
          <div class="logo-caption">${dynAssemblyName.toUpperCase()}</div>
        </div>
      </div>

      <!-- Assembly Name -->
      <div class="assembly-name">${dynAssemblyName.toUpperCase()}</div>

      <!-- Certificate Title -->
      <div class="cert-title">Certificate Of Registration</div>

      <!-- Body -->
      <div class="cert-body">
        <div class="cert-line"><span class="label-text">I Hereby Certify that</span></div>
        <div class="cert-line" style="margin-top: 10px;">Messrs <span class="handwritten">${businessName.toUpperCase()}</span></div>
        <div class="cert-line" style="margin-top: 12px;">Has complied with the bye-laws/directives of the</div>
        <div class="cert-line"><span class="highlight-text">${dynAssemblyName.toUpperCase()}</span></div>
        <div class="cert-line">and has duly been permitted to operate within the ${dynAssemblyName.replace('Municipal Assembly','').replace('District Assembly','').replace('Metropolitan Assembly','')} Municipality</div>
        <div class="cert-line" style="margin-top: 8px;">as. <span class="handwritten">${businessName.toUpperCase()}</span></div>
      </div>

      <!-- Date -->
      <div class="date-section">
        <div>Give under my hand at ${dynAssemblyName.replace(' Municipal Assembly','').replace(' District Assembly','').replace(' Metropolitan Assembly','')}</div>
        <div style="margin-top: 8px;">this <span class="handwritten">${issueParts.day}</span> day of <span class="handwritten">${issueParts.month}</span> <span class="handwritten">${issueParts.year}</span></div>
      </div>

      <!-- Validity -->
      <div class="validity-section">
        <div class="validity-text">Valid until 31st December ${currentYear}</div>
        <div class="renew-text"><em>Renew Yearly</em></div>
      </div>

      <!-- Signature -->
      <div class="signature-section">
        ${dynSignature ? `<div class="sign-image" style="text-align:center;"><img src="${dynSignature}" alt="Signature" /></div>` : '<div class="sign-line"></div>'}
        <div class="sign-title-text">${dynSignatoryTitle ? dynSignatoryTitle.toUpperCase() : 'MUNICIPAL CO-ORDINATION DIRECTOR'}</div>
      </div>

      <!-- Receipt Number -->
      <div class="receipt-section">
        <span class="receipt-label">RECEIPT No.:</span><span class="receipt-value">${cert.certNumber || ''}</span>
      </div>
    </div>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`);
    win.document.close();
  };

  // ── Form Field Helper ────────────────────────────────────────────────────
  const inputClass =
    'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition';
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Business Registration
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage and register businesses within the assembly. Track revenue
              collection and compliance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditingRegNumber(null); setForm({ ...defaultForm, businessUniqueNumber: generateBusinessUniqueNumber(), businessCertNo: generateBusinessCertNo(), daAssignmentNo: generateDaAssignmentNo() }); setView('form'); }}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Register New Business
            </button>
            <button onClick={handleExport} className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap">
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
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Business Unique Number</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Business Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Owner</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Business Class</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap hidden lg:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap hidden md:table-cell">TIN</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 dark:text-slate-500">
                      <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      No businesses found. Click "Register New Business" to add one.
                    </td>
                  </tr>
                ) : (
                  paged.map((biz, i) => (
                    <tr key={`biz-${i}-${biz.regNumber || biz.name}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{biz.businessUniqueNumber || biz.regNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">{biz.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{biz.owner}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{biz.type}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap hidden lg:table-cell">{biz.category}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap hidden md:table-cell">{biz.tin}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          biz.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                        }`}>
                          {biz.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => handleViewCertificate(biz.regNumber)} className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="View Certificate">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEdit(biz)} className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(biz.regNumber)} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
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
          <p className="text-slate-500 dark:text-slate-400">Showing {showingFrom}-{showingTo} of {filtered.length}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safeCurrentPage <= 1} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">{safeCurrentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safeCurrentPage >= totalPages} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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
          const _dynSigName = _asm.signatureName || '';
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

          return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewingCert(null)}>
            <div className="rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3 bg-slate-800 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-amber-500/20">
                    <Award className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Certificate Of Registration</h3>
                    <p className="text-xs text-slate-400">{viewingCert.certNumber}</p>
                  </div>
                </div>
                <button onClick={() => setViewingCert(null)} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Certificate Preview - matching original Certificate Of Registration design */}
              <div className="p-4">
                <div className="p-4" style={{ background: '#f0ece0' }}>
                  <div style={{ background: '#FDFBF7', border: '14px solid #C5A059', borderRadius: '30px', padding: '30px 35px', textAlign: 'center' }}>
                    {/* Header Logos */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-center" style={{ width: '90px' }}>
                        <img src="/logos/ghana-coat-of-arms.png" alt="Republic of Ghana" style={{ width: '75px', height: '75px', objectFit: 'contain' }} />
                        <div style={{ fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', color: '#000', marginTop: '2px', fontWeight: 'bold' }}>Republic of Ghana</div>
                      </div>
                      <div className="text-center" style={{ width: '90px' }}>
                        {_dynLogo ? <img src={_dynLogo} alt="Assembly Seal" style={{ width: '75px', height: '75px', objectFit: 'contain' }} /> : <img src="/logos/assembly-seal.png" alt="Assembly Seal" style={{ width: '75px', height: '75px', objectFit: 'contain' }} />}
                        <div style={{ fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', color: '#000', marginTop: '2px', fontWeight: 'bold' }}>{dynAssemblyName.toUpperCase()}</div>
                      </div>
                    </div>

                    {/* Assembly Name */}
                    <div style={{ fontFamily: 'Arial Black, Impact, sans-serif', fontSize: '22px', fontWeight: '900', textTransform: 'uppercase', color: '#0B1B2D', letterSpacing: '-0.5px', marginBottom: '4px' }}>{dynAssemblyName.toUpperCase()}</div>

                    {/* Certificate Title */}
                    <div style={{ fontFamily: 'Great Vibes, cursive', fontSize: '34px', color: '#CC0000', marginBottom: '16px', lineHeight: 1.2 }}>Certificate Of Registration</div>

                    {/* Body Text */}
                    <div style={{ fontSize: '12px', lineHeight: '1.8', color: '#000', maxWidth: '90%', margin: '0 auto 14px', textAlign: 'left' }}>
                      <div style={{ marginBottom: '4px' }}><span style={{ fontWeight: 'bold', fontSize: '12px' }}>I Hereby Certify that</span></div>
                      <div style={{ marginTop: '8px' }}>Messrs <span style={{ fontFamily: 'Segoe Script, Comic Sans MS, cursive', color: '#00008B', fontSize: '13px', fontWeight: 'bold', borderBottom: '1.5px dotted #00008B', paddingBottom: '1px' }}>{(viewingCert.businessName || '').toUpperCase()}</span></div>
                      <div style={{ marginTop: '10px' }}>Has complied with the bye-laws/directives of the</div>
                      <div><span style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '14px' }}>{dynAssemblyName.toUpperCase()}</span></div>
                      <div>and has duly been permitted to operate within the {dynAssemblyName.replace('Municipal Assembly','').replace('District Assembly','').replace('Metropolitan Assembly','')} Municipality</div>
                      <div style={{ marginTop: '6px' }}>as. <span style={{ fontFamily: 'Segoe Script, Comic Sans MS, cursive', color: '#00008B', fontSize: '13px', fontWeight: 'bold', borderBottom: '1.5px dotted #00008B', paddingBottom: '1px' }}>{(viewingCert.businessName || '').toUpperCase()}</span></div>
                    </div>

                    {/* Date */}
                    <div style={{ textAlign: 'center', fontSize: '11px', lineHeight: '1.8', color: '#000', maxWidth: '85%', margin: '0 auto 12px' }}>
                      <div>Give under my hand at {dynAssemblyName.replace(' Municipal Assembly','').replace(' District Assembly','').replace(' Metropolitan Assembly','')}</div>
                      <div style={{ marginTop: '6px' }}>this <span style={{ fontFamily: 'Segoe Script, Comic Sans MS, cursive', color: '#00008B', fontSize: '12px', fontWeight: 'bold', borderBottom: '1.5px dotted #00008B', paddingBottom: '1px' }}>{_issueParts.day}</span> day of <span style={{ fontFamily: 'Segoe Script, Comic Sans MS, cursive', color: '#00008B', fontSize: '12px', fontWeight: 'bold', borderBottom: '1.5px dotted #00008B', paddingBottom: '1px' }}>{_issueParts.month}</span> <span style={{ fontFamily: 'Segoe Script, Comic Sans MS, cursive', color: '#00008B', fontSize: '12px', fontWeight: 'bold', borderBottom: '1.5px dotted #00008B', paddingBottom: '1px' }}>{_issueParts.year}</span></div>
                    </div>

                    {/* Validity */}
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                      <div style={{ fontSize: '11px', color: '#000' }}>Valid until 31st December {_finYear}</div>
                      <div style={{ fontStyle: 'italic', color: '#CC0000', fontSize: '11px', fontWeight: 'bold' }}><em>Renew Yearly</em></div>
                    </div>

                    {/* Signature */}
                    <div style={{ marginTop: '14px' }}>
                      {_dynSig ? <div style={{ textAlign: 'center', marginBottom: '3px' }}><img src={_dynSig} alt="Signature" style={{ width: '140px', height: '45px', objectFit: 'contain', margin: '0 auto' }} /></div> : <div style={{ width: '55%', borderBottom: '1.5px dotted #333', margin: '0 auto 6px' }} />}
                      <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#000' }}>{_dynSigTitle ? _dynSigTitle.toUpperCase() : 'MUNICIPAL CO-ORDINATION DIRECTOR'}</div>
                    </div>

                    {/* Receipt Number */}
                    <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '10px' }}>
                      <span style={{ fontWeight: 'bold' }}>RECEIPT No.:</span><span style={{ borderBottom: '1.5px dotted #333', paddingBottom: '1px', marginLeft: '4px', fontWeight: 'bold' }}>{viewingCert.certNumber || ''}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-slate-700 bg-slate-800 rounded-b-2xl">
                <button onClick={() => setViewingCert(null)} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors">
                  Close
                </button>
                <button onClick={() => handlePrintCertificate(viewingCert)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C5A059] hover:bg-[#b08d4a] text-white text-sm font-medium transition-colors">
                  <Printer className="w-4 h-4" />
                  Print Certificate
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
        <button onClick={handleCancel} className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
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
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <Briefcase className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Business Information</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              {/* Row 1: DA Assignment No., Business Unique Number, Business Cert No. */}
              <div>
                <label className={`${labelClass} block`}>DA Assignment No.</label>
                <input type="text" name="daAssignmentNo" value={form.daAssignmentNo} readOnly placeholder="Select Locality to auto-generate" className={`${inputClass} bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400`} />
              </div>
              {/* Business Unique Number */}
              <div>
                <label className={`${labelClass} block`}>Business Unique Number</label>
                <input type="text" name="businessUniqueNumber" value={form.businessUniqueNumber} readOnly placeholder="Select Locality & Date to auto-generate" className={`${inputClass} bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400`} />
              </div>
              {/* Business Certificate Number */}
              <div>
                <label className={`${labelClass} block`}>Business Certificate Number</label>
                <input type="text" name="businessCertNo" value={form.businessCertNo} readOnly placeholder="Auto-generated" className={`${inputClass} bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400`} />
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
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg">
                      {bizRevenueCodeFiltered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-400">No matches</div>
                      ) : bizRevenueCodeFiltered.slice(0, 50).map((item) => (
                        <button key={item.code} type="button" onClick={() => { handleBizRevenueSelect(item); setBizRevenueCodeShowDropdown(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0">
                          <span className="font-mono text-xs text-slate-500 mr-2">{item.code}</span>
                          <span className="text-slate-800 dark:text-white">{item.description}</span>
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
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg">
                      {bizRevenueDescFiltered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-400">No matches</div>
                      ) : bizRevenueDescFiltered.slice(0, 50).map((item) => (
                        <button key={item.code} type="button" onClick={() => { handleBizRevenueSelect(item); setBizRevenueDescShowDropdown(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0">
                          <span className="text-slate-800 dark:text-white">{item.description}</span>
                          <span className="ml-2 font-mono text-xs text-slate-400">{item.code}</span>
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
                <input type="text" value={displayAmount !== null ? `GH\u20b5 ${displayAmount.toLocaleString()}` : ''} readOnly placeholder="Select a category" className={`${inputClass} bg-slate-50 dark:bg-slate-800/50 text-emerald-700 dark:text-emerald-400 font-semibold`} />
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
                  <input type="checkbox" name="excludedFromFees" checked={form.excludedFromFees} onChange={handleFormChange} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">Excluded from fees</span>
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
          <button onClick={handleCancel} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-500 hover:bg-slate-600 text-white text-sm font-medium transition-colors">
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
            <Save className="w-4 h-4" />
            {editingRegNumber ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}