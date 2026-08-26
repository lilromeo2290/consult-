#!/usr/bin/env python3
"""Generate the penalties.tsx fines management component."""

content = r"""'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import {
  Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight,
  Gavel, Save, Loader2, X, FileText, User, AlertTriangle,
  Camera, Download, Upload, CalendarDays, Clock, MapPin, Phone, Building2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Fine {
  id: string;
  fineNumber: string;
  fineDate: string;
  dueDate: string;
  fineType: string;
  offence: string;
  fineAmount: string;
  description: string;
  offenderName: string;
  businessName: string;
  businessNumber: string;
  propertyNumber: string;
  phoneNumber: string;
  address: string;
  violationDate: string;
  violationTime: string;
  violationLocation: string;
  violationDetails: string;
  evidenceFileName: string;
  status: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const FINE_TYPES = [
  'Sanitation Violation', 'Building Code Violation', 'Noise Nuisance',
  'Illegal Dumping', 'Unauthorized Construction', 'Street Hawking',
  'Health & Safety Violation', 'Environmental Offence',
  'Tax Evasion', 'Rate Default', 'Other',
];

const STATUS_OPTIONS = ['Pending', 'Paid', 'Overdue', 'Waived', 'Appealed'];

// ─── Component ───────────────────────────────────────────────────────────────

export function PenaltiesPage() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [fines, setFines] = useSyncedStorage<Fine[]>('rms-fines', []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 10;

  const defaultForm = {
    fineNumber: '',
    fineDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    fineType: '',
    offence: '',
    fineAmount: '',
    description: '',
    offenderName: '',
    businessName: '',
    businessNumber: '',
    propertyNumber: '',
    phoneNumber: '',
    address: '',
    violationDate: new Date().toISOString().split('T')[0],
    violationTime: '',
    violationLocation: '',
    violationDetails: '',
    evidenceFileName: '',
    status: 'Pending',
  };

  const [form, setForm] = useState(defaultForm);

  const generateFineNumber = () => {
    const year = new Date().getFullYear();
    const prefix = `KpMA/FIN/${year}`;
    const existing = fines.filter((f) => f.fineNumber && f.fineNumber.startsWith(prefix));
    const maxNum = existing.reduce((max, f) => {
      const numStr = f.fineNumber.replace(prefix + '/', '');
      const num = parseInt(numStr, 10);
      return num > max ? num : max;
    }, 0);
    return `${prefix}/${String(maxNum + 1).padStart(4, '0')}`;
  };

  const filtered = fines.filter((f) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !searchQuery ||
      f.fineNumber.toLowerCase().includes(q) ||
      f.offenderName.toLowerCase().includes(q) ||
      f.businessName.toLowerCase().includes(q) ||
      f.offence.toLowerCase().includes(q) ||
      f.fineType.toLowerCase().includes(q);
    const matchType = typeFilter === 'All' || f.fineType === typeFilter;
    const matchStatus = statusFilter === 'All' || f.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paged = filtered.slice(startIdx, startIdx + itemsPerPage);
  const showingFrom = filtered.length === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(startIdx + itemsPerPage, filtered.length);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setForm((prev) => ({ ...prev, evidenceFileName: file.name }));
  };

  const handleSave = async () => {
    const missing: string[] = [];
    if (!form.offenderName?.trim()) missing.push("Offender's Name");
    if (!form.fineType) missing.push('Fine Type');
    if (!form.offence?.trim()) missing.push('Offence/Violation');
    if (!form.fineAmount || parseFloat(form.fineAmount) <= 0) missing.push('Fine Amount');
    if (!form.fineDate) missing.push('Fine Date');
    if (missing.length > 0) {
      alert('Please complete the following required field(s):\n\n' + missing.map((f) => '\u2022 ' + f).join('\n'));
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        setFines((prev) => prev.map((f) => (f.id === editingId ? { ...f, ...form } : f)));
        setEditingId(null);
      } else {
        setFines((prev) => [...prev, { id: `FIN-${Date.now()}`, ...form }]);
      }
      toast.success('Fine saved successfully');
      setForm(defaultForm);
      setView('list');
      setCurrentPage(1);
      setSearchQuery('');
    } catch (err) {
      console.error('Failed to save fine:', err);
      alert('Failed to save fine record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (fine: Fine) => {
 setForm({
      fineNumber: fine.fineNumber, fineDate: fine.fineDate, dueDate: fine.dueDate,
      fineType: fine.fineType, offence: fine.offence, fineAmount: fine.fineAmount,
      description: fine.description, offenderName: fine.offenderName,
      businessName: fine.businessName, businessNumber: fine.businessNumber,
      propertyNumber: fine.propertyNumber, phoneNumber: fine.phoneNumber,
      address: fine.address, violationDate: fine.violationDate,
      violationTime: fine.violationTime, violationLocation: fine.violationLocation,
      violationDetails: fine.violationDetails, evidenceFileName: fine.evidenceFileName || '',
      status: fine.status || 'Pending',
    });
    setEditingId(fine.id);
    setView('form');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this fine record?')) {
      setFines((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const handleCancel = () => {
    setForm(defaultForm);
    setEditingId(null);
    setView('list');
    setSearchQuery('');
    setTypeFilter('All');
    setStatusFilter('All');
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (fines.length === 0) { alert('No fine records to export.'); return; }
    const headers = ['Fine Number','Fine Date','Due Date','Fine Type','Offence','Amount (GHS)','Description','Offender Name','Business Name','Business Number','Property Number','Phone Number','Address','Violation Date','Violation Time','Violation Location','Violation Details','Status'];
    const rows = fines.map((f) => [f.fineNumber,f.fineDate,f.dueDate,f.fineType,f.offence,f.fineAmount,f.description,f.offenderName,f.businessName,f.businessNumber,f.propertyNumber,f.phoneNumber,f.address,f.violationDate,f.violationTime,f.violationLocation,f.violationDetails,f.status]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Fines_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) { alert('No data rows found.'); return; }
      const imported: Fine[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g) || [];
        const c = cols.map((v) => v.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
        if (c.length >= 6) {
          imported.push({
            id: `IMP-FIN-${Date.now()}-${i}`, fineNumber: c[0]||'', fineDate: c[1]||'',
            dueDate: c[2]||'', fineType: c[3]||'', offence: c[4]||'', fineAmount: c[5]||'',
            description: c[6]||'', offenderName: c[7]||'', businessName: c[8]||'',
            businessNumber: c[9]||'', propertyNumber: c[10]||'', phoneNumber: c[11]||'',
            address: c[12]||'', violationDate: c[13]||'', violationTime: c[14]||'',
            violationLocation: c[15]||'', violationDetails: c[16]||'',
            status: c[17]||'Pending', evidenceFileName: '',
          });
        }
      }
      if (imported.length === 0) { alert('No valid records found.'); return; }
      const existing = new Map(fines.map((f) => [f.id, f]));
      for (const item of imported) existing.set(item.id, item);
      setFines(Array.from(existing.values()));
      alert(`${imported.length} fine record(s) imported successfully.`);
    } catch { alert('Failed to import file.'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Overdue': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'Waived': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Appealed': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const inputClass = 'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition';
  const labelClass = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5';

  // ══════════════════════════════════════════════════════════════════════════
  //  LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'list') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fines Management</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Record and manage offence fines and penalties issued within the assembly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setForm({ ...defaultForm, fineNumber: generateFineNumber() }); setEditingId(null); setView('form'); }}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Fine
            </button>
            <button onClick={handleExport} className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap cursor-pointer">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap cursor-pointer">
              <Upload className="w-4 h-4" /> Import
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search by fine number, offender, offence, type..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className={`${inputClass} pl-10`} />
          </div>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }} className={`${inputClass} w-full sm:w-48`}>
            <option value="All">All Fine Types</option>
            {FINE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className={`${inputClass} w-full sm:w-48`}>
            <option value="All">All Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Fine Number</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Offender</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Fine Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Offence</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Amount (GH&#x20B5;)</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Fine Date</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 dark:text-slate-500">
                      <Gavel className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No fine records found.</p>
                      <p className="text-xs mt-1">Click &quot;Add Fine&quot; to create a new fine record.</p>
                    </td>
                  </tr>
                ) : (
                  paged.map((fine) => (
                    <tr key={fine.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{fine.fineNumber || '-'}</td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200 whitespace-nowrap">{fine.offenderName || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{fine.fineType || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{fine.offence || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">{fine.fineAmount ? `GH\u20B5 ${parseFloat(fine.fineAmount).toFixed(2)}` : '-'}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(fine.status)}`}>{fine.status || 'Pending'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fine.fineDate || '-'}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEdit(fine)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(fine.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer" title="Delete">
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

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing {showingFrom} to {showingTo} of {filtered.length} record(s)
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer ${page === currentPage ? 'bg-emerald-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{page}</button>
                ))}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  FORM VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Form Header */}
      <div className="flex items-center gap-3">
        <button onClick={handleCancel} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">
          <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{editingId ? 'Edit Fine' : 'New Fine'}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Fill in the details below. Fields marked <span className="text-red-500">*</span> are required.</p>
        </div>
      </div>

      <div className="grid gap-5">

        {/* ═══ FINE DETAILS ═══ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <Gavel className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Fine Details</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              <div>
                <label className={`${labelClass} block`}>Fine Number</label>
                <input type="text" name="fineNumber" value={form.fineNumber} placeholder="Auto-generated" className={`${inputClass} bg-slate-50 dark:bg-slate-900/40`} readOnly />
              </div>
              <div>
                <label className={`${labelClass} block`}>Fine Date <span className="text-red-500">*</span></label>
                <input type="date" name="fineDate" value={form.fineDate} onChange={handleFormChange} className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Due Date</label>
                <input type="date" name="dueDate" value={form.dueDate} onChange={handleFormChange} className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Fine Type <span className="text-red-500">*</span></label>
                <select name="fineType" value={form.fineType} onChange={handleFormChange} className={inputClass}>
                  <option value="">Select fine type...</option>
                  {FINE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>Offence / Violation <span className="text-red-500">*</span></label>
                <input type="text" name="offence" value={form.offence} onChange={handleFormChange} placeholder="Describe the offence or violation committed" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Fine Amount (GH₵) <span className="text-red-500">*</span></label>
                <input type="number" name="fineAmount" value={form.fineAmount} onChange={handleFormChange} placeholder="0.00" min="0" step="0.01" className={inputClass} />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Description / Remarks</label>
                <textarea name="description" value={form.description} onChange={handleFormChange} rows={2} placeholder="Additional notes or remarks about this fine" className={`${inputClass} resize-none`} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Status</label>
                <select name="status" value={form.status} onChange={handleFormChange} className={inputClass}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ OFFENDER INFORMATION ═══ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <User className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Offender Information</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              <div className="sm:col-span-2">
                <label className={`${labelClass} block`}>Name of Offender <span className="text-red-500">*</span></label>
                <input type="text" name="offenderName" value={form.offenderName} onChange={handleFormChange} placeholder="Enter full name of offender" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Phone Number</label>
                <input type="text" name="phoneNumber" value={form.phoneNumber} onChange={handleFormChange} placeholder="e.g. 024 XXX XXXX" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Business Name (if applicable)</label>
                <input type="text" name="businessName" value={form.businessName} onChange={handleFormChange} placeholder="Enter business name" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Business Number (if applicable)</label>
                <input type="text" name="businessNumber" value={form.businessNumber} onChange={handleFormChange} placeholder="Enter business number" className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Property Number (if applicable)</label>
                <input type="text" name="propertyNumber" value={form.propertyNumber} onChange={handleFormChange} placeholder="Enter property number" className={inputClass} />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Address / Location</label>
                <input type="text" name="address" value={form.address} onChange={handleFormChange} placeholder="Enter offender address or location" className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        {/* ═══ VIOLATION DETAILS ═══ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
            <AlertTriangle className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Violation Details</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              <div>
                <label className={`${labelClass} block`}>Date of Violation</label>
                <input type="date" name="violationDate" value={form.violationDate} onChange={handleFormChange} className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Time of Violation</label>
                <input type="time" name="violationTime" value={form.violationTime} onChange={handleFormChange} className={inputClass} />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Location of Violation</label>
                <input type="text" name="violationLocation" value={form.violationLocation} onChange={handleFormChange} placeholder="Enter where the violation occurred" className={inputClass} />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Details of Violation</label>
                <textarea name="violationDetails" value={form.violationDetails} onChange={handleFormChange} rows={3} placeholder="Provide a detailed account of the violation" className={`${inputClass} resize-none`} />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`${labelClass} block`}>Evidence / Photo Upload (Optional)</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => evidenceInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:border-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    {form.evidenceFileName ? 'Change File' : 'Choose File'}
                  </button>
                  {form.evidenceFileName && (
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      {form.evidenceFileName}
                      <button type="button" onClick={() => setForm((p) => ({ ...p, evidenceFileName: '' }))} className="ml-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  )}
                  <input ref={evidenceInputRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleEvidenceUpload} className="hidden" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button onClick={handleCancel} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-500 hover:bg-slate-600 text-white text-sm font-medium transition-colors cursor-pointer">
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : (editingId ? 'Update' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
"""

with open('/home/z/my-project/src/components/rms/penalties.tsx', 'w') as f:
    f.write(content)

print('penalties.tsx generated successfully')
