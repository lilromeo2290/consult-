code = r"""'use client';

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import {
  Search, Plus, ArrowLeft, Pencil, Trash2, ChevronLeft, ChevronRight,
  Save, Stamp, Download, Upload, Building2, ClipboardCheck, FileCheck,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BPOfficial {
  id: string;
  applicationNumber: string;
  dateReceived: string;
  applicantFullName: string;
  plotNumber: string;
  // 1. Development Planning Department
  siteInspectionDate: string;
  devPlanningOfficerName: string;
  devPlanningRecommendation: string;
  // 2. Physical Planning Department
  conformsToPlanningScheme: string;
  physicalPlanningComments: string;
  // 3. Works Department
  structuralAssessment: string;
  worksRecommendation: string;
  // 4. Environmental Health Unit
  environmentalComments: string;
  // 5. Approval Section
  buildingPermitNumber: string;
  approvedBy: string;
  approvalDate: string;
  status: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'rms-bp-official';

const DEV_RECOMMENDATIONS = ['Approved', 'Approved with Conditions', 'Modifications Required', 'Rejected', 'Referred to Committee'];
const WORKS_RECOMMENDATIONS = ['Structurally Sound', 'Structurally Sound with Conditions', 'Modifications Required', 'Not Approved', 'Further Assessment Needed'];
const APPROVAL_STATUSES = ['In Progress', 'Approved', 'Rejected', 'Deferred', 'Requires Resubmission'];

const STATUS_COLORS: Record<string, string> = {
  'In Progress': 'bg-blue-100 text-blue-800',
  'Approved': 'bg-emerald-100 text-emerald-800',
  'Rejected': 'bg-red-100 text-red-800',
  'Deferred': 'bg-orange-100 text-orange-800',
  'Requires Resubmission': 'bg-yellow-100 text-yellow-800',
};

const EMPTY_FORM: BPOfficial = {
  id: '',
  applicationNumber: '',
  dateReceived: new Date().toISOString().split('T')[0],
  applicantFullName: '',
  plotNumber: '',
  siteInspectionDate: '',
  devPlanningOfficerName: '',
  devPlanningRecommendation: '',
  conformsToPlanningScheme: '',
  physicalPlanningComments: '',
  structuralAssessment: '',
  worksRecommendation: '',
  environmentalComments: '',
  buildingPermitNumber: '',
  approvedBy: '',
  approvalDate: '',
  status: 'In Progress',
};

const labelClass = 'text-sm font-medium text-foreground';
const inputClass = 'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const selectClass = 'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

// ─── Component ───────────────────────────────────────────────────────────────

export function BPOfficialPage() {
  const [records, setRecords] = useSyncedStorage<BPOfficial[]>(STORAGE_KEY, []);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BPOfficial>(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const pageSize = 10;

  const filtered = useMemo(() => {
    let list = [...records];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((r) =>
        r.applicationNumber.toLowerCase().includes(q) ||
        r.applicantFullName.toLowerCase().includes(q) ||
        r.buildingPermitNumber.toLowerCase().includes(q) ||
        r.plotNumber.toLowerCase().includes(q) ||
        r.devPlanningOfficerName.toLowerCase().includes(q)
      );
    }
    if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    return list;
  }, [records, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage]);

  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_FORM, dateReceived: new Date().toISOString().split('T')[0] });
    setEditingId(null);
  }, []);

  const openNew = useCallback(() => { resetForm(); setView('form'); }, [resetForm]);
  const openEdit = useCallback((r: BPOfficial) => { setForm({ ...r }); setEditingId(r.id); setView('form'); }, []);

  const handleSave = useCallback(() => {
    if (!form.applicationNumber.trim()) { toast.error('Application Number is required'); return; }
    if (!form.devPlanningOfficerName.trim()) { toast.error('Development Planning Officer Name is required'); return; }
    if (editingId) {
      setRecords((prev) => prev.map((r) => (r.id === editingId ? { ...form } : r)));
      toast.success('Review updated successfully');
    } else {
      setRecords((prev) => [...prev, { ...form, id: crypto.randomUUID() }]);
      toast.success('Official review recorded');
    }
    resetForm(); setView('list');
  }, [form, editingId, setRecords, resetForm]);

  const handleDelete = useCallback((id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setDeleteConfirm(null); toast.success('Record deleted');
  }, [setRecords]);

  const handleExport = useCallback(() => {
    if (records.length === 0) { toast.error('No data to export'); return; }
    const headers = Object.keys(EMPTY_FORM).filter((k) => k !== 'id');
    const rows = records.map((r) => headers.map((h) => `"${String(r[h as keyof BPOfficial]).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'bp_official_reviews.csv'; a.click(); URL.revokeObjectURL(url);
    toast.success('Exported successfully');
  }, [records]);

  // ─── Form View ────────────────────────────────────────────────────────

  if (view === 'form') {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <button onClick={() => { resetForm(); setView('list'); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back to list
        </button>
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <Stamp className="text-primary" size={24} />
              <div>
                <h2 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} BP Official Review</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Kpando Municipal Assembly</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select name="status" value={form.status} onChange={handleFormChange} className={selectClass}>
                {APPROVAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="p-6 space-y-8">
            {/* Application Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`${labelClass} block`}>Application Number <span className="text-red-500">*</span></label>
                <input type="text" name="applicationNumber" value={form.applicationNumber} onChange={handleFormChange} placeholder="BP2026-0001" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Date Received</label>
                <input type="date" name="dateReceived" value={form.dateReceived} onChange={handleFormChange} className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Applicant Name</label>
                <input type="text" name="applicantFullName" value={form.applicantFullName} onChange={handleFormChange} placeholder="Enter applicant name" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Plot Number</label>
                <input type="text" name="plotNumber" value={form.plotNumber} onChange={handleFormChange} placeholder="Enter plot number" className={inputClass} />
              </div>
            </div>

            {/* 1. Development Planning Department */}
            <FormSection number="1" title="Development Planning Department" icon={<Building2 size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`${labelClass} block`}>Site Inspection Date</label>
                  <input type="date" name="siteInspectionDate" value={form.siteInspectionDate} onChange={handleFormChange} className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Officer Name <span className="text-red-500">*</span></label>
                  <input type="text" name="devPlanningOfficerName" value={form.devPlanningOfficerName} onChange={handleFormChange} placeholder="Enter officer name" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Recommendation</label>
                  <select name="devPlanningRecommendation" value={form.devPlanningRecommendation} onChange={handleFormChange} className={selectClass}>
                    <option value="">Select recommendation</option>
                    {DEV_RECOMMENDATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </FormSection>

            {/* 2. Physical Planning Department */}
            <FormSection number="2" title="Physical Planning Department" icon={<ClipboardCheck size={16} />}>
              <div>
                <label className={`${labelClass} block mb-3`}>Conforms to Planning Scheme</label>
                <div className="flex items-center gap-4">
                  {['Yes', 'No'].map((opt) => (
                    <label key={opt} className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm cursor-pointer transition-colors ${form.conformsToPlanningScheme === opt ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-input hover:bg-accent'}`}>
                      <input type="radio" name="conformsToPlanningScheme" value={opt} checked={form.conformsToPlanningScheme === opt} onChange={handleFormChange} className="accent-primary" />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <label className={`${labelClass} block`}>Comments</label>
                <textarea name="physicalPlanningComments" value={form.physicalPlanningComments} onChange={handleFormChange} rows={3} placeholder="Enter comments..." className={inputClass} />
              </div>
            </FormSection>

            {/* 3. Works Department */}
            <FormSection number="3" title="Works Department" icon={<FileCheck size={16} />}>
              <div>
                <label className={`${labelClass} block`}>Structural Assessment</label>
                <textarea name="structuralAssessment" value={form.structuralAssessment} onChange={handleFormChange} rows={3} placeholder="Enter structural assessment details..." className={inputClass} />
              </div>
              <div className="mt-4">
                <label className={`${labelClass} block`}>Recommendation</label>
                <select name="worksRecommendation" value={form.worksRecommendation} onChange={handleFormChange} className={selectClass}>
                  <option value="">Select recommendation</option>
                  {WORKS_RECOMMENDATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </FormSection>

            {/* 4. Environmental Health Unit */}
            <FormSection number="4" title="Environmental Health Unit" icon={<Building2 size={16} />}>
              <div>
                <label className={`${labelClass} block`}>Comments</label>
                <textarea name="environmentalComments" value={form.environmentalComments} onChange={handleFormChange} rows={3} placeholder="Enter environmental health comments..." className={inputClass} />
              </div>
            </FormSection>

            {/* 5. Approval Section */}
            <FormSection number="5" title="Approval Section" icon={<Stamp size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`${labelClass} block`}>Building Permit Number</label>
                  <input type="text" name="buildingPermitNumber" value={form.buildingPermitNumber} onChange={handleFormChange} placeholder="Enter permit number" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Approved By</label>
                  <input type="text" name="approvedBy" value={form.approvedBy} onChange={handleFormChange} placeholder="Enter approver name" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Approval Date</label>
                  <input type="date" name="approvalDate" value={form.approvalDate} onChange={handleFormChange} className={inputClass} />
                </div>
              </div>
            </FormSection>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => { resetForm(); setView('list'); }} className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">Cancel</button>
              <button onClick={handleSave} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <Save size={16} /> {editingId ? 'Update Review' : 'Save Review'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── List View ────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Stamp className="text-primary" size={24} />
          <h2 className="text-lg font-semibold">BP Official Reviews</h2>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{records.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors"><Download size={14} /> Export</button>
          <button onClick={openNew} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"><Plus size={14} /> New Review</button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="Search by application #, applicant, permit #, officer..." className={`${inputClass} pl-9`} />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className={`${selectClass} w-full sm:w-44`}>
          <option value="">All Statuses</option>
          {APPROVAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">App. #</th>
              <th className="px-4 py-3 text-left font-medium">Applicant</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Dev. Planning</th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Physical Planning</th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Works Dept.</th>
              <th className="px-4 py-3 text-left font-medium">Permit #</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No official reviews found</td></tr>
            )}
            {paginated.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{r.applicationNumber}</td>
                <td className="px-4 py-3">{r.applicantFullName || '\u2014'}</td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block h-2 w-2 rounded-full ${r.devPlanningRecommendation ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <span className="text-xs">{r.devPlanningOfficerName || 'Pending'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${r.conformsToPlanningScheme === 'Yes' ? 'bg-emerald-100 text-emerald-800' : r.conformsToPlanningScheme === 'No' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                    {r.conformsToPlanningScheme || 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs">{r.worksRecommendation || '\u2014'}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.buildingPermitNumber || '\u2014'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-800'}`}>{r.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(r)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Edit"><Pencil size={15} /></button>
                    {deleteConfirm === r.id ? (
                      <button onClick={() => handleDelete(r.id)} className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">Confirm</button>
                    ) : (
                      <button onClick={() => setDeleteConfirm(r.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete"><Trash2 size={15} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Showing {(currentPage - 1) * pageSize + 1}\u2013{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-1">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="rounded-md border border-input p-1.5 hover:bg-accent disabled:opacity-40"><ChevronLeft size={16} /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button key={pg} onClick={() => setCurrentPage(pg)} className={`rounded-md px-2.5 py-1 text-sm ${pg === currentPage ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>{pg}</button>
            ))}
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="rounded-md border border-input p-1.5 hover:bg-accent disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormSection({ number, title, icon, children }: { number: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-primary flex items-center gap-2 border-b border-border pb-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{number}</span>
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}
"""

with open('/home/z/my-project/src/components/rms/bp-official.tsx', 'w') as f:
    f.write(code)

print('Done!')