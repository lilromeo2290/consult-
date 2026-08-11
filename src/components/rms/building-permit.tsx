'use client';

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import {
  Search, Plus, ArrowLeft, Pencil, Trash2, ChevronLeft, ChevronRight,
  Save, HardHat, FileText, User, MapPin, CalendarDays,
  Download, Upload, Eye, ClipboardCheck, Building2, Users, Check, Square,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BuildingPermit {
  id: string;
  permitNumber: string;
  applicationDate: string;
  // 1. Applicant Information
  applicantFullName: string;
  postalAddress: string;
  residentialAddress: string;
  telephoneNumber: string;
  emailAddress: string;
  nationalIdNumber: string;
  // 2. Property Information
  plotNumber: string;
  blockNumber: string;
  siteLocation: string;
  streetName: string;
  gpsAddress: string;
  landSize: string;
  landOwnershipStatus: string;
  // 3. Development Details
  typeOfDevelopment: string;
  natureOfApplication: string;
  numberOfFloors: string;
  totalFloorArea: string;
  estimatedCost: string;
  // 4. Professional Consultants
  architectName: string;
  architectRegNumber: string;
  architectTelephone: string;
  structuralEngName: string;
  structuralEngRegNumber: string;
  structuralEngTelephone: string;
  quantitySurveyorName: string;
  quantitySurveyorTelephone: string;
  // 5. Documents Checklist
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
  // Admin
  permitStatus: string;
  remarks: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'rms-building-permits';

const DEVELOPMENT_TYPES = ['Residential', 'Commercial', 'Industrial', 'Institutional', 'Mixed Use'];
const NATURE_OF_APPLICATION = ['New Building', 'Extension', 'Renovation', 'Change of Use', 'Demolition'];
const LAND_OWNERSHIP = ['Freehold', 'Leasehold', 'Stool Land', 'Family Land', 'State Land'];
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

const DOCUMENTS_CHECKLIST = [
  { key: 'docSitePlan', label: 'Certified Site Plan' },
  { key: 'docLandTitle', label: 'Land Title Certificate / Indenture' },
  { key: 'docStructuralDrawings', label: 'Structural Drawings' },
  { key: 'docArchitecturalDrawings', label: 'Architectural Drawings' },
  { key: 'docStructuralReport', label: 'Structural Integrity Report (where applicable)' },
  { key: 'docFireServiceReport', label: 'Fire Service Report' },
  { key: 'docEnvironmentalPermit', label: 'Environmental Permit (where applicable)' },
  { key: 'docPropertyRateClearance', label: 'Property Rate Clearance' },
  { key: 'docDevelopmentLevy', label: 'Development Levy Receipt' },
  { key: 'docPassportPhoto', label: 'Passport Photograph' },
] as const;

const EMPTY_FORM: BuildingPermit = {
  id: '',
  permitNumber: '',
  applicationDate: new Date().toISOString().split('T')[0],
  applicantFullName: '', postalAddress: '', residentialAddress: '',
  telephoneNumber: '', emailAddress: '', nationalIdNumber: '',
  plotNumber: '', blockNumber: '', siteLocation: '',
  streetName: '', gpsAddress: '', landSize: '', landOwnershipStatus: '',
  typeOfDevelopment: '', natureOfApplication: '',
  numberOfFloors: '', totalFloorArea: '', estimatedCost: '',
  architectName: '', architectRegNumber: '', architectTelephone: '',
  structuralEngName: '', structuralEngRegNumber: '', structuralEngTelephone: '',
  quantitySurveyorName: '', quantitySurveyorTelephone: '',
  docSitePlan: false, docLandTitle: false, docStructuralDrawings: false,
  docArchitecturalDrawings: false, docStructuralReport: false,
  docFireServiceReport: false, docEnvironmentalPermit: false,
  docPropertyRateClearance: false, docDevelopmentLevy: false, docPassportPhoto: false,
  permitStatus: 'Pending Review',
  remarks: '',
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
        p.permitNumber.toLowerCase().includes(q) ||
        p.applicantFullName.toLowerCase().includes(q) ||
        p.typeOfDevelopment.toLowerCase().includes(q) ||
        p.plotNumber.toLowerCase().includes(q) ||
        p.siteLocation.toLowerCase().includes(q)
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

  const handleCheckChange = useCallback((key: keyof BuildingPermit) => {
    setForm((prev) => ({ ...prev, [key]: !prev[key] }));
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
    if (!form.applicantFullName.trim()) { toast.error('Applicant Full Name is required'); return; }
    if (!form.plotNumber.trim()) { toast.error('Plot Number is required'); return; }
    if (!form.typeOfDevelopment) { toast.error('Type of Development is required'); return; }
    if (!form.natureOfApplication) { toast.error('Nature of Application is required'); return; }
    if (editingId) {
      setPermits((prev) => prev.map((p) => (p.id === editingId ? { ...form } : p)));
      toast.success('Permit updated successfully');
    } else {
      setPermits((prev) => [...prev, { ...form, id: crypto.randomUUID() }]);
      toast.success('Permit application submitted successfully');
    }
    resetForm(); setView('list');
  }, [form, editingId, setPermits, resetForm]);

  const handleDelete = useCallback((id: string) => {
    setPermits((prev) => prev.filter((p) => p.id !== id));
    setDeleteConfirm(null); toast.success('Permit deleted');
  }, [setPermits]);

  const handleExport = useCallback(() => {
    if (permits.length === 0) { toast.error('No data to export'); return; }
    const skip = ['id'];
    const headers = Object.keys(EMPTY_FORM).filter((k) => !skip.includes(k));
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

  // Count checked documents
  const checkedDocs = useMemo(
    () => DOCUMENTS_CHECKLIST.filter((d) => form[d.key as keyof BuildingPermit] as boolean).length,
    [form]
  );

  // ─── Detail View ──────────────────────────────────────────────────────

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
            <DetailSection title="1. Applicant Information" icon={<User size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailField label="Full Name" value={form.applicantFullName} />
                <DetailField label="Telephone" value={form.telephoneNumber} />
                <DetailField label="Email Address" value={form.emailAddress} />
                <DetailField label="National ID Number" value={form.nationalIdNumber} />
                <DetailField label="Postal Address" value={form.postalAddress} />
                <DetailField label="Residential Address" value={form.residentialAddress} />
              </div>
            </DetailSection>
            {/* Property */}
            <DetailSection title="2. Property Information" icon={<MapPin size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailField label="Plot Number" value={form.plotNumber} />
                <DetailField label="Block Number" value={form.blockNumber} />
                <DetailField label="Site Location / Community" value={form.siteLocation} />
                <DetailField label="Street Name" value={form.streetName} />
                <DetailField label="GPS Address" value={form.gpsAddress} />
                <DetailField label="Land Size" value={form.landSize} />
                <DetailField label="Land Ownership Status" value={form.landOwnershipStatus} />
              </div>
            </DetailSection>
            {/* Development */}
            <DetailSection title="3. Development Details" icon={<Building2 size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailField label="Type of Development" value={form.typeOfDevelopment} />
                <DetailField label="Nature of Application" value={form.natureOfApplication} />
                <DetailField label="Number of Floors" value={form.numberOfFloors} />
                <DetailField label="Total Floor Area (m\u00b2)" value={form.totalFloorArea} />
                <DetailField label="Estimated Cost" value={form.estimatedCost} />
              </div>
            </DetailSection>
            {/* Professionals */}
            <DetailSection title="4. Professional Consultants" icon={<Users size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DetailField label="Architect" value={form.architectName} />
                <DetailField label="Reg. Number" value={form.architectRegNumber} />
                <DetailField label="Telephone" value={form.architectTelephone} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <DetailField label="Structural Engineer" value={form.structuralEngName} />
                <DetailField label="Reg. Number" value={form.structuralEngRegNumber} />
                <DetailField label="Telephone" value={form.structuralEngTelephone} />
              </div>
              {(form.quantitySurveyorName || form.quantitySurveyorTelephone) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <DetailField label="Quantity Surveyor" value={form.quantitySurveyorName} />
                  <DetailField label="Telephone" value={form.quantitySurveyorTelephone} />
                </div>
              )}
            </DetailSection>
            {/* Documents */}
            <DetailSection title="5. Required Documents" icon={<ClipboardCheck size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {DOCUMENTS_CHECKLIST.map((d) => (
                  <div key={d.key} className="flex items-center gap-2 text-sm">
                    {form[d.key as keyof BuildingPermit] ? (
                      <Check size={16} className="text-green-600 shrink-0" />
                    ) : (
                      <Square size={16} className="text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={form[d.key as keyof BuildingPermit] ? 'text-foreground' : 'text-muted-foreground'}>{d.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{checkedDocs} of {DOCUMENTS_CHECKLIST.length} documents submitted</p>
            </DetailSection>
            {form.remarks && (
              <div>
                <h3 className="text-sm font-semibold text-primary mb-2">Remarks</h3>
                <p className="text-sm whitespace-pre-wrap">{form.remarks}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Form View ────────────────────────────────────────────────────────

  if (view === 'form') {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <button onClick={() => { resetForm(); setView('list'); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back to list
        </button>
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b px-6 py-4">
            <HardHat className="text-primary" size={24} />
            <div>
              <h2 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Building Permit Application</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Kpando Municipal Assembly</p>
            </div>
          </div>
          <div className="p-6 space-y-8">
            {/* Permit Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={`${labelClass} block`}>Permit Number</label>
                <input type="text" name="permitNumber" value={form.permitNumber} onChange={handleFormChange} className={inputClass} readOnly />
              </div>
              <div>
                <label className={`${labelClass} block`}>Application Date</label>
                <input type="date" name="applicationDate" value={form.applicationDate} onChange={handleFormChange} className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} block`}>Status</label>
                <select name="permitStatus" value={form.permitStatus} onChange={handleFormChange} className={selectClass}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* 1. Applicant Information */}
            <FormSection title="1. Applicant Information" icon={<User size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`${labelClass} block`}>Full Name of Applicant <span className="text-red-500">*</span></label>
                  <input type="text" name="applicantFullName" value={form.applicantFullName} onChange={handleFormChange} placeholder="Enter full name" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Telephone Number <span className="text-red-500">*</span></label>
                  <input type="tel" name="telephoneNumber" value={form.telephoneNumber} onChange={handleFormChange} placeholder="0XXX XXX XXX" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Email Address</label>
                  <input type="email" name="emailAddress" value={form.emailAddress} onChange={handleFormChange} placeholder="email@example.com" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>National ID Number <span className="text-xs text-muted-foreground">(Optional)</span></label>
                  <input type="text" name="nationalIdNumber" value={form.nationalIdNumber} onChange={handleFormChange} placeholder="Ghana Card / Voter's ID" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Postal Address</label>
                  <input type="text" name="postalAddress" value={form.postalAddress} onChange={handleFormChange} placeholder="P.O. Box ..." className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Residential Address</label>
                  <input type="text" name="residentialAddress" value={form.residentialAddress} onChange={handleFormChange} placeholder="House No., Street, Town" className={inputClass} />
                </div>
              </div>
            </FormSection>

            {/* 2. Property Information */}
            <FormSection title="2. Property Information" icon={<MapPin size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`${labelClass} block`}>Plot Number <span className="text-red-500">*</span></label>
                  <input type="text" name="plotNumber" value={form.plotNumber} onChange={handleFormChange} placeholder="Enter plot number" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Block Number</label>
                  <input type="text" name="blockNumber" value={form.blockNumber} onChange={handleFormChange} placeholder="Enter block number" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Site Location / Community</label>
                  <input type="text" name="siteLocation" value={form.siteLocation} onChange={handleFormChange} placeholder="e.g. Kpando Town" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Street Name</label>
                  <input type="text" name="streetName" value={form.streetName} onChange={handleFormChange} placeholder="Enter street name" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>GPS Address</label>
                  <input type="text" name="gpsAddress" value={form.gpsAddress} onChange={handleFormChange} placeholder="e.g. GT-000-0000" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Land Size</label>
                  <input type="text" name="landSize" value={form.landSize} onChange={handleFormChange} placeholder="e.g. 100 x 80 ft" className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className={`${labelClass} block`}>Land Ownership Status</label>
                  <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {LAND_OWNERSHIP.map((opt) => (
                      <label key={opt} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${form.landOwnershipStatus === opt ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-input hover:bg-accent'}`}>
                        <input type="radio" name="landOwnershipStatus" value={opt} checked={form.landOwnershipStatus === opt} onChange={handleFormChange} className="accent-primary" />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </FormSection>

            {/* 3. Development Details */}
            <FormSection title="3. Development Details" icon={<Building2 size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`${labelClass} block`}>Type of Development <span className="text-red-500">*</span></label>
                  <select name="typeOfDevelopment" value={form.typeOfDevelopment} onChange={handleFormChange} className={selectClass}>
                    <option value="">Select type</option>
                    {DEVELOPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`${labelClass} block`}>Nature of Application <span className="text-red-500">*</span></label>
                  <select name="natureOfApplication" value={form.natureOfApplication} onChange={handleFormChange} className={selectClass}>
                    <option value="">Select nature</option>
                    {NATURE_OF_APPLICATION.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`${labelClass} block`}>Number of Floors</label>
                  <input type="number" name="numberOfFloors" value={form.numberOfFloors} onChange={handleFormChange} placeholder="e.g. 2" min="1" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block`}>Total Floor Area (m\u00b2)</label>
                  <input type="number" name="totalFloorArea" value={form.totalFloorArea} onChange={handleFormChange} placeholder="e.g. 250" min="0" step="0.01" className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className={`${labelClass} block`}>Estimated Cost of Development (GH\u20a2)</label>
                  <input type="number" name="estimatedCost" value={form.estimatedCost} onChange={handleFormChange} placeholder="0.00" min="0" step="0.01" className={inputClass} />
                </div>
              </div>
            </FormSection>

            {/* 4. Professional Consultants */}
            <FormSection title="4. Professional Consultants" icon={<Users size={16} />}>
              <div className="space-y-6">
                {/* Architect */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-3">Architect</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`${labelClass} block`}>Name</label>
                      <input type="text" name="architectName" value={form.architectName} onChange={handleFormChange} placeholder="Enter name" className={inputClass} />
                    </div>
                    <div>
                      <label className={`${labelClass} block`}>Registration Number</label>
                      <input type="text" name="architectRegNumber" value={form.architectRegNumber} onChange={handleFormChange} placeholder="Reg. number" className={inputClass} />
                    </div>
                    <div>
                      <label className={`${labelClass} block`}>Telephone</label>
                      <input type="tel" name="architectTelephone" value={form.architectTelephone} onChange={handleFormChange} placeholder="0XXX XXX XXX" className={inputClass} />
                    </div>
                  </div>
                </div>
                {/* Structural Engineer */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-3">Structural Engineer</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`${labelClass} block`}>Name</label>
                      <input type="text" name="structuralEngName" value={form.structuralEngName} onChange={handleFormChange} placeholder="Enter name" className={inputClass} />
                    </div>
                    <div>
                      <label className={`${labelClass} block`}>Registration Number</label>
                      <input type="text" name="structuralEngRegNumber" value={form.structuralEngRegNumber} onChange={handleFormChange} placeholder="Reg. number" className={inputClass} />
                    </div>
                    <div>
                      <label className={`${labelClass} block`}>Telephone</label>
                      <input type="tel" name="structuralEngTelephone" value={form.structuralEngTelephone} onChange={handleFormChange} placeholder="0XXX XXX XXX" className={inputClass} />
                    </div>
                  </div>
                </div>
                {/* Quantity Surveyor (Optional) */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-3">Quantity Surveyor <span className="text-xs text-muted-foreground font-normal">(Optional)</span></p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`${labelClass} block`}>Name</label>
                      <input type="text" name="quantitySurveyorName" value={form.quantitySurveyorName} onChange={handleFormChange} placeholder="Enter name" className={inputClass} />
                    </div>
                    <div>
                      <label className={`${labelClass} block`}>Telephone</label>
                      <input type="tel" name="quantitySurveyorTelephone" value={form.quantitySurveyorTelephone} onChange={handleFormChange} placeholder="0XXX XXX XXX" className={inputClass} />
                    </div>
                  </div>
                </div>
              </div>
            </FormSection>

            {/* 5. Required Documents Checklist */}
            <FormSection title="5. Required Documents Checklist" icon={<ClipboardCheck size={16} />}>
              <p className="text-xs text-muted-foreground mb-3">Tick all documents submitted with this application ({checkedDocs}/{DOCUMENTS_CHECKLIST.length})</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {DOCUMENTS_CHECKLIST.map((d) => (
                  <label key={d.key} className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm cursor-pointer transition-colors ${form[d.key as keyof BuildingPermit] ? 'border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800' : 'border-input hover:bg-accent'}`}>
                    <input
                      type="checkbox"
                      checked={form[d.key as keyof BuildingPermit] as boolean}
                      onChange={() => handleCheckChange(d.key)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <span className={form[d.key as keyof BuildingPermit] ? 'text-green-700 dark:text-green-400' : ''}>{d.label}</span>
                  </label>
                ))}
              </div>
            </FormSection>

            {/* Remarks */}
            <div>
              <label className={`${labelClass} block`}>Remarks / Notes</label>
              <textarea name="remarks" value={form.remarks} onChange={handleFormChange} rows={3} placeholder="Additional notes..." className={inputClass} />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => { resetForm(); setView('list'); }} className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <Save size={16} /> {editingId ? 'Update Application' : 'Submit Application'}
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
            <Plus size={14} /> New Application
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="Search by permit #, applicant, plot, location..." className={`${inputClass} pl-9`} />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className={`${selectClass} w-full sm:w-44`}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Permit #</th>
              <th className="px-4 py-3 text-left font-medium">Applicant</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Plot #</th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Development</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Date</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No building permit applications found</td></tr>
            )}
            {paginated.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{p.permitNumber}</td>
                <td className="px-4 py-3">{p.applicantFullName || '\u2014'}</td>
                <td className="px-4 py-3 hidden md:table-cell">{p.plotNumber || '\u2014'}</td>
                <td className="px-4 py-3 hidden lg:table-cell">{p.typeOfDevelopment || '\u2014'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[p.permitStatus] || 'bg-gray-100 text-gray-800'}`}>
                    {p.permitStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{p.applicationDate || '\u2014'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openDetail(p)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="View"><Eye size={15} /></button>
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-primary flex items-center gap-2 border-b border-border pb-2">{icon} {title}</h3>
      {children}
    </div>
  );
}

function DetailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-primary flex items-center gap-2 border-b border-border pb-2">{icon} {title}</h3>
      {children}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value || '\u2014'}</p>
    </div>
  );
}
