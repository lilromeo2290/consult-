'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import {
  Search, ArrowLeft, ChevronLeft, ChevronRight,
  Save, Stamp, Eye, User, MapPin, FileText, Building2,
  Flame, Leaf, ClipboardCheck, X, CalendarDays, MapPinned,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

// Building Permit as stored in rms-building-permits
interface BuildingPermit {
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
  blockNumber: string;
  siteLocation: string;
  streetName: string;
  gpsAddress: string;
  landSize: string;
  landOwnershipStatus: string;
  typeOfDevelopment: string;
  natureOfApplication: string;
  numberOfFloors: string;
  totalFloorArea: string;
  estimatedCost: string;
  architectName: string;
  architectRegNumber: string;
  architectTelephone: string;
  structuralEngName: string;
  structuralEngRegNumber: string;
  structuralEngTelephone: string;
  quantitySurveyorName: string;
  quantitySurveyorTelephone: string;
  docSitePlan: boolean;
  docLandTitle: boolean;
  docStructuralDrawings: boolean;
  docArchitecturalDrawings: boolean;
  docStructuralReport: boolean;
  docFireServiceReport: boolean;
  docEnvironmentalPermit: boolean;
  docPropertyRateClearance: boolean;
  docDevelopmentLevy: boolean;
  docPassportPhoto: boolean;
  permitStatus: string;
  remarks: string;
}

// Official review data stored per permit
interface BPReview {
  id: string;
  permitId: string;
  permitNumber: string;
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

// ─── Constants ───────────────────────────────────────────────────────────────

const PERMITS_STORAGE_KEY = 'rms-building-permits';
const REVIEWS_STORAGE_KEY = 'rms-bp-official';

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

const PERMIT_STATUS_COLORS: Record<string, string> = {
  'Pending Review': 'bg-yellow-100 text-yellow-800',
  'Under Review': 'bg-blue-100 text-blue-800',
  'Approved': 'bg-primary/10 text-primary',
  'Rejected': 'bg-red-100 text-red-800',
  'Issued': 'bg-green-100 text-green-800',
  'Expired': 'bg-gray-100 text-gray-800',
  'Revoked': 'bg-orange-100 text-orange-800',
};

const REVIEW_STATUS_COLORS: Record<string, string> = {
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

const EMPTY_REVIEW: BPReview = {
  id: '',
  permitId: '',
  permitNumber: '',
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
  // Read building permits from the register
  const [permits] = useSyncedStorage<BuildingPermit[]>(PERMITS_STORAGE_KEY, []);
  // Official review data (linked by permitId)
  const [reviews, setReviews] = useSyncedStorage<BPReview[]>(REVIEWS_STORAGE_KEY, []);

  const [view, setView] = useState<'list' | 'form'>('list');
  const [selectedPermit, setSelectedPermit] = useState<BuildingPermit | null>(null);
  const [form, setForm] = useState<BPReview>({ ...EMPTY_REVIEW });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [routingFilter, setRoutingFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // ── Build a lookup map: permitId → review ──────────────────────────────
  const reviewMap = useMemo(() => {
    const m = new Map<string, BPReview>();
    for (const r of reviews) m.set(r.permitId, r);
    return m;
  }, [reviews]);

  // ── Filtered & paginated permits ───────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...permits];
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
    if (statusFilter) list = list.filter((p) => p.permitStatus === statusFilter);
    if (routingFilter) {
      list = list.filter((p) => {
        const rev = reviewMap.get(p.id);
        return rev && rev.routingStatus === routingFilter;
      });
    }
    return list;
  }, [permits, searchTerm, statusFilter, routingFilter, reviewMap]);

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
    setForm({ ...EMPTY_REVIEW });
    setSelectedPermit(null);
  }, []);

  const openReview = useCallback(
    (permit: BuildingPermit) => {
      setSelectedPermit(permit);
      // Load existing review if any
      const existing = reviewMap.get(permit.id);
      if (existing) {
        setForm({ ...existing });
      } else {
        setForm({
          ...EMPTY_REVIEW,
          id: crypto.randomUUID(),
          permitId: permit.id,
          permitNumber: permit.permitNumber,
        });
      }
      setView('form');
    },
    [reviewMap],
  );

  const handleSave = useCallback(() => {
    if (!selectedPermit) return;
    const updated = { ...form, permitId: selectedPermit.id, permitNumber: selectedPermit.permitNumber };
    if (form.id && reviews.some((r) => r.id === form.id)) {
      setReviews((prev) => prev.map((r) => (r.id === form.id ? updated : r)));
      toast.success('Review updated successfully');
    } else {
      setReviews((prev) => [...prev, { ...updated, id: crypto.randomUUID() }]);
      toast.success('Review saved successfully');
    }
    resetForm();
    setView('list');
  }, [form, selectedPermit, reviews, setReviews, resetForm]);

  // ── Route to Physical Planning ────────────────────────────────────────
  const handleRouteToPhysicalPlanning = useCallback(() => {
    if (!selectedPermit) return;
    setForm((prev) => ({
      ...prev,
      routingStatus: 'Submitted to Physical Planning',
      physicalPlanningDate: new Date().toISOString().split('T')[0],
    }));
    toast.success('Application routed to Physical Planning Department');
  }, [selectedPermit]);

  // Get routing status for a permit
  const getRoutingStatus = useCallback(
    (permitId: string) => reviewMap.get(permitId)?.routingStatus || 'Pending Submission',
    [reviewMap],
  );

  // ─── FORM VIEW ────────────────────────────────────────────────────────

  if (view === 'form' && selectedPermit) {
    const p = selectedPermit;
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
                  {form.id && reviews.some((r) => r.id === form.id) ? 'Edit' : ''} Permit Application
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Building Permit (BP) Official — Review Application Processing
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${REVIEW_STATUS_COLORS[form.routingStatus] || 'bg-gray-100 text-gray-700'}`}>
                {form.routingStatus}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* ── SECTION 1: PERMIT INFORMATION (read-only from register) ── */}
            <FormSection number="1" title="Permit Information" icon={<FileText size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`${labelClass} block`}>Permit Number</label>
                  <input type="text" value={p.permitNumber} readOnly className={`${inputClass} bg-muted/50`} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Application Date</label>
                  <input type="text" value={p.applicationDate} readOnly className={`${inputClass} bg-muted/50`} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Type of Development</label>
                  <input type="text" value={p.typeOfDevelopment} readOnly className={`${inputClass} bg-muted/50`} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Nature of Application</label>
                  <input type="text" value={p.natureOfApplication} readOnly className={`${inputClass} bg-muted/50`} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Plot Number</label>
                  <input type="text" value={p.plotNumber || '—'} readOnly className={`${inputClass} bg-muted/50`} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Site Location</label>
                  <input type="text" value={p.siteLocation || '—'} readOnly className={`${inputClass} bg-muted/50`} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Estimated Cost</label>
                  <input type="text" value={p.estimatedCost ? `GHS ${p.estimatedCost}` : '—'} readOnly className={`${inputClass} bg-muted/50`} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Permit Status</label>
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium mt-2 ${PERMIT_STATUS_COLORS[p.permitStatus] || 'bg-gray-100 text-gray-800'}`}>
                    {p.permitStatus}
                  </span>
                </div>
              </div>
            </FormSection>

            {/* ── SECTION 2: APPLICANT INFORMATION (read-only from register) ── */}
            <FormSection number="2" title="Applicant Information" icon={<User size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={`${labelClass} block`}>Applicant Full Name</label>
                  <input type="text" value={p.applicantFullName} readOnly className={`${inputClass} bg-muted/50`} />
                </div>
                <div className="md:col-span-2">
                  <label className={`${labelClass} block`}>Residential Address</label>
                  <input type="text" value={p.residentialAddress || '—'} readOnly className={`${inputClass} bg-muted/50`} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Phone Number</label>
                  <input type="text" value={p.telephoneNumber || '—'} readOnly className={`${inputClass} bg-muted/50`} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Email Address</label>
                  <input type="text" value={p.emailAddress || '—'} readOnly className={`${inputClass} bg-muted/50`} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>National ID (Ghana Card)</label>
                  <input type="text" value={p.nationalIdNumber || '—'} readOnly className={`${inputClass} bg-muted/50`} />
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
                <Save size={16} /> {form.id && reviews.some((r) => r.id === form.id) ? 'Update Review' : 'Save Review'}
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
            {permits.length}
          </span>
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
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className={`${selectClass} w-full sm:w-44`}
        >
          <option value="">All Permit Statuses</option>
          {['Pending Review', 'Under Review', 'Approved', 'Rejected', 'Issued', 'Expired', 'Revoked'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
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
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Routing Status</th>
              <th className="px-4 py-3 text-left font-medium">Permit Status</th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Date</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Stamp size={32} className="text-muted-foreground/40" />
                    <span>No building permit applications found</span>
                    <span className="text-xs">Applications will appear here once they are submitted via the Building Permit module</span>
                  </div>
                </td>
              </tr>
            )}
            {paginated.map((p) => {
              const routing = getRoutingStatus(p.id);
              return (
                <tr
                  key={p.id}
                  className="border-b last:border-0 hover:bg-background transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium">{p.permitNumber || '—'}</td>
                  <td className="px-4 py-3 font-medium">{p.applicantFullName || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{p.plotNumber || '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{p.typeOfDevelopment || '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${REVIEW_STATUS_COLORS[routing] || 'bg-gray-100 text-gray-700'}`}>
                      {routing}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PERMIT_STATUS_COLORS[p.permitStatus] || 'bg-gray-100 text-gray-800'}`}>
                      {p.permitStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{p.applicationDate || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openReview(p)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      title="Review Application"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
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
