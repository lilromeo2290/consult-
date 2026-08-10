'use client';

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import {
  Search, Plus, ArrowLeft, Pencil, Trash2, ChevronLeft, ChevronRight,
  Save, HardHat, FileText, Building2, User, MapPin, CalendarDays,
  Phone, Mail, Hash, Ruler, Download, Upload, Eye, X,
  CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BuildingPermit {
  id: string;
  permitNumber: string;
  applicationDate: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string;
  applicantAddress: string;
  applicantIdType: string;
  applicantIdNumber: string;
  buildingType: string;
  buildingUse: string;
  numberOfFloors: string;
  totalFloorArea: string;
  buildingHeight: string;
  constructionType: string;
  plotNumber: string;
  streetName: string;
  locality: string;
  ghanaPostGPS: string;
  architectName: string;
  architectLicenseNo: string;
  structuralEngineerName: string;
  structuralEngineerLicenseNo: string;
  permitStatus: string;
  permitFee: string;
  inspectionDate: string;
  approvalDate: string;
  expiryDate: string;
  remarks: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'rms-building-permits';

const BUILDING_TYPES = [
  'Residential - Single Family', 'Residential - Multi-Family', 'Commercial',
  'Industrial', 'Institutional', 'Mixed Use', 'Agricultural', 'Temporary Structure',
];

const BUILDING_USES = [
  'Dwelling', 'Office', 'Retail/Shop', 'Warehouse', 'Factory', 'School',
  'Hospital/Clinic', 'Church/Mosque', 'Restaurant/Food', 'Hotel/Lodge', 'Storage', 'Other',
];

const CONSTRUCTION_TYPES = ['Block/Brick', 'Concrete', 'Timber/Wood', 'Steel Frame', 'Mixed', 'Other'];

const ID_TYPES = ["Ghana Card", "Voter's ID", 'Passport', "Driver's License"];

const STATUS_OPTIONS = ['Pending Review', 'Under Review', 'Approved', 'Rejected', 'Issued', 'Expired', 'Revoked'];

const STATUS_COLORS: Record<string, string> = {
  'Pending Review': 'bg-yellow-100 text-yellow-800',
  'Under Review': 'bg-blue-100 text-blue-800',
  'Approved': 'bg-emerald-100 text-emerald-800',
  'Rejected': 'bg-red-100 text-red-800',
  'Issued': 'bg-green-100 text-green-800',
  'Expired': 'bg-gray-100 text-gray-800',
  'Revoked': 'bg-orange-100 text-orange-800',
};

const EMPTY_FORM: BuildingPermit = {
  id: '', permitNumber: '', applicationDate: new Date().toISOString().split('T')[0],
  applicantName: '', applicantPhone: '', applicantEmail: '', applicantAddress: '',
  applicantIdType: '', applicantIdNumber: '', buildingType: '', buildingUse: '',
  numberOfFloors: '', totalFloorArea: '', buildingHeight: '', constructionType: '',
  plotNumber: '', streetName: '', locality: '', ghanaPostGPS: '',
  architectName: '', architectLicenseNo: '', structuralEngineerName: '',
  structuralEngineerLicenseNo: '', permitStatus: 'Pending Review', permitFee: '',
  inspectionDate: '', approvalDate: '', expiryDate: '', remarks: '',
};

function generatePermitNumber(existing: BuildingPermit[]): string {
  const year = new Date().getFullYear();
  const count = existing.length + 1;
  return `BP${year}-${String(count).padStart(4, '0')}`;
}

// ─── Shared Styles ───────────────────────────────────────────────────────────

const labelClass = 'text-sm font-medium text-foreground';
const inputClass = 'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const selectClass = 'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

// ─── Component ───────────────────────────────────────────────────────────────

export function BuildingPermitPage() {
  const [permits, setPermits] = useSyncedStorage<BuildingPermit[]>(STORAGE_KEY, []);
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BuildingPermit>(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const pageSize = 10;

  const filtered = useMemo(() => {
    let list = [...permits];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((p) =>
        p.permitNumber.toLowerCase().includes(q) || p.applicantName.toLowerCase().includes(q) ||
        p.buildingType.toLowerCase().includes(q) || p.plotNumber.toLowerCase().includes(q) ||
        p.locality.toLowerCase().includes(q)
      );
    }
    if (statusFilter) list = list.filter((p) => p.permitStatus === statusFilter);
    return list;
  }, [permits, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage]);

  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_FORM, applicationDate: new Date().toISOString().split('T')[0] });
    setEditingId(null);
  }, []);

  const openNewForm = useCallback(() => {
    resetForm();
    setForm((prev) => ({ ...prev, permitNumber: generatePermitNumber(permits) }));
    setView('form');
  }, [permits, resetForm]);

  const openEdit = useCallback((p: BuildingPermit) => { setForm({ ...p }); setEditingId(p.id); setView('form'); }, []);
  const openDetail = useCallback((p: BuildingPermit) => { setForm({ ...p }); setEditingId(p.id); setView('detail'); }, []);

  const handleSave = useCallback(() => {
    if (!form.applicantName.trim()) { toast.error('Applicant Name is required'); return; }
    if (!form.buildingType) { toast.error('Building Type is required'); return; }
    if (!form.plotNumber.trim()) { toast.error('Plot Number is required'); return; }
    if (editingId) {
      setPermits((prev) => prev.map((p) => (p.id === editingId ? { ...form } : p)));
      toast.success('Permit updated successfully');
    } else {
      setPermits((prev) => [...prev, { ...form, id: crypto.randomUUID() }]);
      toast.success('Permit created successfully');
    }
    resetForm(); setView('list');
  }, [form, editingId, setPermits, resetForm]);

  const handleDelete = useCallback((id: string) => {
    setPermits((prev) => prev.filter((p) => p.id !== id));
    setDeleteConfirm(null); toast.success('Permit deleted');
  }, [setPermits]);

  const handleExport = useCallback(() => {
    if (permits.length === 0) { toast.error('No data to export'); return; }
    const headers = Object.keys(EMPTY_FORM);
    const rows = permits.map((p) => headers.map((h) => `"${String(p[h as keyof BuildingPermit]).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'building_permits.csv'; a.click(); URL.revokeObjectURL(url);
    toast.success('Exported successfully');
  }, [permits]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim());
        if (lines.length < 2) { toast.error('File is empty'); return; }
        const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
        const imported: BuildingPermit[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g)?.map((v) => v.replace(/^"|"$/g, '').replace(/""/g, '"')) || [];
          const obj: Record<string, string> = {};
          headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });
          imported.push({ ...EMPTY_FORM, ...obj, id: crypto.randomUUID() } as BuildingPermit);
        }
        setPermits((prev) => [...prev, ...imported]);
        toast.success(`Imported ${imported.length} record(s)`);
      } catch { toast.error('Failed to parse CSV file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [setPermits]);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (view === 'detail') {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <button onClick={() => { resetForm(); setView('list'); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back to list
        </button>
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <HardHat className="text-primary" size={24} />
              <div>
                <h2 className="text-lg font-semibold">Permit {form.permitNumber}</h2>
                <span className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[form.permitStatus] || 'bg-gray-100 text-gray-800'}`}>
                  {form.permitStatus}
                </span>
              </div>
            </div>
            <button onClick={() => { setView('form'); }} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">
              <Pencil size={14} /> Edit
            </button>
          </div>
          <div className="p-6 space-y-6">
            {/* Applicant */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2"><User size={16} /> Applicant Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailField label="Name" value={form.applicantName} />
                <DetailField label="Phone" value={form.applicantPhone} />
                <DetailField label="Email" value={form.applicantEmail} />
                <DetailField label="Address" value={form.applicantAddress} />
                <DetailField label="ID Type" value={form.applicantIdType} />
                <DetailField label="ID Number" value={form.applicantIdNumber} />
              </div>
            </div>
            {/* Building */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2"><Building2 size={16} /> Building Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailField label="Building Type" value={form.buildingType} />
                <DetailField label="Use" value={form.buildingUse} />
                <DetailField label="Floors" value={form.numberOfFloors} />
                <DetailField label="Floor Area (sq.m)" value={form.totalFloorArea} />
                <DetailField label="Height (m)" value={form.buildingHeight} />
                <DetailField label="Construction Type" value={form.constructionType} />
              </div>
            </div>
            {/* Location */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2"><MapPin size={16} /> Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailField label="Plot Number" value={form.plotNumber} />
                <DetailField label="Street" value={form.streetName} />
                <DetailField label="Locality" value={form.locality} />
                <DetailField label="Ghana Post GPS" value={form.ghanaPostGPS} />
              </div>
            </div>
            {/* Professionals */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2"><CheckCircle2 size={16} /> Professionals</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailField label="Architect" value={form.architectName} />
                <DetailField label="Architect License #" value={form.architectLicenseNo} />
                <DetailField label="Structural Engineer" value={form.structuralEngineerName} />
                <DetailField label="Engineer License #" value={form.structuralEngineerLicenseNo} />
              </div>
            </div>
            {/* Permit Details */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2"><FileText size={16} /> Permit Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailField label="Application Date" value={form.applicationDate} />
                <DetailField label="Permit Fee (GH\u20a2)" value={form.permitFee} />
                <DetailField label="Inspection Date" value={form.inspectionDate} />
                <DetailField label="Approval Date" value={form.approvalDate} />
                <DetailField label="Expiry Date" value={form.expiryDate} />
              </div>
              {form.remarks && <DetailField label="Remarks" value={form.remarks} />}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'form') {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <button onClick={() => { resetForm(); setView('list'); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back to list
        </button>
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b px-6 py-4">
            <HardHat className="text-primary" size={24} />
            <h2 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Building Permit</h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Permit Info */}
            <FormSection title="Permit Information" icon={<Hash size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`${labelClass} block`}>Permit Number</label>
                  <input type="text" name="permitNumber" value={form.permitNumber} onChange={handleFormChange} className={inputClass} readOnly />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Application Date <span className="text-red-500">*</span></label>
                  <input type="date" name="applicationDate" value={form.applicationDate} onChange={handleFormChange} className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Status</label>
                  <select name="permitStatus" value={form.permitStatus} onChange={handleFormChange} className={selectClass}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </FormSection>

            {/* Applicant */}
            <FormSection title="Applicant Information" icon={<User size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`${labelClass} block`}>Full Name <span className="text-red-500">*</span></label>
                  <input type="text" name="applicantName" value={form.applicantName} onChange={handleFormChange} placeholder="Enter full name" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Phone</label>
                  <input type="tel" name="applicantPhone" value={form.applicantPhone} onChange={handleFormChange} placeholder="0XXX XXX XXX" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Email</label>
                  <input type="email" name="applicantEmail" value={form.applicantEmail} onChange={handleFormChange} placeholder="email@example.com" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Address</label>
                  <input type="text" name="applicantAddress" value={form.applicantAddress} onChange={handleFormChange} placeholder="Residential address" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>ID Type</label>
                  <select name="applicantIdType" value={form.applicantIdType} onChange={handleFormChange} className={selectClass}>
                    <option value="">Select ID type</option>
                    {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`${labelClass} block`}>ID Number</label>
                  <input type="text" name="applicantIdNumber" value={form.applicantIdNumber} onChange={handleFormChange} placeholder="Enter ID number" className={inputClass} />
                </div>
              </div>
            </FormSection>

            {/* Building */}
            <FormSection title="Building Information" icon={<Building2 size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`${labelClass} block`}>Building Type <span className="text-red-500">*</span></label>
                  <select name="buildingType" value={form.buildingType} onChange={handleFormChange} className={selectClass}>
                    <option value="">Select type</option>
                    {BUILDING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`${labelClass} block`}>Building Use</label>
                  <select name="buildingUse" value={form.buildingUse} onChange={handleFormChange} className={selectClass}>
                    <option value="">Select use</option>
                    {BUILDING_USES.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`${labelClass} block`}>Number of Floors</label>
                  <input type="number" name="numberOfFloors" value={form.numberOfFloors} onChange={handleFormChange} placeholder="e.g. 2" min="1" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Total Floor Area (sq.m)</label>
                  <input type="number" name="totalFloorArea" value={form.totalFloorArea} onChange={handleFormChange} placeholder="e.g. 250" min="0" step="0.01" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Building Height (m)</label>
                  <input type="number" name="buildingHeight" value={form.buildingHeight} onChange={handleFormChange} placeholder="e.g. 9.5" min="0" step="0.1" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Construction Type</label>
                  <select name="constructionType" value={form.constructionType} onChange={handleFormChange} className={selectClass}>
                    <option value="">Select type</option>
                    {CONSTRUCTION_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </FormSection>

            {/* Location */}
            <FormSection title="Location Information" icon={<MapPin size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`${labelClass} block`}>Plot Number <span className="text-red-500">*</span></label>
                  <input type="text" name="plotNumber" value={form.plotNumber} onChange={handleFormChange} placeholder="Enter plot number" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Street Name</label>
                  <input type="text" name="streetName" value={form.streetName} onChange={handleFormChange} placeholder="Enter street name" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Locality / Area</label>
                  <input type="text" name="locality" value={form.locality} onChange={handleFormChange} placeholder="e.g. Kpando Town" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Ghana Post GPS</label>
                  <input type="text" name="ghanaPostGPS" value={form.ghanaPostGPS} onChange={handleFormChange} placeholder="e.g. GT-000-0000" className={inputClass} />
                </div>
              </div>
            </FormSection>

            {/* Professionals */}
            <FormSection title="Professional Details" icon={<CheckCircle2 size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`${labelClass} block`}>Architect Name</label>
                  <input type="text" name="architectName" value={form.architectName} onChange={handleFormChange} placeholder="Enter architect name" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Architect License No.</label>
                  <input type="text" name="architectLicenseNo" value={form.architectLicenseNo} onChange={handleFormChange} placeholder="License number" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Structural Engineer Name</label>
                  <input type="text" name="structuralEngineerName" value={form.structuralEngineerName} onChange={handleFormChange} placeholder="Enter engineer name" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Engineer License No.</label>
                  <input type="text" name="structuralEngineerLicenseNo" value={form.structuralEngineerLicenseNo} onChange={handleFormChange} placeholder="License number" className={inputClass} />
                </div>
              </div>
            </FormSection>

            {/* Permit Dates & Fee */}
            <FormSection title="Permit Schedule & Fees" icon={<CalendarDays size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`${labelClass} block`}>Permit Fee (GH\u20a2)</label>
                  <input type="number" name="permitFee" value={form.permitFee} onChange={handleFormChange} placeholder="0.00" min="0" step="0.01" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Inspection Date</label>
                  <input type="date" name="inspectionDate" value={form.inspectionDate} onChange={handleFormChange} className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Approval Date</label>
                  <input type="date" name="approvalDate" value={form.approvalDate} onChange={handleFormChange} className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Expiry Date</label>
                  <input type="date" name="expiryDate" value={form.expiryDate} onChange={handleFormChange} className={inputClass} />
                </div>
              </div>
              <div className="mt-4">
                <label className={`${labelClass} block`}>Remarks</label>
                <textarea name="remarks" value={form.remarks} onChange={handleFormChange} rows={3} placeholder="Additional notes..." className={inputClass} />
              </div>
            </FormSection>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => { resetForm(); setView('list'); }} className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <Save size={16} /> {editingId ? 'Update Permit' : 'Save Permit'}
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
      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <HardHat className="text-primary" size={24} />
          <h2 className="text-lg font-semibold">Building Permits</h2>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{permits.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors">
            <Upload size={14} /> Import
            <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
          </label>
          <button onClick={handleExport} className="flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors">
            <Download size={14} /> Export
          </button>
          <button onClick={openNewForm} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus size={14} /> New Permit
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="Search by permit #, applicant, plot..." className={`${inputClass} pl-9`} />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className={`${selectClass} w-full sm:w-44`}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Permit #</th>
              <th className="px-4 py-3 text-left font-medium">Applicant</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Building Type</th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Plot #</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Date</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No building permits found</td></tr>
            )}
            {paginated.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{p.permitNumber}</td>
                <td className="px-4 py-3">{p.applicantName || '—'}</td>
                <td className="px-4 py-3 hidden md:table-cell">{p.buildingType || '—'}</td>
                <td className="px-4 py-3 hidden lg:table-cell">{p.plotNumber || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[p.permitStatus] || 'bg-gray-100 text-gray-800'}`}>
                    {p.permitStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{p.applicationDate || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openDetail(p)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="View">
                      <Eye size={15} />
                    </button>
                    <button onClick={() => openEdit(p)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Edit">
                      <Pencil size={15} />
                    </button>
                    {deleteConfirm === p.id ? (
                      <button onClick={() => handleDelete(p.id)} className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">Confirm</button>
                    ) : (
                      <button onClick={() => setDeleteConfirm(p.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete">
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
          <span className="text-muted-foreground">Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</span>
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

function FormSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-primary flex items-center gap-2">{icon} {title}</h3>
      {children}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value || '—'}</p>
    </div>
  );
}
