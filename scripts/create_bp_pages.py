code1 = r"""'use client';

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import {
  Search, Plus, ArrowLeft, Pencil, Trash2, ChevronLeft, ChevronRight,
  Save, Stamp, Eye, Download, Upload, FileCheck, X, Clock, CheckCircle2, AlertCircle,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BPOfficial {
  id: string;
  permitNumber: string;
 applicantFullName: string;
  reviewDate: string;
  reviewerName: string;
  reviewerTitle: string;
  recommendation: string;
  officialComments: string;
  approvalStatus: string;
  signatureDate: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'rms-bp-official';

const RECOMMENDATIONS = ['Approve', 'Approve with Conditions', 'Request Modifications', 'Reject', 'Refer to Committee'];
const APPROVAL_STATUSES = ['Pending', 'Reviewed', 'Approved', 'Rejected', 'Deferred'];
const REVIEWER_TITLES = ['Physical Planning Officer', 'Works Engineer', 'Environmental Health Officer', 'Fire Officer', 'Town & Country Planning'];

const STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-yellow-100 text-yellow-800',
  'Reviewed': 'bg-blue-100 text-blue-800',
  'Approved': 'bg-emerald-100 text-emerald-800',
  'Rejected': 'bg-red-100 text-red-800',
  'Deferred': 'bg-orange-100 text-orange-800',
};

const EMPTY_FORM: BPOfficial = {
  id: '',
  permitNumber: '',
  applicantFullName: '',
  reviewDate: new Date().toISOString().split('T')[0],
  reviewerName: '',
  reviewerTitle: '',
  recommendation: '',
  officialComments: '',
  approvalStatus: 'Pending',
  signatureDate: '',
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
        r.permitNumber.toLowerCase().includes(q) ||
        r.applicantFullName.toLowerCase().includes(q) ||
        r.reviewerName.toLowerCase().includes(q)
      );
    }
    if (statusFilter) list = list.filter((r) => r.approvalStatus === statusFilter);
    return list;
  }, [records, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage]);

  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_FORM, reviewDate: new Date().toISOString().split('T')[0] });
    setEditingId(null);
  }, []);

  const openNew = useCallback(() => { resetForm(); setView('form'); }, [resetForm]);
  const openEdit = useCallback((r: BPOfficial) => { setForm({ ...r }); setEditingId(r.id); setView('form'); }, []);

  const handleSave = useCallback(() => {
    if (!form.permitNumber.trim()) { toast.error('Permit Number is required'); return; }
    if (!form.reviewerName.trim()) { toast.error('Reviewer Name is required'); return; }
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

  if (view === 'form') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <button onClick={() => { resetForm(); setView('list'); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back to list
        </button>
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b px-6 py-4">
            <Stamp className="text-primary" size={24} />
            <h2 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Official Review</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`${labelClass} block`}>Permit Number <span className="text-red-500">*</span></label>
                <input type="text" name="permitNumber" value={form.permitNumber} onChange={handleFormChange} placeholder="BP2026-0001" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Applicant Name</label>
                <input type="text" name="applicantFullName" value={form.applicantFullName} onChange={handleFormChange} placeholder="Enter applicant name" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Review Date</label>
                <input type="date" name="reviewDate" value={form.reviewDate} onChange={handleFormChange} className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Reviewer Name <span className="text-red-500">*</span></label>
                <input type="text" name="reviewerName" value={form.reviewerName} onChange={handleFormChange} placeholder="Enter reviewer name" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Reviewer Title</label>
                <select name="reviewerTitle" value={form.reviewerTitle} onChange={handleFormChange} className={selectClass}>
                  <option value="">Select title</option>
                  {REVIEWER_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={`${labelClass} block`}>Approval Status</label>
                <select name="approvalStatus" value={form.approvalStatus} onChange={handleFormChange} className={selectClass}>
                  {APPROVAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={`${labelClass} block`}>Recommendation</label>
                <select name="recommendation" value={form.recommendation} onChange={handleFormChange} className={selectClass}>
                  <option value="">Select recommendation</option>
                  {RECOMMENDATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={`${labelClass} block`}>Signature Date</label>
                <input type="date" name="signatureDate" value={form.signatureDate} onChange={handleFormChange} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={`${labelClass} block`}>Official Comments</label>
              <textarea name="officialComments" value={form.officialComments} onChange={handleFormChange} rows={4} placeholder="Enter review comments, conditions, or observations..." className={inputClass} />
            </div>
            <div className="flex items-center justify-end gap-3">
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
          <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="Search by permit #, applicant, reviewer..." className={`${inputClass} pl-9`} />
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
              <th className="px-4 py-3 text-left font-medium">Permit #</th>
              <th className="px-4 py-3 text-left font-medium">Applicant</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Reviewer</th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Recommendation</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No official reviews found</td></tr>
            )}
            {paginated.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{r.permitNumber}</td>
                <td className="px-4 py-3">{r.applicantFullName || '\u2014'}</td>
                <td className="px-4 py-3 hidden md:table-cell">{r.reviewerName || '\u2014'}</td>
                <td className="px-4 py-3 hidden lg:table-cell">{r.recommendation || '\u2014'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[r.approvalStatus] || 'bg-gray-100 text-gray-800'}`}>{r.approvalStatus}</span>
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
"""

code2 = r"""'use client';

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import {
  Search, Plus, ArrowLeft, Pencil, Trash2, ChevronLeft, ChevronRight,
  Save, Wallet, Eye, Download, Upload, Receipt, X,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BPPayment {
  id: string;
  permitNumber: string;
  applicantFullName: string;
  paymentDate: string;
  paymentType: string;
  amount: string;
  referenceNumber: string;
  paymentMethod: string;
  payeeName: string;
  status: string;
  remarks: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'rms-bp-payments';

const PAYMENT_TYPES = [
  'Application Fee',
  'Processing Fee',
  'Inspection Fee',
  'Permit Issuance Fee',
  'Development Levy',
  'Plan Approval Fee',
  'Extension Fee',
  'Other',
];

const PAYMENT_METHODS = ['Cash', 'Bank Draft', 'Cheque', 'Mobile Money', 'Bank Transfer'];
const PAYMENT_STATUSES = ['Pending', 'Paid', 'Partial', 'Overdue', 'Waived', 'Refunded'];

const STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-yellow-100 text-yellow-800',
  'Paid': 'bg-emerald-100 text-emerald-800',
  'Partial': 'bg-blue-100 text-blue-800',
  'Overdue': 'bg-red-100 text-red-800',
  'Waived': 'bg-gray-100 text-gray-800',
  'Refunded': 'bg-orange-100 text-orange-800',
};

const EMPTY_FORM: BPPayment = {
  id: '',
  permitNumber: '',
  applicantFullName: '',
  paymentDate: new Date().toISOString().split('T')[0],
  paymentType: '',
  amount: '',
  referenceNumber: '',
  paymentMethod: '',
  payeeName: '',
  status: 'Pending',
  remarks: '',
};

const labelClass = 'text-sm font-medium text-foreground';
const inputClass = 'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const selectClass = 'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

// ─── Component ───────────────────────────────────────────────────────────────

export function BPPaymentPage() {
  const [payments, setPayments] = useSyncedStorage<BPPayment[]>(STORAGE_KEY, []);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BPPayment>(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const pageSize = 10;

  const filtered = useMemo(() => {
    let list = [...payments];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((p) =>
        p.permitNumber.toLowerCase().includes(q) ||
        p.applicantFullName.toLowerCase().includes(q) ||
        p.referenceNumber.toLowerCase().includes(q) ||
        p.paymentType.toLowerCase().includes(q)
      );
    }
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    return list;
  }, [payments, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage]);

  const totalAmount = useMemo(() => filtered.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0), [filtered]);
  const paidAmount = useMemo(() => filtered.filter((p) => p.status === 'Paid').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0), [filtered]);

  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_FORM, paymentDate: new Date().toISOString().split('T')[0] });
    setEditingId(null);
  }, []);

  const openNew = useCallback(() => { resetForm(); setView('form'); }, [resetForm]);
  const openEdit = useCallback((p: BPPayment) => { setForm({ ...p }); setEditingId(p.id); setView('form'); }, []);

  const handleSave = useCallback(() => {
    if (!form.permitNumber.trim()) { toast.error('Permit Number is required'); return; }
    if (!form.paymentType) { toast.error('Payment Type is required'); return; }
    if (!form.amount) { toast.error('Amount is required'); return; }
    if (editingId) {
      setPayments((prev) => prev.map((p) => (p.id === editingId ? { ...form } : p)));
      toast.success('Payment updated successfully');
    } else {
      setPayments((prev) => [...prev, { ...form, id: crypto.randomUUID() }]);
      toast.success('Payment recorded successfully');
    }
    resetForm(); setView('list');
  }, [form, editingId, setPayments, resetForm]);

  const handleDelete = useCallback((id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
    setDeleteConfirm(null); toast.success('Payment deleted');
  }, [setPayments]);

  const handleExport = useCallback(() => {
    if (payments.length === 0) { toast.error('No data to export'); return; }
    const headers = Object.keys(EMPTY_FORM).filter((k) => k !== 'id');
    const rows = payments.map((p) => headers.map((h) => `"${String(p[h as keyof BPPayment]).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'bp_payments.csv'; a.click(); URL.revokeObjectURL(url);
    toast.success('Exported successfully');
  }, [payments]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim());
        if (lines.length < 2) { toast.error('File is empty'); return; }
        const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
        const imported: BPPayment[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g)?.map((v) => v.replace(/^"|"$/g, '').replace(/""/g, '"')) || [];
          const obj: Record<string, string> = {};
          headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });
          imported.push({ ...EMPTY_FORM, ...obj, id: crypto.randomUUID() } as BPPayment);
        }
        setPayments((prev) => [...prev, ...imported]);
        toast.success(`Imported ${imported.length} record(s)`);
      } catch { toast.error('Failed to parse CSV file'); }
    };
    reader.readAsText(file); e.target.value = '';
  }, [setPayments]);

  if (view === 'form') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <button onClick={() => { resetForm(); setView('list'); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back to list
        </button>
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b px-6 py-4">
            <Wallet className="text-primary" size={24} />
            <h2 className="text-lg font-semibold">{editingId ? 'Edit' : 'Record'} BP Payment</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`${labelClass} block`}>Permit Number <span className="text-red-500">*</span></label>
                <input type="text" name="permitNumber" value={form.permitNumber} onChange={handleFormChange} placeholder="BP2026-0001" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Applicant Name</label>
                <input type="text" name="applicantFullName" value={form.applicantFullName} onChange={handleFormChange} placeholder="Enter applicant name" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Payment Type <span className="text-red-500">*</span></label>
                <select name="paymentType" value={form.paymentType} onChange={handleFormChange} className={selectClass}>
                  <option value="">Select type</option>
                  {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={`${labelClass} block`}>Amount (GH\u20a2) <span className="text-red-500">*</span></label>
                <input type="number" name="amount" value={form.amount} onChange={handleFormChange} placeholder="0.00" min="0" step="0.01" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Payment Date</label>
                <input type="date" name="paymentDate" value={form.paymentDate} onChange={handleFormChange} className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Payment Method</label>
                <select name="paymentMethod" value={form.paymentMethod} onChange={handleFormChange} className={selectClass}>
                  <option value="">Select method</option>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={`${labelClass} block`}>Reference Number</label>
                <input type="text" name="referenceNumber" value={form.referenceNumber} onChange={handleFormChange} placeholder="Receipt / reference #" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Status</label>
                <select name="status" value={form.status} onChange={handleFormChange} className={selectClass}>
                  {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={`${labelClass} block`}>Payee Name</label>
                <input type="text" name="payeeName" value={form.payeeName} onChange={handleFormChange} placeholder="Name of person paying" className={inputClass} />
              </div>
            </div>
            <div>
              <label className={`${labelClass} block`}>Remarks</label>
              <textarea name="remarks" value={form.remarks} onChange={handleFormChange} rows={3} placeholder="Additional notes..." className={inputClass} />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => { resetForm(); setView('list'); }} className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">Cancel</button>
              <button onClick={handleSave} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <Save size={16} /> {editingId ? 'Update Payment' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Records</p>
          <p className="text-2xl font-bold mt-1">{payments.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Amount</p>
          <p className="text-2xl font-bold mt-1">GH\u20a2 {totalAmount.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">GH\u20a2 {paidAmount.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="text-primary" size={24} />
          <h2 className="text-lg font-semibold">BP Payments</h2>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors">
            <Upload size={14} /> Import
            <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
          </label>
          <button onClick={handleExport} className="flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors"><Download size={14} /> Export</button>
          <button onClick={openNew} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"><Plus size={14} /> New Payment</button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="Search by permit #, applicant, reference..." className={`${inputClass} pl-9`} />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className={`${selectClass} w-full sm:w-44`}>
          <option value="">All Statuses</option>
          {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Permit #</th>
              <th className="px-4 py-3 text-left font-medium">Applicant</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Payment Type</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Method</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No BP payments found</td></tr>
            )}
            {paginated.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{p.permitNumber}</td>
                <td className="px-4 py-3">{p.applicantFullName || '\u2014'}</td>
                <td className="px-4 py-3 hidden md:table-cell">{p.paymentType || '\u2014'}</td>
                <td className="px-4 py-3 text-right font-mono">GH\u20a2 {parseFloat(p.amount || '0').toFixed(2)}</td>
                <td className="px-4 py-3 hidden lg:table-cell">{p.paymentMethod || '\u2014'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-800'}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(p)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Edit"><Pencil size={15} /></button>
                    {deleteConfirm === p.id ? (
                      <button onClick={() => handleDelete(p.id)} className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">Confirm</button>
                    ) : (
                      <button onClick={() => setDeleteConfirm(p.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete"><Trash2 size={15} /></button>
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
"""

with open('/home/z/my-project/src/components/rms/bp-official.tsx', 'w') as f:
    f.write(code1)
with open('/home/z/my-project/src/components/rms/bp-payment.tsx', 'w') as f:
    f.write(code2)

print('Done!')
