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
    const fmtDateOrdinal = (d: string) => {
      if (!d) return '..................';
      try {
        const dt = new Date(d);
        const day = dt.getDate();
        const s = ['th','st','nd','rd'];
        const v = day % 100;
        const suffix = s[(v-20)%10] || s[v] || s[0];
        return day + suffix + ' ' + dt.toLocaleDateString('en-US', { month: 'long' }).toUpperCase() + ', ' + dt.getFullYear();
      } catch { return d; }
    };
    const issueDate = fmtDateOrdinal(cert.dateIssued);
    const expiryDate = fmtDateOrdinal(cert.expiryDate);
    const businessNo = cert.businessUniqueNumber || cert.regNumber || cert.certNumber || '';
    const businessLocation = (cert as any).businessLocation || cert.businessAddress || '';
    const _finSet = (() => { try { return JSON.parse(localStorage.getItem('rms-settings-financial') || '{}'); } catch { return {}; } })();
    const currentYear = parseInt(_finSet.currentFinancialYear) || new Date().getFullYear();

    let qrDataUrl = '';
    try {
      const qrPayload = JSON.stringify({ cert: cert.certNumber, reg: cert.regNumber, name: cert.businessName, type: cert.businessType, issued: cert.dateIssued, expiry: cert.expiryDate });
      qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 200, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
    } catch {}

    const win = window.open('', '_blank', 'width=900,height=1200');
    if (!win) { alert('Please allow popups to print the certificate.'); return; }
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Business Operating Permit - ${cert.certNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 10mm; }
    body {
      font-family: 'Times New Roman', Times, Georgia, serif;
      color: #000;
      background: #f5f0e1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 10px;
    }
    .permit-outer {
      width: 780px;
      background: #FFFFFF;
      position: relative;
      padding: 0;
    }
    /* Double border */
    .border-outer {
      position: absolute;
      inset: 0;
      border: 3px solid #8B6914;
      pointer-events: none;
      z-index: 3;
    }
    .border-inner {
      position: absolute;
      inset: 8px;
      border: 1.5px solid #8B6914;
      pointer-events: none;
      z-index: 3;
    }
    /* Corner scrollwork */
    .corner { position: absolute; width: 80px; height: 80px; z-index: 4; }
    .corner svg { width: 100%; height: 100%; }
    .corner-tl { top: 2px; left: 2px; }
    .corner-tr { top: 2px; right: 2px; transform: scaleX(-1); }
    .corner-bl { bottom: 2px; left: 2px; transform: scaleY(-1); }
    .corner-br { bottom: 2px; right: 2px; transform: scale(-1, -1); }
    /* Inner content */
    .permit-inner {
      margin: 28px 36px 24px;
      position: relative;
      z-index: 1;
    }
    /* Header row: logo + title */
    .header-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      margin-bottom: 6px;
    }
    .header-logo {
      width: 90px;
      height: 90px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header-logo img {
      width: 85px;
      height: 85px;
      object-fit: contain;
    }
    .header-logo-placeholder {
      width: 80px;
      height: 80px;
      border: 2px solid #333;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      color: #666;
      text-align: center;
      line-height: 1.2;
      background: #fafafa;
    }
    .header-divider {
      width: 2px;
      height: 90px;
      background: #000;
      margin: 0 16px;
      flex-shrink: 0;
    }
    .header-title-block {
      text-align: left;
    }
    .header-title {
      font-family: 'Times New Roman', Times, serif;
      font-size: 26px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #000;
      line-height: 1.2;
    }
    /* Subtitle */
    .subtitle-section {
      text-align: center;
      margin: 10px 0 8px;
    }
    .subtitle-text {
      font-family: 'Times New Roman', Times, serif;
      font-size: 18px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: #000;
    }
    .subtitle-ornament {
      margin: 6px auto 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
    }
    .subtitle-ornament .line { width: 120px; height: 1.5px; background: #8B6914; }
    .subtitle-ornament .diamond {
      width: 10px;
      height: 10px;
      background: #8B6914;
      transform: rotate(45deg);
      margin: 0 8px;
    }
    .subtitle-ornament .dot { width: 4px; height: 4px; background: #8B6914; border-radius: 50%; margin: 0 4px; }
    /* Business Number Section */
    .biz-number-section {
      text-align: center;
      margin: 18px 0 12px;
      position: relative;
    }
    .biz-number-label {
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: #000;
      margin-bottom: 2px;
    }
    .biz-number-value {
      font-family: 'Times New Roman', Times, serif;
      font-size: 38px;
      font-weight: bold;
      color: #B22222;
      letter-spacing: 2px;
    }
    /* Watermark */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 280px;
      height: 280px;
      border: 3px solid #ccc;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.07;
      pointer-events: none;
      z-index: 0;
    }
    .watermark-text {
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
      text-align: center;
      color: #000;
      letter-spacing: 2px;
      line-height: 1.4;
    }
    /* Legal text */
    .legal-text {
      text-align: center;
      font-size: 12.5px;
      line-height: 1.8;
      color: #333;
      margin: 14px 0 16px;
      font-style: italic;
      padding: 0 20px;
    }
    .legal-text .highlight {
      font-weight: bold;
      text-transform: uppercase;
      color: #000;
      font-style: normal;
    }
    /* Separator */
    .separator {
      border: none;
      height: 1.5px;
      background: linear-gradient(90deg, transparent, #8B6914, #333, #8B6914, transparent);
      margin: 16px 0;
    }
    /* Fields */
    .fields-section {
      margin: 0 auto;
      max-width: 600px;
    }
    .field-row {
      display: flex;
      align-items: baseline;
      margin-bottom: 14px;
      gap: 8px;
    }
    .field-label {
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #000;
      min-width: 200px;
      text-align: left;
      flex-shrink: 0;
    }
    .field-dots {
      flex: 1;
      border-bottom: 1.5px dotted #333;
      padding-bottom: 2px;
      font-size: 13px;
      font-weight: bold;
      color: #000;
      min-height: 20px;
    }
    /* Dates */
    .dates-section {
      max-width: 600px;
      margin: 0 auto;
    }
    .date-row {
      display: flex;
      align-items: baseline;
      margin-bottom: 10px;
      gap: 8px;
    }
    .date-label {
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #000;
      min-width: 200px;
      text-align: left;
      flex-shrink: 0;
    }
    .date-value {
      font-size: 13px;
      font-weight: bold;
      color: #000;
    }
    /* Footer */
    .footer-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 22px;
      padding: 0 10px;
    }
    .note-section {
      flex: 1;
    }
    .note-label {
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #B22222;
      margin-bottom: 6px;
    }
    .note-text {
      font-size: 11px;
      line-height: 1.7;
      color: #333;
    }
    .sign-section {
      text-align: center;
      min-width: 240px;
    }
    .sign-line {
      width: 200px;
      border-bottom: 1.5px dotted #333;
      margin-bottom: 6px;
    }
    .sign-image {
      margin-bottom: 4px;
    }
    .sign-image img {
      width: 180px;
      height: 60px;
      object-fit: contain;
    }
    .sign-label {
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #000;
    }
    .sign-title {
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #B22222;
      margin-top: 1px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .permit-outer { border: none; }
    }
  </style>
</head>
<body>
  <div class="permit-outer">
    <div class="border-outer"></div>
    <div class="border-inner"></div>
    <!-- Corner scrollwork -->
    <div class="corner corner-tl"><svg viewBox="0 0 80 80"><path d="M5,70 Q5,5 70,5" fill="none" stroke="#8B6914" stroke-width="3"/><path d="M12,63 Q12,12 63,12" fill="none" stroke="#8B6914" stroke-width="1.5"/><path d="M18,56 Q18,18 56,18" fill="none" stroke="#8B6914" stroke-width="1" opacity="0.5"/><circle cx="14" cy="14" r="5" fill="none" stroke="#8B6914" stroke-width="1.5"/><circle cx="14" cy="14" r="2" fill="#8B6914"/><path d="M8,35 Q22,22 35,8" fill="none" stroke="#8B6914" stroke-width="1.5" opacity="0.6"/><path d="M5,50 Q15,35 25,20" fill="none" stroke="#8B6914" stroke-width="1" opacity="0.4"/></svg></div>
    <div class="corner corner-tr"><svg viewBox="0 0 80 80"><path d="M5,70 Q5,5 70,5" fill="none" stroke="#8B6914" stroke-width="3"/><path d="M12,63 Q12,12 63,12" fill="none" stroke="#8B6914" stroke-width="1.5"/><path d="M18,56 Q18,18 56,18" fill="none" stroke="#8B6914" stroke-width="1" opacity="0.5"/><circle cx="14" cy="14" r="5" fill="none" stroke="#8B6914" stroke-width="1.5"/><circle cx="14" cy="14" r="2" fill="#8B6914"/><path d="M8,35 Q22,22 35,8" fill="none" stroke="#8B6914" stroke-width="1.5" opacity="0.6"/><path d="M5,50 Q15,35 25,20" fill="none" stroke="#8B6914" stroke-width="1" opacity="0.4"/></svg></div>
    <div class="corner corner-bl"><svg viewBox="0 0 80 80"><path d="M5,70 Q5,5 70,5" fill="none" stroke="#8B6914" stroke-width="3"/><path d="M12,63 Q12,12 63,12" fill="none" stroke="#8B6914" stroke-width="1.5"/><path d="M18,56 Q18,18 56,18" fill="none" stroke="#8B6914" stroke-width="1" opacity="0.5"/><circle cx="14" cy="14" r="5" fill="none" stroke="#8B6914" stroke-width="1.5"/><circle cx="14" cy="14" r="2" fill="#8B6914"/><path d="M8,35 Q22,22 35,8" fill="none" stroke="#8B6914" stroke-width="1.5" opacity="0.6"/><path d="M5,50 Q15,35 25,20" fill="none" stroke="#8B6914" stroke-width="1" opacity="0.4"/></svg></div>
    <div class="corner corner-br"><svg viewBox="0 0 80 80"><path d="M5,70 Q5,5 70,5" fill="none" stroke="#8B6914" stroke-width="3"/><path d="M12,63 Q12,12 63,12" fill="none" stroke="#8B6914" stroke-width="1.5"/><path d="M18,56 Q18,18 56,18" fill="none" stroke="#8B6914" stroke-width="1" opacity="0.5"/><circle cx="14" cy="14" r="5" fill="none" stroke="#8B6914" stroke-width="1.5"/><circle cx="14" cy="14" r="2" fill="#8B6914"/><path d="M8,35 Q22,22 35,8" fill="none" stroke="#8B6914" stroke-width="1.5" opacity="0.6"/><path d="M5,50 Q15,35 25,20" fill="none" stroke="#8B6914" stroke-width="1" opacity="0.4"/></svg></div>

    <div class="permit-inner">
      <!-- Header: Logo + Assembly Name -->
      <div class="header-row">
        <div class="header-logo">
          ${dynLogo ? `<img src="${dynLogo}" alt="Logo" />` : '<div class="header-logo-placeholder">ASSEMBLY<br/>LOGO</div>'}
        </div>
        <div class="header-divider"></div>
        <div class="header-title-block">
          <div class="header-title">${dynAssemblyName.toUpperCase()}</div>
        </div>
      </div>

      <!-- Subtitle: Business Operating Permit -->
      <div class="subtitle-section">
        <div class="subtitle-text">Business Operating Permit</div>
        <div class="subtitle-ornament">
          <div class="line"></div>
          <div class="dot"></div>
          <div class="diamond"></div>
          <div class="dot"></div>
          <div class="line"></div>
        </div>
      </div>

      <!-- Business Number with Watermark -->
      <div class="biz-number-section">
        <div class="watermark">
          <div class="watermark-text">${dynAssemblyName.toUpperCase()}</div>
        </div>
        <div class="biz-number-label">Business Name</div>
        <div class="biz-number-value">${businessNo}</div>
      </div>

      <!-- Legal Authority Text -->
      <div class="legal-text">
        Issued under the Local Governance Act, 2016 (Act 936)<br/>
        Section 87(1) to operate a business within the<br/>
        <span class="highlight">${dynAssemblyName.toUpperCase()}</span><br/>
        Jurisdiction for the year ${currentYear}.
      </div>

      <hr class="separator">

      <!-- Fields -->
      <div class="fields-section">
        <div class="field-row">
          <div class="field-label">1. Business Number:</div>
          <div class="field-dots">${businessNo}</div>
        </div>
        <div class="field-row">
          <div class="field-label">2. Business Location:</div>
          <div class="field-dots">${businessLocation.toUpperCase()}</div>
        </div>
        <div class="field-row">
          <div class="field-label">3. Business Class:</div>
          <div class="field-dots">${(cert.businessType || '').toUpperCase()}</div>
        </div>
        <div class="field-row">
          <div class="field-label">4. Business Category:</div>
          <div class="field-dots">${(cert.category || '').toUpperCase()}</div>
        </div>
      </div>

      <hr class="separator">

      <!-- Dates -->
      <div class="dates-section">
        <div class="date-row">
          <div class="date-label">Date of Issue:</div>
          <div class="date-value">${issueDate}</div>
        </div>
        <div class="date-row">
          <div class="date-label">Expiry Date:</div>
          <div class="date-value">${expiryDate}</div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer-section">
        <div class="note-section">
          <div class="note-label">Note:</div>
          <div class="note-text">
            This Permit is not transferable.<br/>
            Display this Permit at a conspicuous place<br/>
            at the business premises.
          </div>
        </div>
        <div class="sign-section">
          ${dynSignature ? `<div class="sign-image"><img src="${dynSignature}" alt="Signature" /></div>` : '<div class="sign-line"></div>'}
          <div class="sign-label">${dynSignatoryName ? dynSignatoryName.toUpperCase() : 'Signature'}</div>
          ${dynSignatoryTitle ? `<div class="sign-title">${dynSignatoryTitle.toUpperCase()}</div>` : ''}
        </div>
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
          const fmtDateOrdinalPreview = (d: string) => {
            if (!d) return '..................';
            try {
              const dt = new Date(d);
              const day = dt.getDate();
              const s = ['th','st','nd','rd'];
              const v = day % 100;
              const suffix = s[(v-20)%10] || s[v] || s[0];
              return day + suffix + ' ' + dt.toLocaleDateString('en-US', { month: 'long' }).toUpperCase() + ', ' + dt.getFullYear();
            } catch { return d; }
          };
          const _finYear = (() => { try { return JSON.parse(localStorage.getItem('rms-settings-financial') || '{}').currentFinancialYear || String(new Date().getFullYear()); } catch { return String(new Date().getFullYear()); } })();

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
                    <h3 className="text-base font-semibold text-white">Business Operating Permit</h3>
                    <p className="text-xs text-slate-400">{viewingCert.certNumber}</p>
                  </div>
                </div>
                <button onClick={() => setViewingCert(null)} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Permit Preview - matching the new print design */}
              <div className="p-4">
                <div className="rounded-lg p-4" style={{ background: '#f5f0e1' }}>
                  <div className="relative" style={{ background: '#FFFFFF', padding: '0' }}>
                    {/* Double border */}
                    <div className="absolute" style={{ inset: '0', border: '3px solid #8B6914', pointerEvents: 'none', zIndex: 3 }} />
                    <div className="absolute" style={{ inset: '8px', border: '1.5px solid #8B6914', pointerEvents: 'none', zIndex: 3 }} />
                    {/* Corner SVGs */}
                    <svg className="absolute" style={{ top: '2px', left: '2px', width: '60px', height: '60px', zIndex: 4 }} viewBox="0 0 80 80"><path d="M5,70 Q5,5 70,5" fill="none" stroke="#8B6914" strokeWidth="3"/><path d="M12,63 Q12,12 63,12" fill="none" stroke="#8B6914" strokeWidth="1.5"/><circle cx="14" cy="14" r="5" fill="none" stroke="#8B6914" strokeWidth="1.5"/><circle cx="14" cy="14" r="2" fill="#8B6914"/></svg>
                    <svg className="absolute" style={{ top: '2px', right: '2px', width: '60px', height: '60px', zIndex: 4, transform: 'scaleX(-1)' }} viewBox="0 0 80 80"><path d="M5,70 Q5,5 70,5" fill="none" stroke="#8B6914" strokeWidth="3"/><path d="M12,63 Q12,12 63,12" fill="none" stroke="#8B6914" strokeWidth="1.5"/><circle cx="14" cy="14" r="5" fill="none" stroke="#8B6914" strokeWidth="1.5"/><circle cx="14" cy="14" r="2" fill="#8B6914"/></svg>
                    <svg className="absolute" style={{ bottom: '2px', left: '2px', width: '60px', height: '60px', zIndex: 4, transform: 'scaleY(-1)' }} viewBox="0 0 80 80"><path d="M5,70 Q5,5 70,5" fill="none" stroke="#8B6914" strokeWidth="3"/><path d="M12,63 Q12,12 63,12" fill="none" stroke="#8B6914" strokeWidth="1.5"/><circle cx="14" cy="14" r="5" fill="none" stroke="#8B6914" strokeWidth="1.5"/><circle cx="14" cy="14" r="2" fill="#8B6914"/></svg>
                    <svg className="absolute" style={{ bottom: '2px', right: '2px', width: '60px', height: '60px', zIndex: 4, transform: 'scale(-1,-1)' }} viewBox="0 0 80 80"><path d="M5,70 Q5,5 70,5" fill="none" stroke="#8B6914" strokeWidth="3"/><path d="M12,63 Q12,12 63,12" fill="none" stroke="#8B6914" strokeWidth="1.5"/><circle cx="14" cy="14" r="5" fill="none" stroke="#8B6914" strokeWidth="1.5"/><circle cx="14" cy="14" r="2" fill="#8B6914"/></svg>

                    <div className="relative" style={{ padding: '24px 28px 20px', zIndex: 1 }}>
                      {/* Header: Logo + Assembly Name */}
                      <div className="flex items-center justify-center gap-0 mb-1">
                        <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '70px', height: '70px' }}>
                          {_dynLogo ? <img src={_dynLogo} alt="Logo" style={{ width: '65px', height: '65px', objectFit: 'contain' }} /> : <div className="flex items-center justify-center text-center" style={{ width: '60px', height: '60px', border: '2px solid #333', borderRadius: '50%', fontSize: '7px', color: '#666', lineHeight: 1.2, background: '#fafafa' }}>LOGO</div>}
                        </div>
                        <div style={{ width: '2px', height: '70px', background: '#000', margin: '0 12px', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontFamily: 'Times New Roman, Times, serif', fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#000' }}>{dynAssemblyName.toUpperCase()}</div>
                        </div>
                      </div>

                      {/* Subtitle */}
                      <div className="text-center my-2">
                        <div style={{ fontFamily: 'Times New Roman, Times, serif', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', color: '#000' }}>Business Operating Permit</div>
                        <div className="flex items-center justify-center mt-1">
                          <div style={{ width: '80px', height: '1.5px', background: '#8B6914' }} />
                          <div style={{ width: '3px', height: '3px', background: '#8B6914', borderRadius: '50%', margin: '0 3px' }} />
                          <div style={{ width: '7px', height: '7px', background: '#8B6914', transform: 'rotate(45deg)', margin: '0 5px' }} />
                          <div style={{ width: '3px', height: '3px', background: '#8B6914', borderRadius: '50%', margin: '0 3px' }} />
                          <div style={{ width: '80px', height: '1.5px', background: '#8B6914' }} />
                        </div>
                      </div>

                      {/* Business Number with Watermark */}
                      <div className="text-center my-3 relative">
                        <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '180px', height: '180px', border: '2px solid #ccc', borderRadius: '50%', opacity: 0.07, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 0 }}>
                          <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '1px' }}>{dynAssemblyName.toUpperCase()}</div>
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', color: '#000', position: 'relative', zIndex: 1 }}>Business Name</div>
                        <div style={{ fontFamily: 'Times New Roman, Times, serif', fontSize: '26px', fontWeight: 'bold', color: '#B22222', letterSpacing: '1px', position: 'relative', zIndex: 1 }}>
                          {viewingCert.businessUniqueNumber || viewingCert.regNumber || viewingCert.certNumber}
                        </div>
                      </div>

                      {/* Legal Text */}
                      <div className="text-center my-2" style={{ fontSize: '9.5px', lineHeight: '1.8', color: '#333', fontStyle: 'italic', padding: '0 10px' }}>
                        Issued under the Local Governance Act, 2016 (Act 936)<br/>
                        Section 87(1) to operate a business within the<br/>
                        <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#000', fontStyle: 'normal' }}>{dynAssemblyName.toUpperCase()}</span><br/>
                        Jurisdiction for the year {_finYear}.
                      </div>

                      {/* Separator */}
                      <div className="my-2" style={{ height: '1.5px', background: 'linear-gradient(90deg, transparent, #8B6914, #333, #8B6914, transparent)' }} />

                      {/* Fields */}
                      <div className="my-2 mx-auto" style={{ maxWidth: '420px' }}>
                        <div className="flex items-baseline mb-2 gap-2">
                          <div className="uppercase tracking-wide flex-shrink-0" style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#000', minWidth: '160px' }}>1. Business Number:</div>
                          <div className="font-bold" style={{ fontSize: '11px', color: '#000', borderBottom: '1.5px dotted #333', flex: 1, paddingBottom: '1px' }}>{(viewingCert.businessUniqueNumber || viewingCert.regNumber || '').toUpperCase()}</div>
                        </div>
                        <div className="flex items-baseline mb-2 gap-2">
                          <div className="uppercase tracking-wide flex-shrink-0" style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#000', minWidth: '160px' }}>2. Business Location:</div>
                          <div className="font-bold" style={{ fontSize: '11px', color: '#000', borderBottom: '1.5px dotted #333', flex: 1, paddingBottom: '1px' }}>{((viewingCert as any).businessLocation || '').toUpperCase()}</div>
                        </div>
                        <div className="flex items-baseline mb-2 gap-2">
                          <div className="uppercase tracking-wide flex-shrink-0" style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#000', minWidth: '160px' }}>3. Business Class:</div>
                          <div className="font-bold" style={{ fontSize: '11px', color: '#000', borderBottom: '1.5px dotted #333', flex: 1, paddingBottom: '1px' }}>{(viewingCert.businessType || '').toUpperCase()}</div>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <div className="uppercase tracking-wide flex-shrink-0" style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#000', minWidth: '160px' }}>4. Business Category:</div>
                          <div className="font-bold" style={{ fontSize: '11px', color: '#000', borderBottom: '1.5px dotted #333', flex: 1, paddingBottom: '1px' }}>{(viewingCert.category || '').toUpperCase()}</div>
                        </div>
                      </div>

                      {/* Separator */}
                      <div className="my-2" style={{ height: '1.5px', background: 'linear-gradient(90deg, transparent, #8B6914, #333, #8B6914, transparent)' }} />

                      {/* Dates */}
                      <div className="my-2 mx-auto" style={{ maxWidth: '420px' }}>
                        <div className="flex items-baseline mb-2 gap-2">
                          <div className="uppercase tracking-wide flex-shrink-0" style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#000', minWidth: '160px' }}>Date of Issue:</div>
                          <div className="font-bold" style={{ fontSize: '10px', color: '#000' }}>{fmtDateOrdinalPreview(viewingCert.dateIssued)}</div>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <div className="uppercase tracking-wide flex-shrink-0" style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#000', minWidth: '160px' }}>Expiry Date:</div>
                          <div className="font-bold" style={{ fontSize: '10px', color: '#000' }}>{fmtDateOrdinalPreview(viewingCert.expiryDate)}</div>
                        </div>
                      </div>

                      {/* Footer: Note + Signature */}
                      <div className="flex justify-between items-end mt-4 px-2">
                        <div>
                          <div style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#B22222', marginBottom: '4px' }}>Note:</div>
                          <div style={{ fontSize: '8.5px', lineHeight: '1.7', color: '#333' }}>
                            This Permit is not transferable.<br/>
                            Display this Permit at a conspicuous place<br/>
                            at the business premises.
                          </div>
                        </div>
                        <div className="text-center" style={{ minWidth: '180px' }}>
                          {_dynSig ? <img src={_dynSig} alt="Signature" style={{ width: '120px', height: '40px', objectFit: 'contain', margin: '0 auto 3px' }} /> : <div style={{ width: '140px', borderBottom: '1.5px dotted #333', margin: '0 auto 3px' }} />}
                          <div className="font-bold uppercase" style={{ fontSize: '8px', letterSpacing: '1.5px', color: '#000' }}>{_dynSigName ? _dynSigName.toUpperCase() : 'Signature'}</div>
                          {_dynSigTitle && <div className="font-bold uppercase" style={{ fontSize: '7px', letterSpacing: '1px', color: '#B22222', marginTop: '1px' }}>{_dynSigTitle.toUpperCase()}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-slate-700 bg-slate-800 rounded-b-2xl">
                <button onClick={() => setViewingCert(null)} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors">
                  Close
                </button>
                <button onClick={() => handlePrintCertificate(viewingCert)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#B5A642] hover:bg-[#9a8d38] text-white text-sm font-medium transition-colors">
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