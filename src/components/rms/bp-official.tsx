'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import {
  Search, Plus, ArrowLeft, Pencil, Trash2, ChevronLeft, ChevronRight,
  Save, Stamp, Download, Upload, User, MapPin, FileText, Building2,
  ShieldCheck, Flame, Leaf, ClipboardCheck, CalendarDays, Briefcase,
  Loader2, X,
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

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'rms-bp-official';
const BIZ_STORAGE_KEY = 'rms-businesses';

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

  // ── Auto-fill applicant from Business Register ────────────────────────
  const handleAutoFill = useCallback((biz: BusinessLookup) => {
    setForm((prev) => ({
      ...prev,
      applicantFullName: biz.owner || '',
      applicantAddress: `${biz.streetName || ''}, ${biz.houseNo || ''}, ${biz.locality || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, ''),
      applicantPhone: biz.phone || '',
      applicantEmail: biz.email || '',
      applicantNationalId: biz.ghanaCard || '',
      applicantTin: biz.ownerTin || '',
      businessName: biz.name || '',
      businessRegNumber: biz.regNumber || '',
      businessLocation: `${biz.locality || ''} - ${biz.areaCode || ''}`.trim(),
      businessUniqueNumber: biz.businessUniqueNumber || '',
      businessClassDesc: biz.businessClassDesc || '',
      businessCategory: biz.category || '',
      businessAmount: biz.amount || 0,
    }));
    setBizSearch('');
    setBizDropdownOpen(false);
    toast.success('Applicant information auto-filled from Business Register');
  }, []);

  // ── Business search results ───────────────────────────────────────────
  const bizSearchResults = useMemo(() => {
    if (!bizSearch.trim()) return [];
    const q = bizSearch.toLowerCase();
    return businesses
      .filter(
        (b) =>
          b.name?.toLowerCase().includes(q) ||
          b.owner?.toLowerCase().includes(q) ||
          b.regNumber?.toLowerCase().includes(q) ||
          b.businessUniqueNumber?.toLowerCase().includes(q) ||
          b.phone?.includes(q),
      )
      .slice(0, 8);
  }, [bizSearch, businesses]);

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

  // ── Filtered & paginated ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...records];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.applicationNumber.toLowerCase().includes(q) ||
          r.applicantFullName.toLowerCase().includes(q) ||
          r.businessName.toLowerCase().includes(q) ||
          r.businessRegNumber.toLowerCase().includes(q),
      );
    }
    if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    if (routingFilter) list = list.filter((r) => r.routingStatus === routingFilter);
    return list;
  }, [records, searchTerm, statusFilter, routingFilter]);

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
    resetForm();
    setView('list');
  }, [form, editingId, setRecords, resetForm]);

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
                  {editingId ? 'Edit' : 'New'} Business Permit Application
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Business Permit (BP) Official — New Application Processing
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`${labelClass} block`}>
                    Application Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="applicationNumber"
                    value={form.applicationNumber}
                    onChange={handleFormChange}
                    placeholder="BP-26-0001"
                    className={inputClass}
                    readOnly={!!editingId}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Auto-generated on creation</p>
                </div>
                <div>
                  <label className={`${labelClass} block`}>Application Date</label>
                  <input
                    type="date"
                    name="applicationDate"
                    value={form.applicationDate}
                    onChange={handleFormChange}
                    className={inputClass}
                  />
                </div>
              </div>
            </FormSection>

            {/* ── SECTION 2: APPLICANT INFORMATION (Auto-fill from Business Register) ── */}
            <FormSection number="2" title="Applicant Information" icon={<User size={16} />}>
              {/* Auto-fill search bar */}
              <div className="mb-4 p-3 rounded-lg bg-muted/40 border border-dashed border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Briefcase size={13} /> Auto-fill from Business Register — search by business name, owner, or registration number
                </p>
                <div ref={bizSearchRef} className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={bizSearch}
                    onChange={(e) => { setBizSearch(e.target.value); setBizDropdownOpen(true); }}
                    onFocus={() => setBizDropdownOpen(true)}
                    placeholder="Type business name, owner name, or registration number..."
                    className={`${inputClass} pl-9 pr-8`}
                  />
                  {bizSearch && (
                    <button
                      onClick={() => { setBizSearch(''); setBizDropdownOpen(false); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  )}
                  {bizDropdownOpen && bizSearchResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-y-auto">
                      {bizSearchResults.map((biz, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAutoFill(biz)}
                          className="w-full px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors border-b last:border-0"
                        >
                          <div className="font-medium">{biz.name || 'Unnamed Business'}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Owner: {biz.owner || 'N/A'} &middot; Reg #: {biz.regNumber || 'N/A'} &middot; {biz.phone || 'No phone'}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Applicant fields */}
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
                    placeholder="Enter or auto-fill applicant name"
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
                    placeholder="Enter or auto-fill applicant address"
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
                <div>
                  <label className={`${labelClass} block`}>TIN</label>
                  <input
                    type="text"
                    name="applicantTin"
                    value={form.applicantTin}
                    onChange={handleFormChange}
                    placeholder="Tax Identification Number"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Business reference fields */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`${labelClass} block`}>Business Name</label>
                  <input
                    type="text"
                    name="businessName"
                    value={form.businessName}
                    onChange={handleFormChange}
                    placeholder="Auto-filled from Business Register"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Business Registration Number</label>
                  <input
                    type="text"
                    name="businessRegNumber"
                    value={form.businessRegNumber}
                    onChange={handleFormChange}
                    placeholder="Auto-filled from Business Register"
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={`${labelClass} block`}>Business Location</label>
                  <input
                    type="text"
                    name="businessLocation"
                    value={form.businessLocation}
                    onChange={handleFormChange}
                    placeholder="Auto-filled from Business Register"
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
            <h2 className="text-lg font-semibold">Business Permit Applications</h2>
            <p className="text-xs text-muted-foreground">BP Official — New Application Processing</p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {records.length}
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
            <Plus size={14} /> New Application
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
            placeholder="Search by application #, applicant, business name, reg #..."
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
          <option value="">All Statuses</option>
          {APPROVAL_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Business Unique #</th>
              <th className="px-4 py-3 text-left font-medium">Business Name</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Owner's Name</th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Business Class</th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Category</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Stamp size={32} className="text-muted-foreground/40" />
                    <span>No business permit applications found</span>
                    <span className="text-xs">Click &quot;New Application&quot; to create one</span>
                  </div>
                </td>
              </tr>
            )}
            {paginated.map((r) => (
              <tr
                key={r.id}
                className="border-b last:border-0 hover:bg-background transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs font-medium">{r.businessUniqueNumber || '—'}</td>
                <td className="px-4 py-3 font-medium">{r.businessName || '—'}</td>
                <td className="px-4 py-3 hidden md:table-cell">{r.applicantFullName || '—'}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{r.businessClassDesc || '—'}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{r.businessCategory || '—'}</td>
                <td className="px-4 py-3 text-right font-semibold">GHS {(r.businessAmount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-800'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(r)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    {deleteConfirm === r.id ? (
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(r.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
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
