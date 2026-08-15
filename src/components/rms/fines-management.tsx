'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import {
  Search, Plus, ArrowLeft, Pencil, Trash2, ChevronLeft, ChevronRight,
  Save, Download, Upload, Gavel, MapPin, FileText, Tag, Layers,
  Loader2, AlertTriangle, DollarSign, X,
} from 'lucide-react';
import { exportToExcel, importFromExcel, FINE_MANAGEMENT_FIELDS } from '@/lib/import-export';
import {
  FINE_CLASS_NAMES,
  FINE_CLASS_TO_FIRST_CODE,
  FINE_CLASS_TO_CODES,
  FINE_CODE_TO_CLASS,
  FINE_CODE_TO_CATEGORY,
} from '@/lib/fines-class-code-map';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FineRecord {
  id: string;
  fineNumber: string;
  nameOfOffender: string;
  locationAddress: string;
  fineRevenueCode: string;
  classDescription: string;
  category: string;
  arrears: number;
  charge: number;
  amountDue: number;
  status: string;
  dateIssued: string;
  comments: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'rms-fines';

const FINE_STATUSES = [
  'Outstanding',
  'Partially Paid',
  'Paid',
  'Waived',
  'Under Appeal',
  'Written Off',
];

const STATUS_COLORS: Record<string, string> = {
  'Outstanding': 'bg-red-100 text-red-800',
  'Partially Paid': 'bg-amber-100 text-amber-800',
  'Paid': 'bg-green-100 text-green-800',
  'Waived': 'bg-blue-100 text-blue-800',
  'Under Appeal': 'bg-purple-100 text-purple-800',
  'Written Off': 'bg-gray-100 text-gray-700',
};

const EMPTY_FORM: FineRecord = {
  id: '',
  fineNumber: '',
  nameOfOffender: '',
  locationAddress: '',
  fineRevenueCode: '',
  classDescription: '',
  category: '',
  arrears: 0,
  charge: 0,
  amountDue: 0,
  status: 'Outstanding',
  dateIssued: new Date().toISOString().split('T')[0],
  comments: '',
};

const labelClass = 'text-sm font-medium text-foreground';
const inputClass = 'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const selectClass = 'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const textareaClass = 'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none';

function generateFineNumber(existing: FineRecord[]): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = 'FN';
  let max = 0;
  for (const f of existing) {
    const m = f.fineNumber.match(/^FN-\d{2}-(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `${prefix}-${year}-${String(max + 1).padStart(4, '0')}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FinesManagementPage() {
  const [fines, setFines] = useSyncedStorage<FineRecord[]>(STORAGE_KEY, []);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [form, setForm] = useState<FineRecord>({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);

  // List state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived data ──

  const filteredFines = useMemo(() => {
    let result = [...fines];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.fineNumber.toLowerCase().includes(q) ||
          f.nameOfOffender.toLowerCase().includes(q) ||
          f.locationAddress.toLowerCase().includes(q) ||
          f.classDescription.toLowerCase().includes(q) ||
          f.fineRevenueCode.includes(q),
      );
    }
    if (statusFilter) {
      result = result.filter((f) => f.status === statusFilter);
    }
    if (classFilter) {
      result = result.filter((f) => f.classDescription === classFilter);
    }
    return result;
  }, [fines, searchQuery, statusFilter, classFilter]);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredFines.length / PAGE_SIZE));
  const paginatedFines = useMemo(
    () => filteredFines.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredFines, currentPage],
  );

  // ── Reset page when filters change ──
  useMemo(() => { setCurrentPage(1); }, [searchQuery, statusFilter, classFilter]);

  // ── Handlers ──

  const handleNew = useCallback(() => {
    const newForm = {
      ...EMPTY_FORM,
      fineNumber: generateFineNumber(fines),
      dateIssued: new Date().toISOString().split('T')[0],
    };
    setForm(newForm);
    setEditingId(null);
    setView('form');
  }, [fines]);

  const handleEdit = useCallback((fine: FineRecord) => {
    setForm({ ...fine });
    setEditingId(fine.id);
    setView('form');
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      if (!confirm('Are you sure you want to delete this fine record?')) return;
      setFines((prev) => prev.filter((f) => f.id !== id));
      toast.success('Fine record deleted successfully');
    },
    [setFines],
  );

  const handleFieldChange = useCallback(
    (field: keyof FineRecord, value: string | number) => {
      setForm((prev) => {
        const updated = { ...prev, [field]: value };

        // When class description changes, auto-set revenue code and category
        if (field === 'classDescription') {
          const code = FINE_CLASS_TO_FIRST_CODE[value as string];
          if (code) {
            updated.fineRevenueCode = code;
            updated.category = FINE_CODE_TO_CATEGORY[code] || '';
          }
        }

        // When revenue code changes, auto-set class description and category
        if (field === 'fineRevenueCode') {
          const cls = FINE_CODE_TO_CLASS[value as string];
          if (cls) {
            updated.classDescription = cls;
            updated.category = FINE_CODE_TO_CATEGORY[value as string] || '';
          }
        }

        // Auto-calculate amount due
        updated.amountDue = (updated.arrears || 0) + (updated.charge || 0);

        return updated;
      });
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (!form.nameOfOffender.trim()) {
      toast.error('Name of Offender is required');
      return;
    }
    if (!form.classDescription.trim()) {
      toast.error('Class Description is required');
      return;
    }

    setFines((prev) => {
      if (editingId) {
        return prev.map((f) => (f.id === editingId ? { ...form } : f));
      }
      return [...prev, { ...form, id: crypto.randomUUID() }];
    });
    toast.success(editingId ? 'Fine record updated successfully' : 'Fine record created successfully');
    setView('list');
    setEditingId(null);
  }, [form, editingId, setFines]);

  const handleExport = useCallback(() => {
    if (fines.length === 0) {
      toast.error('No data to export');
      return;
    }
    exportToExcel(fines, FINE_MANAGEMENT_FIELDS, 'Fines_Management');
    toast.success('Fines data exported successfully');
  }, [fines]);

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const rows = await importFromExcel<FineRecord>(file, FINE_MANAGEMENT_FIELDS);
        const newRecords = rows.map((r) => ({
          ...r,
          id: r.id || crypto.randomUUID(),
        }));
        setFines((prev) => [...prev, ...newRecords]);
        toast.success(`Imported ${newRecords.length} fine record(s)`);
      } catch (err) {
        toast.error('Failed to import file. Please check the format.');
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [setFines],
  );

  // ── Sub-components ──

  function FormSection({
    number,
    title,
    icon: Icon,
    children,
  }: {
    number: number;
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
  }) {
    return (
      <div className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <div className='flex items-center gap-2.5 mb-4'>
          <span className='flex h-7 w-7 items-center justify-center rounded-full bg-[#0B1D3E] text-xs font-bold text-white'>
            {number}
          </span>
          <Icon className='h-5 w-5 text-[#0B1D3E]' />
          <h3 className='text-sm font-semibold text-foreground'>{title}</h3>
        </div>
        {children}
      </div>
    );
  }

  // ── Render: Form View ──

  if (view === 'form') {
    return (
      <div className='space-y-4'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => { setView('list'); setEditingId(null); }}
              className='rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
              aria-label='Back to list'
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className='text-lg font-semibold text-foreground'>
                {editingId ? 'Edit Fine Record' : 'New Fine Record'}
              </h2>
              <p className='text-sm text-muted-foreground'>
                {editingId ? `Editing ${form.fineNumber}` : `New fine — ${form.fineNumber}`}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => { setView('list'); setEditingId(null); }}
              className='rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className='inline-flex items-center gap-2 rounded-lg bg-[#0B1D3E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0B1D3E]/90'
            >
              <Save size={16} />
              {editingId ? 'Update' : 'Save'}
            </button>
          </div>
        </div>

        {/* Form Sections */}
        <div className='grid gap-4'>
          {/* Section 1: Fine Identification */}
          <FormSection number={1} title='Fine Identification' icon={Gavel}>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              <div>
                <label className={labelClass}>Fine Number</label>
                <input
                  type='text'
                  value={form.fineNumber}
                  onChange={(e) => handleFieldChange('fineNumber', e.target.value)}
                  className={inputClass}
                  placeholder='Auto-generated'
                />
              </div>
              <div>
                <label className={labelClass}>Date Issued</label>
                <input
                  type='date'
                  value={form.dateIssued}
                  onChange={(e) => handleFieldChange('dateIssued', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  className={selectClass}
                >
                  {FINE_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </FormSection>

          {/* Section 2: Offender Information */}
          <FormSection number={2} title='Offender Information' icon={Gavel}>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div>
                <label className={labelClass}>Name of Offender <span className='text-red-500'>*</span></label>
                <input
                  type='text'
                  value={form.nameOfOffender}
                  onChange={(e) => handleFieldChange('nameOfOffender', e.target.value)}
                  className={inputClass}
                  placeholder='Enter full name of offender'
                />
              </div>
              <div>
                <label className={labelClass}>Location / Address</label>
                <input
                  type='text'
                  value={form.locationAddress}
                  onChange={(e) => handleFieldChange('locationAddress', e.target.value)}
                  className={inputClass}
                  placeholder='Enter location or address of offence'
                />
              </div>
            </div>
          </FormSection>

          {/* Section 3: Classification & Revenue Code */}
          <FormSection number={3} title='Classification & Revenue Code' icon={Tag}>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              <div className='sm:col-span-2 lg:col-span-1'>
                <label className={labelClass}>Class Description <span className='text-red-500'>*</span></label>
                <select
                  value={form.classDescription}
                  onChange={(e) => handleFieldChange('classDescription', e.target.value)}
                  className={selectClass}
                >
                  <option value=''>-- Select Offence Class --</option>
                  {FINE_CLASS_NAMES.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Fine Revenue Code</label>
                <select
                  value={form.fineRevenueCode}
                  onChange={(e) => handleFieldChange('fineRevenueCode', e.target.value)}
                  className={selectClass}
                >
                  <option value=''>-- Select Revenue Code --</option>
                  {form.classDescription && FINE_CLASS_TO_CODES[form.classDescription]
                    ? FINE_CLASS_TO_CODES[form.classDescription].map((code) => (
                        <option key={code} value={code}>
                          {code} — {FINE_CODE_TO_CATEGORY[code] || ''}
                        </option>
                      ))
                    : FINE_CLASS_NAMES.map((cls) => {
                        const codes = FINE_CLASS_TO_CODES[cls] || [];
                        return codes.map((code) => (
                          <optgroup key={cls} label={cls}>
                            <option value={code}>{code} — {FINE_CODE_TO_CATEGORY[code] || ''}</option>
                          </optgroup>
                        ));
                      })}
                </select>
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <input
                  type='text'
                  value={form.category}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  className={inputClass}
                  placeholder='Auto-populated from revenue code'
                  readOnly
                />
              </div>
            </div>
          </FormSection>

          {/* Section 4: Amount Details */}
          <FormSection number={4} title='Amount Details' icon={DollarSign}>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <div>
                <label className={labelClass}>Arrears (GHS)</label>
                <input
                  type='number'
                  min='0'
                  step='0.01'
                  value={form.arrears || ''}
                  onChange={(e) => handleFieldChange('arrears', parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  placeholder='0.00'
                />
              </div>
              <div>
                <label className={labelClass}>Charge (GHS)</label>
                <input
                  type='number'
                  min='0'
                  step='0.01'
                  value={form.charge || ''}
                  onChange={(e) => handleFieldChange('charge', parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  placeholder='0.00'
                />
              </div>
              <div>
                <label className={labelClass}>Amount Due (GHS)</label>
                <input
                  type='number'
                  min='0'
                  step='0.01'
                  value={form.amountDue || ''}
                  readOnly
                  className={`${inputClass} bg-muted/50 font-semibold`}
                  placeholder='Auto-calculated'
                />
              </div>
              <div className='flex items-end'>
                <div className='rounded-lg border border-border bg-muted/30 px-4 py-3 text-center w-full'>
                  <p className='text-xs text-muted-foreground'>Amount Due</p>
                  <p className='text-xl font-bold text-[#0B1D3E]'>
                    GHS {(form.amountDue || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </FormSection>

          {/* Section 5: Additional Information */}
          <FormSection number={5} title='Additional Information' icon={FileText}>
            <div>
              <label className={labelClass}>Comments</label>
              <textarea
                rows={3}
                value={form.comments}
                onChange={(e) => handleFieldChange('comments', e.target.value)}
                className={textareaClass}
                placeholder='Enter any additional notes or comments about this fine'
              />
            </div>
          </FormSection>
        </div>
      </div>
    );
  }

  // ── Render: List View ──

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-lg font-semibold text-foreground'>Fines Management</h2>
          <p className='text-sm text-muted-foreground'>
            {fines.length} fine record{fines.length !== 1 ? 's' : ''} total
            {filteredFines.length !== fines.length && ` · ${filteredFines.length} shown`}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={handleExport}
            className='inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
          >
            <Download size={15} />
            Export
          </button>
          <label className='inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer'>
            {importing ? <Loader2 size={15} className='animate-spin' /> : <Upload size={15} />}
            Import
            <input
              ref={fileInputRef}
              type='file'
              accept='.xlsx,.xls,.csv'
              onChange={handleImport}
              className='hidden'
              disabled={importing}
            />
          </label>
          <button
            onClick={handleNew}
            className='inline-flex items-center gap-1.5 rounded-lg bg-[#0B1D3E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0B1D3E]/90'
          >
            <Plus size={15} />
            New Fine
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className='rounded-xl border border-border bg-card p-4 shadow-sm'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search by fine number, offender name, location, or class...'
              className='w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            />
          </div>
          <div className='flex gap-2'>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className='rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            >
              <option value=''>All Statuses</option>
              {FINE_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className='rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            >
              <option value=''>All Classes</option>
              {FINE_CLASS_NAMES.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className='rounded-xl border border-border bg-card shadow-sm overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-border bg-muted/50'>
                <th className='px-4 py-3 text-left font-semibold text-muted-foreground'>Fine No.</th>
                <th className='px-4 py-3 text-left font-semibold text-muted-foreground'>Offender</th>
                <th className='px-4 py-3 text-left font-semibold text-muted-foreground hidden lg:table-cell'>Location</th>
                <th className='px-4 py-3 text-left font-semibold text-muted-foreground hidden md:table-cell'>Class Description</th>
                <th className='px-4 py-3 text-right font-semibold text-muted-foreground'>Amount Due</th>
                <th className='px-4 py-3 text-center font-semibold text-muted-foreground'>Status</th>
                <th className='px-4 py-3 text-center font-semibold text-muted-foreground'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFines.length === 0 ? (
                <tr>
                  <td colSpan={7} className='px-4 py-12 text-center text-muted-foreground'>
                    <Gavel className='mx-auto mb-3 h-10 w-10 text-muted-foreground/40' />
                    <p className='font-medium'>No fine records found</p>
                    <p className='mt-1 text-xs'>Create a new fine record or adjust your search filters</p>
                  </td>
                </tr>
              ) : (
                paginatedFines.map((fine) => (
                  <tr
                    key={fine.id}
                    className='border-b border-border last:border-b-0 transition-colors hover:bg-muted/30'
                  >
                    <td className='px-4 py-3 font-mono text-xs'>{fine.fineNumber}</td>
                    <td className='px-4 py-3'>
                      <div className='font-medium'>{fine.nameOfOffender}</div>
                      <div className='text-xs text-muted-foreground mt-0.5'>{fine.fineRevenueCode}</div>
                    </td>
                    <td className='px-4 py-3 text-muted-foreground hidden lg:table-cell max-w-[200px] truncate'>
                      {fine.locationAddress || '—'}
                    </td>
                    <td className='px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[180px] truncate'>
                      {fine.classDescription || '—'}
                    </td>
                    <td className='px-4 py-3 text-right font-semibold'>
                      GHS {(fine.amountDue || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className='px-4 py-3 text-center'>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[fine.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {fine.status}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex items-center justify-center gap-1'>
                        <button
                          onClick={() => handleEdit(fine)}
                          className='rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
                          aria-label='Edit fine'
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(fine.id)}
                          className='rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600'
                          aria-label='Delete fine'
                        >
                          <Trash2 size={15} />
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
        {totalPages > 1 && (
          <div className='flex items-center justify-between border-t border-border px-4 py-3'>
            <p className='text-xs text-muted-foreground'>
              Page {currentPage} of {totalPages} ({filteredFines.length} records)
            </p>
            <div className='flex items-center gap-1'>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className='rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40'
                aria-label='Previous page'
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className='rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40'
                aria-label='Next page'
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
