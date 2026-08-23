'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Gavel,
  X,
  Download,
  Upload,
  AlertTriangle,
  User,
  FileText,
  Camera,
} from 'lucide-react';
import {
  FINE_CODE_TO_CLASS,
  FINE_CODE_TO_CATEGORY,
  FINE_CLASS_TO_CODES,
  FINE_CLASS_CODES,
  FINE_CLASS_NAMES,
} from '@/lib/fines-class-code-map';
import { Combobox } from '@/components/ui/combobox';
import { useSyncedStorage } from '@/hooks/use-synced-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Fine {
  id: string;
  fineNumber: string;
  fineDate: string;
  dueDate: string;
  section: string;
  code: string;
  fineClass: string;
  category: string;
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
  fineRevenueCode: string;
  fineRevenueClass: string;
  fineRevenueCategory: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SECTIONS = [
  'Building Offences',
  'Environmental Health/Safety/ Sanitation Offences',
  'Impounding Stray Animals',
  'Miscellaneous Offences',
  'Retrieval Of Seized Tools/Machinery (For Various Offences)',
  'Traffic Offences',
  'Unauthorised Diversion',
  'Illegal/Un-licenced Activities',
];

const STATUS_OPTIONS = ['Pending', 'Paid', 'Overdue', 'Waived', 'Appealed'];

// Section → Fine Class mapping (built from the code structure)
const FINE_SECTION_TO_CLASSES: Record<string, string[]> = {
  'Building Offences': [
    'Penalty for development without permit',
    'Occupying Newly Completed Developments without Occupation Permit',
    'Penalty For Unauthorised Placements',
    'Penalty for Redevelopment/Renovation without permit',
    'Penalty for redevelopment in unauthorised places',
    "Penalty for Violating 'Stop-Work' Order",
    'Installation of Radio/TV/Internet/Communication Mast & Ott',
  ],
  'Environmental Health/Safety/ Sanitation Offences': [
    'Defecating at unauthorized places',
    'Urinating at unauthorized places',
    'Selling at unauthorized places',
    'Indiscriminate disposal/burning of refuse',
    'Unpaid Fees for Refuse Collection Services',
    'Weedy grounds',
    'Refusal to Re-plant Tree (after property development)',
    'Refusal to pay for Environmental Health Permit',
    'Refusal to comply with abatement',
    'Excessive Noise Making',
    'Cutting of trees without permit',
  ],
  'Impounding Stray Animals': [
    'Collection - Sheep/Goat/Pigs/Dogs',
    'Collection - Donkey/Horse/Cow',
    'Feeding - Sheep/Goats',
    'Feeding - Pigs',
    'Feeding - Dogs',
    'Feeding - Donkey/Horse/Cow',
  ],
  'Miscellaneous Offences': [
    'Removal/Missing Property number plate',
    'Removal/Destruction/Defacing of Street Name Signage',
    'Destruction of Street Light Poles/Other road furniture',
    'Posting of bills at unauthorized places',
    'Failure to pay BOP/Rate/Rent',
    'Penalty for bounced cheques',
    'Transfer of stalls/stores without Assembly approval',
  ],
  'Retrieval Of Seized Tools/Machinery (For Various Offences)': [
    'Retrieval Of Seized Tools/Machinery (For Various Offences)',
  ],
  'Traffic Offences': [
    'Parking/Stopping/Waiting/Loading/Off-loading/Moving/Turning',
    'Riding bicycle and motorbike in the market',
    'Riding bicycle and motorbike on pedestrian walkways',
    'Clamping Charges (Obstruction/No Parking)',
    'Towing Charges',
    'Impounded Vehicle',
    'Refusal to obtain vehicle sticker',
    'Refusal to emboss sticker',
    'Refusal to acquire Taxi Driver Licence',
  ],
  'Unauthorised Diversion': [
    'Diversion of river/stream course',
    'Diversion of drains',
    'Channelling of sewage waste into drains',
  ],
  'Illegal/Un-licenced Activities': [
    'Illegal/Un-licenced Activities',
  ],
};

const inputClass =
  'w-full h-[42px] px-3 text-sm border border-slate-300 dark:border-slate-500 rounded-lg bg-card text-foreground dark:text-slate-100 placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors';
const labelClass =
  'text-xs font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider mb-1.5';

const ITEMS_PER_PAGE = 10;

// ─── Helper Functions ────────────────────────────────────────────────────────

const statusColor = (s: string) => {
  switch (s) {
    case 'Paid':
      return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary';
    case 'Pending':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'Overdue':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'Waived':
      return 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground';
    case 'Appealed':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground';
  }
};

const emptyFine = (): Fine => ({
  id: '',
  fineNumber: '',
  fineDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  section: '',
  code: '',
  fineClass: '',
  category: '',
  fineAmount: '',
  description: '',
  offenderName: '',
  businessName: '',
  businessNumber: '',
  propertyNumber: '',
  phoneNumber: '',
  address: '',
  violationDate: '',
  violationTime: '',
  violationLocation: '',
  violationDetails: '',
  evidenceFileName: '',
  status: 'Pending',
  fineRevenueCode: '',
  fineRevenueClass: '',
  fineRevenueCategory: '',
});

function generateFineNumber(existingFines: Fine[]): string {
  const year = new Date().getFullYear();
  const prefix = `KpMA/FIN/${year}/`;
  let maxNum = 0;
  for (const f of existingFines) {
    if (f.fineNumber.startsWith(prefix)) {
      const numStr = f.fineNumber.slice(prefix.length);
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PenaltiesPage() {
  const [fines, setFines] = useSyncedStorage<Fine[]>('rms-fines', []);
  const [finesRates, setFinesRates] = useState<Record<string, number>>({});
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Fine>(emptyFine());
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Load fines rate overrides on mount ────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/rms-data?key=rms-rate-overrides-fines');
        if (!res.ok) return;
        const json = await res.json();
        if (json.data && typeof json.data === 'object') {
          const rates: Record<string, number> = {};
          for (const [code, entry] of Object.entries(json.data)) {
            if (entry && typeof (entry as Record<string, unknown>).amount === 'number') {
              rates[code] = (entry as Record<string, unknown>).amount as number;
            }
          }
          setFinesRates(rates);
        }
      } catch (err) {
        console.error('Failed to load fines rate overrides:', err);
      }
    })();
  }, []);

  // ─── Cascade logic: Section → Class → Code → Category ──────────────────────
  const sectionClasses = form.section
    ? FINE_SECTION_TO_CLASSES[form.section] || []
    : FINE_CLASS_NAMES;
  const validClassSet = new Set(sectionClasses);
  const filteredClass =
    form.fineClass && validClassSet.has(form.fineClass) ? form.fineClass : '';
  const fineClassCodes = filteredClass
    ? FINE_CLASS_TO_CODES[filteredClass] || []
    : form.section
      ? []
      : FINE_CLASS_CODES;
  const fineClassCategories = fineClassCodes
    .map((c) => FINE_CODE_TO_CATEGORY[c])
    .filter(Boolean);

  // ─── Form change handler ──────────────────────────────────────────────────
  const handleFormChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;

      if (name === 'section') {
        setForm((prev) => ({
          ...prev,
          section: value,
          fineClass: '',
          code: '',
          category: '',
        }));
      } else if (name === 'code') {
        const cls = FINE_CODE_TO_CLASS[value] || '';
        const cat = FINE_CODE_TO_CATEGORY[value] || '';
        const rateAmount = finesRates[value];
        if (rateAmount !== undefined && rateAmount > 0) {
          setForm((prev) => ({
            ...prev,
            code: value,
            fineClass: cls,
            category: cat,
            fineAmount: String(rateAmount),
          }));
        } else {
          setForm((prev) => ({
            ...prev,
            code: value,
            fineClass: cls,
            category: cat,
          }));
        }
      } else if (name === 'fineClass') {
        const codes = FINE_CLASS_TO_CODES[value] || [];
        const firstCode = codes[0] || '';
        const firstCat = firstCode ? FINE_CODE_TO_CATEGORY[firstCode] || '' : '';
        const rateAmount = finesRates[firstCode];
        if (rateAmount !== undefined && rateAmount > 0) {
          setForm((prev) => ({
            ...prev,
            fineClass: value,
            code: firstCode,
            category: firstCat,
            fineAmount: String(rateAmount),
          }));
        } else {
          setForm((prev) => ({
            ...prev,
            fineClass: value,
            code: firstCode,
            category: firstCat,
          }));
        }
      } else if (name === 'category') {
        // Find a code in the current class that matches this category
        const codes = FINE_CLASS_TO_CODES[form.fineClass] || [];
        const matchingCode = codes.find(
          (c) => FINE_CODE_TO_CATEGORY[c] === value,
        );
        if (matchingCode) {
          const rateAmount = finesRates[matchingCode];
          if (rateAmount !== undefined && rateAmount > 0) {
            setForm((prev) => ({
              ...prev,
              category: value,
              code: matchingCode,
              fineAmount: String(rateAmount),
            }));
          } else {
            setForm((prev) => ({
              ...prev,
              category: value,
              code: matchingCode,
            }));
          }
        } else {
          setForm((prev) => ({ ...prev, category: value }));
        }
      } else {
        setForm((prev) => ({ ...prev, [name]: value }));
      }
    },
    [finesRates, form.fineClass],
  );

  // ─── Navigation helpers ──────────────────────────────────────────────────
  const openNew = useCallback(() => {
    const newFine = emptyFine();
    newFine.fineNumber = generateFineNumber(fines);
    setForm(newFine);
    setEditingId(null);
    setView('form');
  }, [fines]);

  const openEdit = useCallback((fine: Fine) => {
    setForm({ ...fine });
    setEditingId(fine.id);
    setView('form');
  }, []);

  const handleSave = useCallback(() => {
    if (!form.offenderName.trim()) {
      toast.error('Offender Name is required');
      return;
    }
    if (!form.section) {
      toast.error('Section is required');
      return;
    }
    if (!form.fineClass) {
      toast.error('Fine Class is required');
      return;
    }
    if (!form.fineAmount) {
      toast.error('Fine Amount is required');
      return;
    }
    if (!form.fineDate) {
      toast.error('Fine Date is required');
      return;
    }

    if (editingId) {
      setFines((prev) =>
        prev.map((f) => (f.id === editingId ? { ...form, id: editingId } : f)),
      );
      toast.success('Fine updated successfully');
    } else {
      const newId = `fine_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      setFines((prev) => [...prev, { ...form, id: newId }]);
      toast.success('Fine created successfully');
    }
    setView('list');
    setEditingId(null);
  }, [form, editingId, setFines]);

  const handleDelete = useCallback(
    (id: string) => {
      if (confirmDelete === id) {
        setFines((prev) => prev.filter((f) => f.id !== id));
        toast.success('Fine deleted successfully');
        setConfirmDelete(null);
      } else {
        setConfirmDelete(id);
        setTimeout(() => setConfirmDelete(null), 3000);
      }
    },
    [confirmDelete, setFines],
  );

  // ─── Filtering & pagination ───────────────────────────────────────────────
  const filtered = (() => {
    const q = search.toLowerCase();
    return fines.filter((f) => {
      const matchesSearch =
        !q ||
        f.fineNumber.toLowerCase().includes(q) ||
        f.offenderName.toLowerCase().includes(q) ||
        f.section.toLowerCase().includes(q) ||
        f.code.toLowerCase().includes(q) ||
        f.fineClass.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.businessName.toLowerCase().includes(q) ||
        f.violationLocation.toLowerCase().includes(q);
      const matchesSection = !sectionFilter || f.section === sectionFilter;
      const matchesStatus = !statusFilter || f.status === statusFilter;
      return matchesSearch && matchesSection && matchesStatus;
    });
  })();

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedFines = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  // Reset page when filters change (handled inline in handlers)

  // ─── CSV Export ────────────────────────────────────────────────────────────
  function exportCSV() {
    const headers = [
      'Fine Number',
      'Fine Date',
      'Due Date',
      'Section',
      'Code',
      'Class',
      'Category',
      'Amount',
      'Description',
      'Offender Name',
      'Business Name',
      'Business Number',
      'Property Number',
      'Phone',
      'Address',
      'Violation Date',
      'Violation Time',
      'Violation Location',
      'Violation Details',
      'Status',
    ];

    const rows = filtered.map((f) => [
      f.fineNumber,
      f.fineDate,
      f.dueDate,
      f.section,
      f.code,
      f.fineClass,
      f.category,
      f.fineAmount,
      f.description,
      f.offenderName,
      f.businessName,
      f.businessNumber,
      f.propertyNumber,
      f.phoneNumber,
      f.address,
      f.violationDate,
      f.violationTime,
      f.violationLocation,
      f.violationDetails,
      f.status,
    ]);

    const escapeCSV = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map((cell) => escapeCSV(cell || '')).join(',')),
    ].join('\n');

    const today = new Date().toISOString().split('T')[0];
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Fines_${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} fines to CSV`);
  }

  // ─── CSV Import ────────────────────────────────────────────────────────────
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string;
          const lines = text.split('\n').filter((l) => l.trim());
          if (lines.length < 2) {
            toast.error('CSV file appears to be empty');
            return;
          }

          // Parse header row
          const headerLine = lines[0];
          const headers = parseCSVLine(headerLine);

          const fieldMap: Record<string, keyof Fine> = {
            'fine number': 'fineNumber',
            'fine date': 'fineDate',
            'due date': 'dueDate',
            section: 'section',
            code: 'code',
            class: 'fineClass',
            category: 'category',
            amount: 'fineAmount',
            description: 'description',
            'offender name': 'offenderName',
            'business name': 'businessName',
            'business number': 'businessNumber',
            'property number': 'propertyNumber',
            phone: 'phoneNumber',
            address: 'address',
            'violation date': 'violationDate',
            'violation time': 'violationTime',
            'violation location': 'violationLocation',
            'violation details': 'violationDetails',
            status: 'status',
          };

          const imported: Fine[] = [];
          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            const fine = emptyFine();
            fine.id = `fine_import_${Date.now()}_${i}`;
            fine.fineNumber = generateFineNumber([...fines, ...imported]);
            fine.status = fine.status || 'Pending';

            for (let j = 0; j < headers.length && j < values.length; j++) {
              const headerKey = headers[j].toLowerCase().trim();
              const field = fieldMap[headerKey];
              if (field) {
                (fine as Record<string, string>)[field] = values[j];
              }
            }
            imported.push(fine);
          }

          if (imported.length > 0) {
            setFines((prev) => [...prev, ...imported]);
            toast.success(`Imported ${imported.length} fines successfully`);
          } else {
            toast.error('No valid fines found in the CSV file');
          }
        } catch (err) {
          console.error('Import error:', err);
          toast.error('Failed to parse CSV file');
        }
      };
      reader.readAsText(file);
      // Reset file input so same file can be re-imported
      e.target.value = '';
    },
    [fines, setFines],
  );

  // ─── Render: LIST VIEW ────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Fines Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Record and manage offence fines, penalties, and violations
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-destructive text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Fine
            </button>
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 px-3 py-2.5 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-card dark:hover:bg-muted transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={handleImportClick}
              className="inline-flex items-center gap-2 px-3 py-2.5 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-card dark:hover:bg-muted transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by fine number, offender, section, code..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className={`${inputClass} pl-10`}
            />
          </div>
          <select
            value={sectionFilter}
            onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
            className={`${inputClass} w-auto min-w-[180px]`}
          >
            <option value="">All Sections</option>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className={`${inputClass} w-auto min-w-[140px]`}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-card dark:bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-muted-foreground whitespace-nowrap">
                    Fine Number
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-muted-foreground whitespace-nowrap">
                    Offender
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-muted-foreground whitespace-nowrap">
                    Section
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-muted-foreground whitespace-nowrap">
                    Code
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-muted-foreground whitespace-nowrap">
                    Class
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-muted-foreground whitespace-nowrap">
                    Category
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground dark:text-muted-foreground whitespace-nowrap">
                    Amount (GH₵)
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground dark:text-muted-foreground whitespace-nowrap">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground dark:text-muted-foreground whitespace-nowrap">
                    Fine Date
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground dark:text-muted-foreground whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-slate-800">
                {paginatedFines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="text-center py-12 text-muted-foreground dark:text-muted-foreground"
                    >
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p>No fines found</p>
                      {filtered.length === 0 && fines.length > 0 && (
                        <p className="text-xs mt-1">Try adjusting your search or filters</p>
                      )}
                      {fines.length === 0 && (
                        <p className="text-xs mt-1">
                          Click &quot;Add Fine&quot; to create your first fine record
                        </p>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedFines.map((fine) => (
                    <tr
                      key={fine.id}
                      className="hover:bg-card dark:hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">
                        {fine.fineNumber}
                      </td>
                      <td className="px-4 py-3 text-foreground dark:text-slate-100 font-medium whitespace-nowrap">
                        {fine.offenderName || '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground dark:text-muted-foreground text-xs whitespace-nowrap max-w-[160px] truncate">
                        {fine.section || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground dark:text-muted-foreground whitespace-nowrap">
                        {fine.code || '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground dark:text-muted-foreground text-xs whitespace-nowrap max-w-[140px] truncate">
                        {fine.fineClass || '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground dark:text-muted-foreground text-xs whitespace-nowrap max-w-[140px] truncate">
                        {fine.category || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">
                        {fine.fineAmount ? `GH₵ ${parseFloat(fine.fineAmount).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(fine.status)}`}
                        >
                          {fine.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {fine.fineDate || '—'}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(fine)}
                            className="p-1.5 rounded-md hover:bg-muted dark:hover:bg-slate-700 text-muted-foreground hover:text-primary transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(fine.id)}
                            className={`p-1.5 rounded-md transition-colors ${
                              confirmDelete === fine.id
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 dark:hover:bg-red-900/50'
                                : 'hover:bg-muted dark:hover:bg-slate-700 text-muted-foreground hover:text-destructive'
                            }`}
                            title={confirmDelete === fine.id ? 'Click again to confirm' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card dark:bg-muted/30">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} fines
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[32px] h-8 px-2 rounded-md text-xs font-medium transition-colors ${
                      p === page
                        ? 'bg-primary text-white'
                        : 'border border-border text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Render: FORM VIEW ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Form Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            setView('list');
            setEditingId(null);
          }}
          className="p-2 rounded-lg border-border text-muted-foreground hover:bg-muted dark:hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {editingId ? 'Edit Fine' : 'New Fine'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {editingId ? 'Update fine record details' : 'Create a new offence fine record'}
          </p>
        </div>
      </div>

      {/* Section 1: Fine Details */}
      <div className="rounded-xl border-border bg-card p-6">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
            <Gavel className="w-5 h-5 text-primary dark:text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Fine Details
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Fine Number (auto-generated, readonly) */}
          <div>
            <label className={`block ${labelClass}`}>Fine Number</label>
            <input
              type="text"
              name="fineNumber"
              value={form.fineNumber}
              readOnly
              className={`${inputClass} bg-card dark:bg-muted cursor-not-allowed`}
            />
          </div>

          {/* Fine Date */}
          <div>
            <label className={`block ${labelClass}`}>
              Fine Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="fineDate"
              value={form.fineDate}
              onChange={handleFormChange}
              className={inputClass}
            />
          </div>

          {/* Due Date */}
          <div>
            <label className={`block ${labelClass}`}>Due Date</label>
            <input
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={handleFormChange}
              className={inputClass}
            />
          </div>

          {/* Section */}
          <div>
            <label className={`block ${labelClass}`}>
              Section <span className="text-red-500">*</span>
            </label>
            <Combobox
              name="section"
              value={form.section}
              onChange={handleFormChange}
              options={SECTIONS.map((s) => ({ value: s, label: s }))}
              placeholder="Type to search section..."
              emptyMessage="No sections found"
              className={inputClass}
            />
          </div>

          {/* Code */}
          <div>
            <label className={`block ${labelClass}`}>Business Code</label>
            <Combobox
              name="code"
              value={form.code}
              onChange={handleFormChange}
              options={fineClassCodes.map((c) => ({
                value: c,
                label: c,
              }))}
              placeholder={
                form.section || filteredClass
                  ? 'Select code...'
                  : 'Select section first...'
              }
              emptyMessage="No codes available"
              className={inputClass}
            />
          </div>

          {/* Class */}
          <div>
            <label className={`block ${labelClass}`}>
              Business Class <span className="text-red-500">*</span>
            </label>
            <Combobox
              name="fineClass"
              value={filteredClass}
              onChange={handleFormChange}
              options={sectionClasses.map((cls) => ({
                value: cls,
                label: cls,
              }))}
              placeholder="Type to search class..."
              emptyMessage="No classes found"
              className={inputClass}
            />
          </div>

          {/* Category */}
          <div>
            <label className={`block ${labelClass}`}>Business Category</label>
            <Combobox
              name="category"
              value={form.category}
              onChange={handleFormChange}
              options={fineClassCategories.map((cat) => ({
                value: cat,
                label: cat,
              }))}
              placeholder={
                fineClassCategories.length > 0
                  ? 'Select category...'
                  : 'Select code/class first...'
              }
              emptyMessage="No categories available"
              className={inputClass}
            />
          </div>

          {/* Fine Revenue Code */}
          <div>
            <label className={`block ${labelClass}`}>Fine Revenue Code</label>
            <input
              type="text"
              name="fineRevenueCode"
              value={form.fineRevenueCode}
              onChange={handleFormChange}
              className={inputClass}
              placeholder="Enter fine revenue code"
            />
          </div>

          {/* Fine Revenue Description */}
          <div>
            <label className={`block ${labelClass}`}>Fine Revenue Description</label>
            <input
              type="text"
              name="fineRevenueClass"
              value={form.fineRevenueClass}
              onChange={handleFormChange}
              className={inputClass}
              placeholder="Enter fine revenue description"
            />
          </div>

          {/* Fine Amount */}
          <div>
            <label className={`block ${labelClass}`}>
              Fine Amount (GH₵) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="fineAmount"
              value={form.fineAmount}
              onChange={handleFormChange}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={inputClass}
            />
          </div>

          {/* Status */}
          <div>
            <label className={`block ${labelClass}`}>Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleFormChange}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Description / Remarks (spans 3 cols) */}
          <div className="md:col-span-3">
            <label className={`block ${labelClass}`}>Description / Remarks</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleFormChange}
              rows={3}
              placeholder="Enter any additional notes or remarks about this fine..."
              className={`${inputClass.replace('h-[42px]', 'min-h-[80px]')} resize-y`}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Offender Information */}
      <div className="rounded-xl border-border bg-card p-6">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Offender Information
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Name of Offender (spans 2 cols) */}
          <div className="md:col-span-2">
            <label className={`block ${labelClass}`}>
              Name of Offender <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="offenderName"
              value={form.offenderName}
              onChange={handleFormChange}
              placeholder="Enter full name of the offender"
              className={inputClass}
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className={`block ${labelClass}`}>Phone Number</label>
            <input
              type="tel"
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={handleFormChange}
              placeholder="e.g. 024 XXX XXXX"
              className={inputClass}
            />
          </div>

          {/* Business Name */}
          <div>
            <label className={`block ${labelClass}`}>Business Name</label>
            <input
              type="text"
              name="businessName"
              value={form.businessName}
              onChange={handleFormChange}
              placeholder="Enter business name"
              className={inputClass}
            />
          </div>

          {/* Business Number */}
          <div>
            <label className={`block ${labelClass}`}>Business Number</label>
            <input
              type="text"
              name="businessNumber"
              value={form.businessNumber}
              onChange={handleFormChange}
              placeholder="Enter business number"
              className={inputClass}
            />
          </div>

          {/* Property Number */}
          <div>
            <label className={`block ${labelClass}`}>Property Number</label>
            <input
              type="text"
              name="propertyNumber"
              value={form.propertyNumber}
              onChange={handleFormChange}
              placeholder="Enter property number"
              className={inputClass}
            />
          </div>

          {/* Address / Location (spans 3 cols) */}
          <div className="md:col-span-3">
            <label className={`block ${labelClass}`}>Address / Location</label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleFormChange}
              placeholder="Enter offender's address or location"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Violation Details */}
      <div className="rounded-xl border-border bg-card p-6">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Violation Details
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Date of Violation */}
          <div>
            <label className={`block ${labelClass}`}>Date of Violation</label>
            <input
              type="date"
              name="violationDate"
              value={form.violationDate}
              onChange={handleFormChange}
              className={inputClass}
            />
          </div>

          {/* Time of Violation */}
          <div>
            <label className={`block ${labelClass}`}>Time of Violation</label>
            <input
              type="time"
              name="violationTime"
              value={form.violationTime}
              onChange={handleFormChange}
              className={inputClass}
            />
          </div>

          {/* Location of Violation (spans 2 cols on md, 1 col on smaller) */}
          <div className="md:col-span-2">
            <label className={`block ${labelClass}`}>Location of Violation</label>
            <input
              type="text"
              name="violationLocation"
              value={form.violationLocation}
              onChange={handleFormChange}
              placeholder="Enter where the violation occurred"
              className={inputClass}
            />
          </div>

          {/* Violation Details (textarea, spans 3 cols) */}
          <div className="md:col-span-3">
            <label className={`block ${labelClass}`}>Violation Details</label>
            <textarea
              name="violationDetails"
              value={form.violationDetails}
              onChange={handleFormChange}
              rows={3}
              placeholder="Describe the violation in detail..."
              className={`${inputClass.replace('h-[42px]', 'min-h-[80px]')} resize-y`}
            />
          </div>

          {/* Evidence File */}
          <div className="md:col-span-3">
            <label className={`block ${labelClass}`}>Evidence File</label>
            <div className="flex items-center gap-3">
              <label
                className={`inline-flex items-center gap-2 px-4 py-2.5 border border-dashed border-border rounded-lg cursor-pointer hover:bg-card dark:hover:bg-muted transition-colors text-sm text-muted-foreground dark:text-muted-foreground ${inputClass} w-auto h-auto`}
              >
                <Camera className="w-4 h-4" />
                <span>Choose File</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setForm((prev) => ({
                        ...prev,
                        evidenceFileName: file.name,
                      }));
                    }
                  }}
                />
              </label>
              {form.evidenceFileName && (
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {form.evidenceFileName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2 pb-4">
        <button
          onClick={() => {
            setView('list');
            setEditingId(null);
          }}
          className="px-6 py-2.5 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-card dark:hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-primary hover:bg-destructive text-white text-sm font-medium rounded-lg transition-colors"
        >
          {editingId ? 'Update Fine' : 'Save Fine'}
        </button>
      </div>
    </div>
  );
}

// ─── CSV Parsing Helper ─────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}
