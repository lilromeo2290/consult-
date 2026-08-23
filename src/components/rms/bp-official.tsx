'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import {
  Search, Plus, ArrowLeft, Pencil, Trash2, ChevronLeft, ChevronRight,
  Save, Stamp, Download, Upload, User, MapPin, FileText, Building2,
  ShieldCheck, Flame, Leaf, ClipboardCheck, CalendarDays, Briefcase,
  Loader2, X, Eye,
} from 'lucide-react';
import { exportToExcel, importFromExcel, BP_OFFICIAL_FIELDS } from '@/lib/import-export';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BPOfficial {
  id: string;
  // Application Header
  applicationNumber: string;
  applicationDate: string;
  // Applicant Information (auto-filled from Business Register)
  applicantFullName: string;
  applicantAddress: string;
  applicantPhone: string;
  applicantEmail: string;
  applicantNationalId: string;
  applicantTin: string;
  businessName: string;
  businessRegNumber: string;
  businessLocation: string;
  // Business details (from Business Register, for table display)
  businessUniqueNumber: string;
  businessClassDesc: string;
  businessCategory: string;
  businessAmount: number;
  // Physical Planning Department
  routingStatus: string;
  physicalPlanningComments: string;
  physicalPlanningDate: string;
  // EPA Recommendation
  epaRecommendation: string;
  epaComments: string;
  epaRecommendationDate: string;
  // Ghana National Fire Service (GNFS) Recommendation
  gnfsRecommendation: string;
  gnfsComments: string;
  gnfsRecommendationDate: string;
  // General Comments
  generalComments: string;
  // Status
  status: string;
}

// Simplified Business type for auto-fill lookup
interface BusinessLookup {
  regNumber: string;
  name: string;
  owner: string;
  ghanaCard: string;
  phone: string;
  email: string;
  ownerTin: string;
 locality: string;
  streetName: string;
  houseNo: string;
  areaCode: string;
  businessUniqueNumber: string;
  businessClassDesc: string;
  category: string;
  amount: number;
}

// Building Permit from the register (for list display)
interface BuildingPermitItem {
  id: string;
  permitNumber: string;
  applicationDate: string;
  applicantFullName: string;
  postalAddress: string;
  residentialAddress: string;
  telephoneNumber: string;
  emailAddress: string;
  nationalIdNumber: string;
  plotNumber: string;
  siteLocation: string;
  typeOfDevelopment: string;
  natureOfApplication: string;
  estimatedCost: string;
  permitStatus: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'rms-bp-official';
const BIZ_STORAGE_KEY = 'rms-businesses';
const BP_STORAGE_KEY = 'rms-building-permits';

const ROUTING_STATUSES = [
  'Pending Submission',
  'Submitted to Physical Planning',
  'Under Review - Physical Planning',
  'Under Review - EPA',
  'Under Review - GNFS',
  'All Reviews Complete',
  'Approved',
  'Rejected',
  'Deferred',
];

const EPA_RECOMMENDATIONS = [
  'Approved - No Environmental Concerns',
  'Approved with Conditions',
  'Environmental Impact Assessment Required',
  'Modifications Required',
  'Not Approved',
  'Pending Further Assessment',
];

const GNFS_RECOMMENDATIONS = [
  'Approved - Fire Safety Compliant',
  'Approved with Conditions',
  'Fire Safety Equipment Required',
  'Modifications Required',
  'Not Approved',
  'Pending Fire Inspection',
];

const APPROVAL_STATUSES = [
  'In Progress',
  'Approved',
  'Approved with Conditions',
  'Rejected',
  'Deferred',
  'Requires Resubmission',
];

const STATUS_COLORS: Record<string, string> = {
  'In Progress': 'bg-blue-100 text-blue-800',
  'Approved': 'bg-primary/10 text-primary',
  'Approved with Conditions': 'bg-amber-100 text-amber-800',
  'Rejected': 'bg-red-100 text-red-800',
  'Deferred': 'bg-orange-100 text-orange-800',
  'Requires Resubmission': 'bg-yellow-100 text-yellow-800',
  'Pending Submission': 'bg-gray-100 text-gray-700',
  'Submitted to Physical Planning': 'bg-indigo-100 text-indigo-800',
  'Under Review - Physical Planning': 'bg-blue-100 text-blue-800',
  'Under Review - EPA': 'bg-green-100 text-green-800',
  'Under Review - GNFS': 'bg-orange-100 text-orange-800',
  'All Reviews Complete': 'bg-teal-100 text-teal-800',
};

const EMPTY_FORM: BPOfficial = {
  id: '',
  applicationNumber: '',
  applicationDate: new Date().toISOString().split('T')[0],
  applicantFullName: '',
  applicantAddress: '',
  applicantPhone: '',
  applicantEmail: '',
  applicantNationalId: '',
  applicantTin: '',
  businessName: '',
  businessRegNumber: '',
  businessLocation: '',
  businessUniqueNumber: '',
  businessClassDesc: '',
  businessCategory: '',
  businessAmount: 0,
  routingStatus: 'Pending Submission',
  physicalPlanningComments: '',
  physicalPlanningDate: '',
  epaRecommendation: '',
  epaComments: '',
  epaRecommendationDate: '',
  gnfsRecommendation: '',
  gnfsComments: '',
  gnfsRecommendationDate: '',
  generalComments: '',
  status: 'In Progress',
};

const labelClass = 'text-sm font-medium text-foreground';
const inputClass = 'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const selectClass = 'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const textareaClass = 'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none';

// ─── Component ───────────────────────────────────────────────────────────────

export function BPOfficialPage() {
  const [records, setRecords] = useSyncedStorage<BPOfficial[]>(STORAGE_KEY, []);
  const [businesses] = useSyncedStorage<BusinessLookup[]>(BIZ_STORAGE_KEY, []);
  const [buildingPermits, setBuildingPermits] = useSyncedStorage<BuildingPermitItem[]>(BP_STORAGE_KEY, []);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BPOfficial>({ ...EMPTY_FORM });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [routingFilter, setRoutingFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageSize = 10;

  // Business search for auto-fill
  const [bizSearch, setBizSearch] = useState('');
  const [bizDropdownOpen, setBizDropdownOpen] = useState(false);
  const [bizLoading, setBizLoading] = useState(false);
  const bizSearchRef = useRef<HTMLDivElement>(null);

  // ── Auto-generate Application Number ──────────────────────────────────
  const generateApplicationNumber = useCallback(() => {
    const yearSuffix = String(new Date().getFullYear()).slice(-2);
    const nextNum = records.length + 1;
    return `BP-${yearSuffix}-${String(nextNum).padStart(4, '0')}`;
  }, [records.length]);

  // ── Open review from building permit register ────────────────────────
  const openReviewFromPermit = useCallback(
    (p: BuildingPermitItem) => {
      // Check if there's an existing review for this permit
      const existing = records.find((r) => r.applicationNumber === p.permitNumber);
      if (existing) {
        setForm({ ...existing });
        setEditingId(existing.id);
      } else {
        setForm({
          ...EMPTY_FORM,
          applicationNumber: p.permitNumber,
          applicationDate: p.applicationDate,
          applicantFullName: p.applicantFullName,
          applicantAddress: p.residentialAddress || p.postalAddress,
          applicantPhone: p.telephoneNumber,
          applicantEmail: p.emailAddress,
          applicantNationalId: p.nationalIdNumber,
        });
        setEditingId(null);
      }
      setView('form');
    },
    [records],
  );

  // ── Auto-fill applicant from Building Permit Register ──────────────
  const handleAutoFill = useCallback((permit: BuildingPermitItem) => {
    setForm((prev) => ({
      ...prev,
      applicationNumber: permit.permitNumber,
      applicationDate: permit.applicationDate,
      applicantFullName: permit.applicantFullName || '',
      applicantAddress: permit.residentialAddress || permit.postalAddress || '',
      applicantPhone: permit.telephoneNumber || '',
      applicantEmail: permit.emailAddress || '',
      applicantNationalId: permit.nationalIdNumber || '',
    }));
    setBizSearch('');
    setBizDropdownOpen(false);
    toast.success('Applicant information auto-filled from building permit register');
  }, []);

  // ── Building permit search results (used by Applicant Search) ──────
  const bizSearchResults = useMemo(() => {
    if (!bizSearch.trim()) return [];
    const q = bizSearch.toLowerCase();
    return buildingPermits
      .filter(
        (p) =>
          p.applicantFullName?.toLowerCase().includes(q) ||
          p.permitNumber?.toLowerCase().includes(q) ||
          p.telephoneNumber?.includes(q) ||
          p.nationalIdNumber?.toLowerCase().includes(q) ||
          p.applicationDate?.includes(q) ||
          p.siteLocation?.toLowerCase().includes(q) ||
          p.plotNumber?.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [bizSearch, buildingPermits]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bizSearchRef.current && !bizSearchRef.current.contains(e.target as Node)) {
        setBizDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Filtered & paginated (building permits from register) ──────────
  const filtered = useMemo(() => {
    let list = [...buildingPermits];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.applicantFullName?.toLowerCase().includes(q) ||
          p.permitNumber?.toLowerCase().includes(q) ||
          p.telephoneNumber?.includes(q) ||
          p.nationalIdNumber?.toLowerCase().includes(q) ||
          p.applicationDate?.includes(q) ||
          p.siteLocation?.toLowerCase().includes(q) ||
          p.typeOfDevelopment?.toLowerCase().includes(q),
      );
    }
    if (statusFilter) list = list.filter((p) => {
      const review = records.find((r) => r.applicationNumber === p.permitNumber);
      const displayStatus = review ? review.routingStatus : p.permitStatus;
      return displayStatus === statusFilter;
    });
    if (routingFilter) {
      const reviewIds = new Set(records.filter((r) => r.routingStatus === routingFilter).map((r) => r.applicationNumber));
      list = list.filter((p) => reviewIds.has(p.permitNumber));
    }
    return list;
  }, [buildingPermits, searchTerm, statusFilter, routingFilter, records]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage],
  );

  // ── Form handlers ─────────────────────────────────────────────────────
  const handleFormChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    [],
  );

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_FORM, applicationDate: new Date().toISOString().split('T')[0] });
    setEditingId(null);
    setBizSearch('');
  }, []);

  const openNew = useCallback(() => {
    resetForm();
    setForm((prev) => ({ ...prev, applicationNumber: generateApplicationNumber() }));
    setView('form');
  }, [resetForm, generateApplicationNumber]);

  const openEdit = useCallback(
    (r: BPOfficial) => {
      setForm({ ...r });
      setEditingId(r.id);
      setView('form');
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (!form.applicationNumber.trim()) {
      toast.error('Application Number is required');
      return;
    }
    if (!form.applicantFullName.trim()) {
      toast.error('Applicant Name is required. Search and select a business to auto-fill.');
      return;
    }
    if (editingId) {
      setRecords((prev) => prev.map((r) => (r.id === editingId ? { ...form } : r)));
      toast.success('Business Permit application updated successfully');
    } else {
      setRecords((prev) => [...prev, { ...form, id: crypto.randomUUID() }]);
      toast.success('Business Permit application saved');
    }
    // Sync routing status back to the building permit register
    const routingToPermitStatus: Record<string, string> = {
      'Approved': 'Approved',
      'Rejected': 'Rejected',
      'Deferred': 'Deferred',
      'Submitted to Physical Planning': 'Under Review',
      'Under Review - Physical Planning': 'Under Review',
      'Under Review - EPA': 'Under Review',
      'Under Review - GNFS': 'Under Review',
      'All Reviews Complete': 'Under Review',
    };
    const newPermitStatus = routingToPermitStatus[form.routingStatus];
    if (newPermitStatus && form.applicationNumber) {
      setBuildingPermits((prev) =>
        prev.map((p) =>
          p.permitNumber === form.applicationNumber
            ? { ...p, permitStatus: newPermitStatus }
            : p
        )
      );
    }
    resetForm();
    setView('list');
  }, [form, editingId, setRecords, setBuildingPermits, resetForm]);

  const handleDelete = useCallback(
    (id: string) => {
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirm(null);
      toast.success('Application deleted');
    },
    [setRecords],
  );

  // ── Import / Export ───────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (records.length === 0) {
      toast.error('No applications to export');
      return;
    }
    exportToExcel(
      records as unknown as Record<string, unknown>[],
      BP_OFFICIAL_FIELDS,
      'BP_Official_Applications',
    );
    toast.success('Exported successfully');
  }, [records]);

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const imported = await importFromExcel<BPOfficial>(file, BP_OFFICIAL_FIELDS);
        if (imported.length === 0) {
          toast.error('No data found in the file');
          return;
        }
        const existing = new Map(records.map((r) => [r.applicationNumber, r]));
        for (const item of imported) {
          const key =
            item.applicationNumber || `BP-IMP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          item.applicationNumber = key;
          item.id = crypto.randomUUID();
          existing.set(key, item);
        }
        setRecords(Array.from(existing.values()));
        toast.success(`${imported.length} application(s) imported successfully`);
      } catch {
        toast.error('Failed to import file. Ensure it is a valid Excel file exported from this system.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [records, setRecords],
  );

  // ── Route to Physical Planning ────────────────────────────────────────
  const handleRouteToPhysicalPlanning = useCallback(() => {
    if (!form.applicantFullName.trim()) {
      toast.error('Please fill in applicant information before routing');
      return;
    }
    setForm((prev) => ({
      ...prev,
      routingStatus: 'Submitted to Physical Planning',
      physicalPlanningDate: new Date().toISOString().split('T')[0],
    }));
    toast.success('Application routed to Physical Planning Department');
  }, [form.applicantFullName]);

  // ─── FORM VIEW ────────────────────────────────────────────────────────

  if (view === 'form') {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Back button */}
        <button
          onClick={() => { resetForm(); setView('list'); }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} /> Back to list
        </button>

        <div className="rounded-xl border-border bg-card shadow-sm">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Stamp className="text-primary" size={22} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {editingId ? 'Edit' : ''} Permit Application
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Building Permit (BP) Official — Review Application Processing
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[form.routingStatus] || 'bg-gray-100 text-gray-700'}`}>
                {form.routingStatus}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* ── SECTION 1: APPLICATION HEADER ──────────────────────── */}
            <FormSection number="1" title="Application Information" icon={<FileText size={16} />}>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className={`${labelClass} block`}>
                    Applicant Search <span className="text-red-500">*</span>
                  </label>
                  <div ref={bizSearchRef} className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={bizSearch}
                      onChange={(e) => { setBizSearch(e.target.value); setBizDropdownOpen(true); }}
                      onFocus={() => setBizDropdownOpen(true)}
                      placeholder="Search by Name, Permit #, Phone, Ghana Card..."
                      className={`${inputClass} pl-9 pr-8`}
                    />
                    {bizSearch && (
                      <button
                        type="button"
                        onClick={() => { setBizSearch(''); setBizDropdownOpen(false); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <X size={14} />
                      </button>
                    )}
                    {bizDropdownOpen && bizSearchResults.length > 0 && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-y-auto">
                        {bizSearchResults.map((permit, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAutoFill(permit)}
                            className="w-full px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors border-b last:border-0"
                          >
                            <div className="font-medium">{permit.applicantFullName || 'Unnamed Applicant'}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Permit #: {permit.permitNumber || 'N/A'} &middot; Phone: {permit.telephoneNumber || 'N/A'} &middot; {permit.typeOfDevelopment || ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Search building permit register to auto-fill applicant details</p>
                </div>
              </div>
              {/* Hidden application number */}
              <input type="hidden" name="applicationNumber" value={form.applicationNumber} />
            </FormSection>

            {/* ── SECTION 2: APPLICANT INFORMATION ── */}
            <FormSection number="2" title="Applicant Information" icon={<User size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={`${labelClass} block`}>
                    Applicant Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="applicantFullName"
                    value={form.applicantFullName}
                    onChange={handleFormChange}
                    placeholder="Applicant full name"
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={`${labelClass} block`}>Applicant Address</label>
                  <input
                    type="text"
                    name="applicantAddress"
                    value={form.applicantAddress}
                    onChange={handleFormChange}
                    placeholder="Applicant address"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Phone Number</label>
                  <input
                    type="text"
                    name="applicantPhone"
                    value={form.applicantPhone}
                    onChange={handleFormChange}
                    placeholder="e.g. 024 XXX XXXX"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Email Address</label>
                  <input
                    type="text"
                    name="applicantEmail"
                    value={form.applicantEmail}
                    onChange={handleFormChange}
                    placeholder="email@example.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={`${labelClass} block`}>National ID (Ghana Card)</label>
                  <input
                    type="text"
                    name="applicantNationalId"
                    value={form.applicantNationalId}
                    onChange={handleFormChange}
                    placeholder="GHA-XXXXXXXXX"
                    className={inputClass}
                  />
                </div>
              </div>
            </FormSection>

            {/* ── SECTION 3: ROUTING TO PHYSICAL PLANNING DEPARTMENT ── */}
            <FormSection number="3" title="Physical Planning Department" icon={<Building2 size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`${labelClass} block`}>Routing Status</label>
                  <select
                    name="routingStatus"
                    value={form.routingStatus}
                    onChange={handleFormChange}
                    className={selectClass}
                  >
                    {ROUTING_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`${labelClass} block`}>Recommendation Date</label>
                  <input
                    type="date"
                    name="physicalPlanningDate"
                    value={form.physicalPlanningDate}
                    onChange={handleFormChange}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className={`${labelClass} block`}>Comments / Recommendation</label>
                <textarea
                  name="physicalPlanningComments"
                  value={form.physicalPlanningComments}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Enter Physical Planning Department comments and recommendations..."
                  className={textareaClass}
                />
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleRouteToPhysicalPlanning}
                  className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  <MapPin size={15} /> Route to Physical Planning
                </button>
              </div>
            </FormSection>

            {/* ── SECTION 4: EPA RECOMMENDATION ────────────────────────── */}
            <FormSection number="4" title="Environmental Protection Agency (EPA) Recommendation" icon={<Leaf size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`${labelClass} block`}>EPA Recommendation</label>
                  <select
                    name="epaRecommendation"
                    value={form.epaRecommendation}
                    onChange={handleFormChange}
                    className={selectClass}
                  >
                    <option value="">Select EPA recommendation</option>
                    {EPA_RECOMMENDATIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`${labelClass} block`}>Recommendation Date</label>
                  <input
                    type="date"
                    name="epaRecommendationDate"
                    value={form.epaRecommendationDate}
                    onChange={handleFormChange}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className={`${labelClass} block`}>EPA Comments</label>
                <textarea
                  name="epaComments"
                  value={form.epaComments}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Enter EPA comments, conditions, or environmental assessment notes..."
                  className={textareaClass}
                />
              </div>
            </FormSection>

            {/* ── SECTION 5: GHANA NATIONAL FIRE SERVICE (GNFS) RECOMMENDATION ── */}
            <FormSection number="5" title="Ghana National Fire Service (GNFS) Recommendation" icon={<Flame size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`${labelClass} block`}>GNFS Recommendation</label>
                  <select
                    name="gnfsRecommendation"
                    value={form.gnfsRecommendation}
                    onChange={handleFormChange}
                    className={selectClass}
                  >
                    <option value="">Select GNFS recommendation</option>
                    {GNFS_RECOMMENDATIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`${labelClass} block`}>Recommendation Date</label>
                  <input
                    type="date"
                    name="gnfsRecommendationDate"
                    value={form.gnfsRecommendationDate}
                    onChange={handleFormChange}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className={`${labelClass} block`}>GNFS Comments</label>
                <textarea
                  name="gnfsComments"
                  value={form.gnfsComments}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Enter GNFS comments, fire safety requirements, or inspection notes..."
                  className={textareaClass}
                />
              </div>
            </FormSection>

            {/* ── SECTION 6: GENERAL COMMENTS & STATUS ────────────────── */}
            <FormSection number="6" title="General Comments & Decision" icon={<ClipboardCheck size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`${labelClass} block`}>Application Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    className={selectClass}
                  >
                    {APPROVAL_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className={`${labelClass} block`}>General Comments</label>
                <textarea
                  name="generalComments"
                  value={form.generalComments}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Enter any additional comments or notes..."
                  className={textareaClass}
                />
              </div>
            </FormSection>

            {/* ── ACTIONS ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => { resetForm(); setView('list'); }}
                className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Save size={16} /> {editingId ? 'Update Application' : 'Save Application'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Stamp className="text-primary" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Building Permit Applications</h2>
            <p className="text-xs text-muted-foreground">BP Official — Review Application Processing</p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {buildingPermits.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            <Upload size={14} /> Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Eye size={14} /> Review Application
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Search by Name, Permit #, Phone, Date, Location..."
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          value={routingFilter}
          onChange={(e) => { setRoutingFilter(e.target.value); setCurrentPage(1); }}
          className={`${selectClass} w-full sm:w-52`}
        >
          <option value="">All Routing Statuses</option>
          {ROUTING_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className={`${selectClass} w-full sm:w-44`}
        >
          <option value="">All Permit Statuses</option>
          {['Pending Review', 'Under Review', 'Approved', 'Rejected', 'Issued', 'Expired', 'Revoked'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Permit #</th>
              <th className="px-4 py-3 text-left font-medium">Applicant</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Plot #</th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Development Type</th>
              <th className="px-4 py-3 text-right font-medium">Est. Cost</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Stamp size={32} className="text-muted-foreground/40" />
                    <span>No building permit applications found</span>
                    <span className="text-xs">Applications will appear here once submitted via the Building Permit module</span>
                  </div>
                </td>
              </tr>
            )}
            {paginated.map((p) => (
              <tr
                key={p.id}
                className="border-b last:border-0 hover:bg-background transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs font-medium">{p.permitNumber || '—'}</td>
                <td className="px-4 py-3 font-medium">{p.applicantFullName || '—'}</td>
                <td className="px-4 py-3 hidden md:table-cell">{p.plotNumber || '—'}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{p.typeOfDevelopment || '—'}</td>
                <td className="px-4 py-3 text-right font-semibold">{p.estimatedCost ? `GHS ${p.estimatedCost}` : '—'}</td>
                <td className="px-4 py-3">
                  <StatusCell permitNumber={p.permitNumber} permitStatus={p.permitStatus} records={records} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openReviewFromPermit(p)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    title="Review Application"
                  >
                    <Eye size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of{' '}
            {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="rounded-md border border-input p-1.5 hover:bg-accent disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                onClick={() => setCurrentPage(pg)}
                className={`rounded-md px-2.5 py-1 text-sm ${pg === currentPage ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
              >
                {pg}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="rounded-md border border-input p-1.5 hover:bg-accent disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusCell({ permitNumber, permitStatus, records }: { permitNumber: string; permitStatus: string; records: BpOfficialRecord[] }) {
  const review = records.find((r) => r.applicationNumber === permitNumber);
  const displayStatus = review ? review.routingStatus : permitStatus;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[displayStatus] || 'bg-gray-100 text-gray-800'}`}>
      {displayStatus || '—'}
    </span>
  );
}

function FormSection({
  number,
  title,
  icon,
  children,
}: {
  number: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-primary flex items-center gap-2 border-b border-border pb-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {number}
        </span>
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}
