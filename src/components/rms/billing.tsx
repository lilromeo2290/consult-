'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Printer,
  XCircle,
  FileText,
  Zap,
  DollarSign,
  AlertTriangle,
  Clock,
  X,
  Save,
  CheckCircle2,
  Copy,
  ScanBarcode,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { encodeBarcodeData, getVerificationUrl } from '@/lib/barcode-utils';
import { BUSINESS_CLASSES } from '@/lib/fee-schedule';
import { RENT_CLASS_NAMES } from '@/lib/rent-class-code-map';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Bill {
  id: string;
  billNumber: string;
  date: string;
  billType: 'BOP' | 'Property Rate' | 'Rent' | 'BP';
  uniqueNumber: string;
  businessName: string;
  owner: string;
  category: string;
  location: string;
  arrears: number;
  charge: number;
  amountDue: number;
  status: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue';
  dueDate: string;
  billClass?: string;
  fieldOfficer?: string;
}

interface BillFormData {
  billType: 'BOP' | 'Property Rate' | 'Rent' | 'BP';
  uniqueNumber: string;
  businessName: string;
  owner: string;
  category: string;
  location: string;
  arrears: number;
  charge: number;
  amountDue: number;
  dueDate: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const BILL_TYPES: { value: Bill['billType']; label: string }[] = [
  { value: 'BOP', label: 'BOP - Business Operating Permit' },
  { value: 'Property Rate', label: 'Property Rate' },
  { value: 'Rent', label: 'Rent' },
  { value: 'BP', label: 'BP - Building Permit' },
];

const PROPERTY_CLASSES = ['Residential', 'Commercial', 'Industrial', 'Institutional', 'Mixed Use'];
const BP_CLASSES = ['Residential', 'Commercial', 'Industrial', 'Institutional', 'Mixed Use'];

function getClassesForBillType(billType: Bill['billType']): string[] {
  switch (billType) {
    case 'BOP': return BUSINESS_CLASSES;
    case 'Property Rate': return PROPERTY_CLASSES;
    case 'Rent': return RENT_CLASS_NAMES;
    case 'BP': return BP_CLASSES;
    default: return [];
  }
}

// Lookup an entity by unique number across all data sources
function lookupEntity(
  uniqueNumber: string,
  billType: Bill['billType'],
  businesses: any[],
  properties: any[],
  rents: any[],
  buildingPermits: any[],
): { businessName: string; owner: string; category: string; location: string } | null {
  const num = uniqueNumber.trim().toLowerCase();
  if (!num) return null;

  if (billType === 'BOP') {
    const biz = businesses.find(
      (b) => (b.regNumber || '').toLowerCase() === num,
    );
    if (biz) return { businessName: biz.name || '', owner: biz.owner || '', category: biz.type || biz.category || '', location: biz.businessAddress || '' };
  } else if (billType === 'Property Rate') {
    const prop = properties.find(
      (p) => (p.propNumber || '').toLowerCase() === num,
    );
    if (prop) {
      const useType = prop.propertyUseType || '';
      const classLabel = useType.split(':')[1]?.trim() || useType || prop.category || '';
      const loc = [prop.streetName, prop.houseNo, prop.locality].filter(Boolean).join(', ');
      return { businessName: prop.ownerName || '', owner: prop.ownerName || '', category: classLabel, location: loc || prop.ownerAddress || '' };
    }
  } else if (billType === 'Rent') {
    const rent = rents.find(
      (r) => (r.rentPropertyNumber || '').toLowerCase() === num || (r.id || '').toLowerCase() === num,
    );
    if (rent) return { businessName: rent.occupantName || '', owner: rent.occupantName || '', category: rent.rentPropertyType || '', location: rent.rentPropertyLocation || '' };
  } else if (billType === 'BP') {
    const bp = buildingPermits.find(
      (b) => (b.permitNumber || '').toLowerCase() === num || (b.id || '').toLowerCase() === num,
    );
    if (bp) return { businessName: bp.applicantFullName || '', owner: bp.applicantFullName || '', category: bp.typeOfDevelopment || '', location: bp.siteLocation || '' };
  }
  return null;
}

const initialBills: Bill[] = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number | undefined | null): string {
  const safe = amount ?? 0;
  return `GH₵ ${safe.toLocaleString(undefined, { minimumFractionDigits: safe % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BillingPage() {
  const [bills, setBills] = useSyncedStorage<Bill[]>('rms-bills', initialBills);
  // Synced entity data for lookups
  const [bizData] = useSyncedStorage<any[]>('rms-businesses', []);
  const [propData] = useSyncedStorage<any[]>('rms-properties', []);
  const [rentData] = useSyncedStorage<any[]>('rms-rents', []);
  const [bpData] = useSyncedStorage<any[]>('rms-building-permits', []);
  // Field officers from user management
  const [usersData] = useSyncedStorage<any[]>('rms-users', []);
  const fieldOfficers = useMemo(() => {
    return usersData
      .filter((u: any) => (u.role === 'Field Collector' || u.role === 'Revenue Officer') && u.status === 'Active')
      .map((u: any) => {
        const name = `${u.firstName} ${u.lastName}`.trim();
        const id = u.staffId || u.username;
        return { value: name, label: `${name} (${id})` };
      });
  }, [usersData]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [revenueAreaFilter, setRevenueAreaFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    billType: '' as Bill['billType'] | '',
    billClass: '',
    fieldOfficer: '',
    dueDate: '',
  });
  const [viewingBill, setViewingBill] = useState<Bill | null>(null);
  const [bulkProgress, setBulkProgress] = useState<'idle' | 'generating' | 'done'>('idle');
  const [bulkGeneratedCount, setBulkGeneratedCount] = useState(0);
  const itemsPerPage = 8;

  // ── Form data ───────────────────────────────────────────────────────────

  const [formData, setFormData] = useState<BillFormData>({
    billType: 'BOP',
    uniqueNumber: '',
    businessName: '',
    owner: '',
    category: '',
    location: '',
    arrears: 0,
    charge: 0,
    amountDue: 0,
    dueDate: '',
  });

  // Auto-lookup when unique number changes
  const handleUniqueNumberChange = (value: string) => {
    setFormData((p) => ({ ...p, uniqueNumber: value }));
    if (!value.trim()) return;
    const found = lookupEntity(value, formData.billType, bizData, propData, rentData, bpData);
    if (found) {
      setFormData((p) => ({
        ...p,
        businessName: found.businessName,
        owner: found.owner,
        category: found.category,
        location: found.location,
      }));
    }
  };

  // Auto-lookup when bill type changes (re-lookup with existing number)
  const handleBillTypeChange = (value: Bill['billType']) => {
    setFormData((p) => ({
      ...p,
      billType: value,
      businessName: '',
      owner: '',
      category: '',
      location: '',
    }));
    // If unique number already entered, re-lookup for new type
    if (formData.uniqueNumber.trim()) {
      const found = lookupEntity(formData.uniqueNumber, value, bizData, propData, rentData, bpData);
      if (found) {
        setFormData((p) => ({
          ...p,
          billType: value,
          businessName: found.businessName,
          owner: found.owner,
          category: found.category,
          location: found.location,
        }));
      }
    }
  };

  // ── Filtering ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return bills.filter((b) => {
      const matchSearch =
        searchQuery === '' ||
        b.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.uniqueNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.owner.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus =
        statusFilter === 'All' || b.status === statusFilter;
      const matchCategory =
        categoryFilter === 'All' || b.category === categoryFilter;
      const matchBillType =
        revenueAreaFilter === 'All' || b.billType === revenueAreaFilter;
      const matchDateFrom =
        dateFrom === '' || b.date >= dateFrom;
      const matchDateTo =
        dateTo === '' || b.date <= dateTo;
      return matchSearch && matchStatus && matchCategory && matchBillType && matchDateFrom && matchDateTo;
    });
  }, [bills, searchQuery, statusFilter, categoryFilter, revenueAreaFilter, dateFrom, dateTo]);

  // ── Pagination ──────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIdx = (safeCurrentPage - 1) * itemsPerPage;
  const paged = filtered.slice(startIdx, startIdx + itemsPerPage);
  const showingFrom = filtered.length === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(startIdx + itemsPerPage, filtered.length);

  // ── Status badge ───────────────────────────────────────────────────────

  const StatusBadge = ({ status }: { status: Bill['status'] }) => {
    const styles: Record<Bill['status'], string> = {
      Paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
      Partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
      Unpaid: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
      Overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status]}`}>
        {status === 'Overdue' && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
        {status}
      </span>
    );
  };

  // ── Stats ──────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalBilled = bills.reduce((sum, b) => sum + (b.amountDue ?? 0), 0);
    const paid = bills
      .filter((b) => b.status === 'Paid')
      .reduce((sum, b) => sum + (b.amountDue ?? 0), 0);
    const outstanding = totalBilled - paid;
    const overdue = bills
      .filter((b) => b.status === 'Overdue')
      .reduce((sum, b) => sum + (b.amountDue ?? 0), 0);
    return {
      total: bills.length,
      totalBilled,
      outstanding,
      overdue,
    };
  }, [bills]);

  // ── Generate bill ──────────────────────────────────────────────────────

  const handleGenerateBill = () => {
    // Validate compulsory fields
    const missing: string[] = [];
    if (!formData.uniqueNumber?.trim()) missing.push('Unique Number');
    if (!formData.businessName?.trim()) missing.push('Business Name (enter a valid Unique Number)');
    if (formData.charge <= 0 && formData.arrears <= 0) missing.push('Charge or Arrears (at least one must be greater than 0)');
    if (!formData.dueDate) missing.push('Due Date');
    if (missing.length > 0) {
      alert('Please complete the following required field(s):\n\n' + missing.map((f) => '• ' + f).join('\n'));
      return;
    }

    const newBillNumber = `BILL-2024-${String(bills.length + 156).padStart(4, '0')}`;
    const amountDue = formData.arrears + formData.charge;

    const newBill: Bill = {
      id: String(bills.length + 1),
      billNumber: newBillNumber,
      date: new Date().toISOString().split('T')[0],
      billType: formData.billType,
      uniqueNumber: formData.uniqueNumber,
      businessName: formData.businessName,
      owner: formData.owner,
      category: formData.category,
      location: formData.location,
      arrears: formData.arrears,
      charge: formData.charge,
      amountDue,
      status: 'Unpaid',
      dueDate: formData.dueDate,
    };

    setBills((prev) => [newBill, ...prev]);
    toast.success('Bill generated successfully');
    setShowModal(false);
    setFormData({
      billType: 'BOP',
      uniqueNumber: '',
      businessName: '',
      owner: '',
      category: '',
      location: '',
      arrears: 0,
      charge: 0,
      amountDue: 0,
      dueDate: '',
    });
    setCurrentPage(1);
  };

  // ── Cancel bill ────────────────────────────────────────────────────────

  const handleCancelBill = (id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
  };

  // ── Bulk eligible count ───────────────────────────────────────────────

  const bulkClasses = useMemo(() => {
    if (!bulkForm.billType) return [];
    return getClassesForBillType(bulkForm.billType);
  }, [bulkForm.billType]);

  const bulkEligibleCount = useMemo(() => {
    if (!bulkForm.billType || !bulkForm.billClass) return 0;
    const bt = bulkForm.billType;
    const cls = bulkForm.billClass;
    let source: any[] = [];
    if (bt === 'BOP') source = bizData;
    else if (bt === 'Property Rate') source = propData;
    else if (bt === 'Rent') source = rentData;
    else if (bt === 'BP') source = bpData;
    return source.filter((e: any) => {
      const entityClass = bt === 'BOP' ? (e.type || '')
        : bt === 'Property Rate' ? (e.propertyUseType || '').split(':')[1]?.trim() || (e.category || '')
        : bt === 'Rent' ? (e.rentPropertyType || '')
        : (e.typeOfDevelopment || '');
      if (!entityClass || !entityClass.includes(cls)) return false;
      const idField = bt === 'BOP' ? e.regNumber
        : bt === 'Property Rate' ? e.propNumber
        : bt === 'Rent' ? (e.rentPropertyNumber || e.id)
        : (e.permitNumber || e.id);
      if (!idField) return false;
      const exists = bills.find(
        (b) => b.uniqueNumber === idField && b.billType === bt,
      );
      return !exists;
    }).length;
  }, [bulkForm.billType, bulkForm.billClass, bills, bizData, propData, rentData, bpData]);

  // ── Bulk generate bills ────────────────────────────────────────────────

  const handleBulkGenerate = () => {
    // Validate
    if (bulkEligibleCount === 0) {
      alert('No eligible entities found for the selected criteria');
      return;
    }

    setBulkProgress('generating');
    const bt = bulkForm.billType;
    const cls = bulkForm.billClass;
    let source: any[] = [];
    if (bt === 'BOP') source = bizData;
    else if (bt === 'Property Rate') source = propData;
    else if (bt === 'Rent') source = rentData;
    else if (bt === 'BP') source = bpData;

    setTimeout(() => {
      const eligibleEntities = source.filter((e: any) => {
        const entityClass = bt === 'BOP' ? (e.type || '')
          : bt === 'Property Rate' ? (e.propertyUseType || '').split(':')[1]?.trim() || (e.category || '')
          : bt === 'Rent' ? (e.rentPropertyType || '')
          : (e.typeOfDevelopment || '');
        if (!entityClass || !entityClass.includes(cls)) return false;
        const idField = bt === 'BOP' ? e.regNumber
          : bt === 'Property Rate' ? e.propNumber
          : bt === 'Rent' ? (e.rentPropertyNumber || e.id)
          : (e.permitNumber || e.id);
        if (!idField) return false;
        const exists = bills.find((b) => b.uniqueNumber === idField && b.billType === bt);
        return !exists;
      });

      const newBills: Bill[] = eligibleEntities.map((entity, idx) => {
        const idField = bt === 'BOP' ? entity.regNumber
          : bt === 'Property Rate' ? entity.propNumber
          : bt === 'Rent' ? (entity.rentPropertyNumber || entity.id)
          : (entity.permitNumber || entity.id);
        const nameField = bt === 'BOP' ? (entity.name || '')
          : bt === 'Property Rate' ? (entity.ownerName || '')
          : bt === 'Rent' ? (entity.occupantName || '')
          : (entity.applicantFullName || '');
        const ownerField = bt === 'BOP' ? (entity.owner || nameField)
          : bt === 'Property Rate' ? (entity.ownerName || nameField)
          : bt === 'Rent' ? (entity.occupantName || nameField)
          : (entity.applicantFullName || nameField);
        const catField = bt === 'BOP' ? (entity.type || '')
          : bt === 'Property Rate' ? (entity.propertyUseType || '').split(':')[1]?.trim() || (entity.category || '')
          : bt === 'Rent' ? (entity.rentPropertyType || '')
          : (entity.typeOfDevelopment || '');
        const locField = bt === 'BOP' ? (entity.businessAddress || '')
          : bt === 'Property Rate' ? [entity.streetName, entity.houseNo, entity.locality].filter(Boolean).join(', ')
          : bt === 'Rent' ? (entity.rentPropertyLocation || '')
          : (entity.siteLocation || '');
        return {
          id: String(Date.now() + idx),
          billNumber: `BILL-2024-${String(bills.length + 156 + idx).padStart(4, '0')}`,
          date: new Date().toISOString().split('T')[0],
          billType: bt,
          uniqueNumber: idField || '',
          businessName: nameField,
          owner: ownerField,
          category: catField,
          location: locField,
          arrears: 0,
          charge: 0,
          amountDue: 0,
          status: 'Unpaid' as const,
          dueDate: bulkForm.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          billClass: bulkForm.billClass,
          fieldOfficer: bulkForm.fieldOfficer,
        };
      });

      setBills((prev) => [...newBills.reverse(), ...prev]);
      setBulkGeneratedCount(newBills.length);
      setBulkProgress('done');
      setCurrentPage(1);
      toast.success(`Successfully generated ${newBills.length} bill(s)`);
    }, 800);
  };

  const handleCloseBulkModal = () => {
    setShowBulkModal(false);
    setBulkForm({ billType: '', billClass: '', fieldOfficer: '', dueDate: '' });
    setBulkProgress('idle');
    setBulkGeneratedCount(0);
  };

  // ── View bill ──────────────────────────────────────────────────────────

  const handleViewBill = (bill: Bill) => {
    setViewingBill(bill);
  };

  // ── Barcode helpers ──────────────────────────────────────────────
  const getBillBarcodeSvg = (bill: Bill): string => {
    const _aName = (() => { try { const r = JSON.parse(localStorage.getItem('rms-settings-assembly') || '{}'); return r.name || 'Kpando Municipal Assembly'; } catch { return 'Kpando Municipal Assembly'; } })();
    const encoded = encodeBarcodeData({
      type: 'INVOICE',
      refNo: bill.billNumber,
      issuedTo: bill.businessName,
      entityType: bill.billType,
      amount: bill.amountDue,
      date: bill.date,
      revenueItem: bill.billType,
      status: bill.status,
      assemblyName: _aName,
    });
    try {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      JsBarcode(svg, encoded, {
        format: 'CODE128',
        width: 2,
        height: 50,
        displayValue: false,
        margin: 0,
        fontSize: 10,
      });
      return svg.outerHTML;
    } catch {
      return '';
    }
  };

  const getBillBarcodeData = (bill: Bill): string => {
    const _aName = (() => { try { const r = JSON.parse(localStorage.getItem('rms-settings-assembly') || '{}'); return r.name || 'Kpando Municipal Assembly'; } catch { return 'Kpando Municipal Assembly'; } })();
    return encodeBarcodeData({
      type: 'INVOICE',
      refNo: bill.billNumber,
      issuedTo: bill.businessName,
      entityType: bill.billType,
      amount: bill.amountDue,
      date: bill.date,
      revenueItem: bill.billType,
      status: bill.status,
      assemblyName: _aName,
    });
  };

  // ── Barcode canvas ref for bill view modal ────────────────────────────
  const billBarcodeRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (viewingBill && billBarcodeRef.current) {
      try {
        JsBarcode(billBarcodeRef.current, getBillBarcodeData(viewingBill), {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: false,
          margin: 0,
          fontSize: 10,
        });
      } catch { /* barcode render failure */ }
    }
  }, [viewingBill]);

  // ── Print bill ─────────────────────────────────────────────────────────

  const _asmName = () => { try { const r = JSON.parse(localStorage.getItem('rms-settings-assembly') || '{}'); return r.name || 'Kpando Municipal Assembly'; } catch { return 'Kpando Municipal Assembly'; } };
  const handlePrintBill = (bill: Bill) => {
    const barcodeSvg = getBillBarcodeSvg(bill);
    setViewingBill(bill);
    setTimeout(() => {
      const printContent = document.getElementById('bill-print-content');
      if (!printContent) return;

      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) return;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bill - ${bill.billNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; }
            .header { text-align: center; border-bottom: 3px double #1e293b; padding-bottom: 16px; margin-bottom: 24px; }
            .header h1 { font-size: 20px; font-weight: 700; letter-spacing: 0.05em; }
            .header p { font-size: 12px; color: #64748b; margin-top: 4px; }
            .bill-title { text-align: center; font-size: 16px; font-weight: 600; margin-bottom: 20px; color: #059669; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
            .info-item { font-size: 13px; }
            .info-item .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
            .info-item .value { font-weight: 600; margin-top: 2px; }
            .section-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; margin-top: 20px; }
            .amount-table { width: 100%; border-collapse: collapse; font-size: 13px; }
            .amount-table th { text-align: left; padding: 8px 12px; background: #f8fafc; color: #64748b; font-size: 11px; text-transform: uppercase; }
            .amount-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
            .amount-table tr:last-child td { border-bottom: none; }
            .total-row td { font-size: 15px; font-weight: 700; border-top: 2px solid #1e293b; background: #f8fafc; }
            .status-badge { display: inline-block; padding: 3px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
            .status-paid { background: #d1fae5; color: #065f46; }
            .status-unpaid { background: #fee2e2; color: #991b1b; }
            .status-partial { background: #fef3c7; color: #92400e; }
            .status-overdue { background: #fee2e2; color: #991b1b; }
            .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
            .qr-placeholder { width: 80px; height: 80px; border: 2px dashed #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; margin: 16px auto 0; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${_asmName().toUpperCase()}</h1>
            <p>Revenue Management System — Official Bill</p>
          </div>
          <div class="bill-title">INVOICE / BILL</div>
          <div class="info-grid">
            <div class="info-item"><div class="label">Bill Number</div><div class="value">${bill.billNumber}</div></div>
            <div class="info-item"><div class="label">Bill Date</div><div class="value">${bill.date}</div></div>
            <div class="info-item"><div class="label">Due Date</div><div class="value">${bill.dueDate || 'N/A'}</div></div>
            <div class="info-item"><div class="label">Status</div><div class="value"><span class="status-badge status-${bill.status.toLowerCase()}">${bill.status.toUpperCase()}</span></div></div>
          </div>
          <div class="section-title">Billed Entity</div>
          <div class="info-grid">
            <div class="info-item"><div class="label">Unique Number</div><div class="value">${bill.uniqueNumber}</div></div>
            <div class="info-item"><div class="label">Business Name</div><div class="value">${bill.businessName}</div></div>
            <div class="info-item"><div class="label">Owner</div><div class="value">${bill.owner}</div></div>
            <div class="info-item"><div class="label">Bill Type</div><div class="value">${bill.billType}</div></div>
            <div class="info-item"><div class="label">Category</div><div class="value">${bill.category}</div></div>
            <div class="info-item"><div class="label">Location</div><div class="value">${bill.location || 'N/A'}</div></div>
          </div>
          <div class="section-title">Amount Breakdown</div>
          <table class="amount-table">
            <thead><tr><th>Description</th><th style="text-align:right">Amount (GH₵)</th></tr></thead>
            <tbody>
              <tr><td>Arrears</td><td style="text-align:right">${formatCurrency(bill.arrears)}</td></tr>
              <tr><td>Charge</td><td style="text-align:right">${formatCurrency(bill.charge)}</td></tr>
              <tr class="total-row"><td>Amount Due</td><td style="text-align:right">${formatCurrency(bill.amountDue)}</td></tr>
            </tbody>
          </table>
          <div style="text-align:center;margin-top:30px;padding:16px;border:1px solid #e2e8f0;border-radius:8px;">
            <p style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Scan to Verify</p>
            ${barcodeSvg}
            <p style="font-size:9px;color:#94a3b8;margin-top:6px;">${getVerificationUrl(getBillBarcodeData(bill))}</p>
          </div>
          <div class="footer">
            This is a computer-generated document and does not require a signature.<br/><br/>
            Designed, Developed &amp; Maintained by <strong>Clipe Consult</strong><br/>
            www.clipeconsult.com
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.onload = () => { printWindow.print(); };
    }, 100);
  };

  // ── CSS classes ──────────────────────────────────────────────────────────

  const inputClass =
    'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition';
  const labelClass =
    'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';
  const btnPrimary =
    'inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap';
  const btnSecondary =
    'inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap';

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Bill Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generate, track, and manage revenue bills for businesses and properties.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowModal(true)} className={btnPrimary}>
            <Plus className="w-4 h-4" />
            Generate Bill
          </button>
          <button onClick={() => { setShowBulkModal(true); setBulkProgress('idle'); setBulkGeneratedCount(0); }} className={btnSecondary}>
            <Zap className="w-4 h-4" />
            Bulk Generate
          </button>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Bills Generated</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.total.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Billed</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.totalBilled)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Outstanding</p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{formatCurrency(stats.outstanding)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/30">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Overdue</p>
              <p className="text-xl font-bold text-red-700 dark:text-red-400">{formatCurrency(stats.overdue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by bill #, entity, or revenue item..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className={`${inputClass} pl-10`}
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setCurrentPage(1);
          }}
          className={`${inputClass} w-full sm:w-40`}
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setCurrentPage(1);
          }}
          className={`${inputClass} w-full sm:w-40`}
          title="To date"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className={`${inputClass} w-full sm:w-40`}
        >
          <option value="All">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Partial">Partial</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Overdue">Overdue</option>
        </select>
        <select
          value={revenueAreaFilter}
          onChange={(e) => {
            setRevenueAreaFilter(e.target.value);
            setCurrentPage(1);
          }}
          className={`${inputClass} w-full sm:w-40`}
        >
          <option value="All">All Bill Types</option>
          <option value="BOP">BOP</option>
          <option value="Property Rate">Property Rate</option>
          <option value="Rent">Rent</option>
          <option value="BP">BP</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setCurrentPage(1);
          }}
          className={`${inputClass} w-full sm:w-44`}
        >
          <option value="All">All Categories</option>
          <option value="Healthcare">Healthcare</option>
          <option value="Hospitality">Hospitality</option>
          <option value="Food & Beverage">Food & Beverage</option>
          <option value="Industry">Industry</option>
          <option value="Retail">Retail</option>
          <option value="Personal Care">Personal Care</option>
          <option value="Energy">Energy</option>
          <option value="Residential">Residential</option>
          <option value="Commercial">Commercial</option>
          <option value="Education">Education</option>
        </select>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Bill #
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Date
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Business Name
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap hidden lg:table-cell">
                  Bill Type
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Arrears
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Charge
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Amount Due
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Status
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-12 text-slate-400 dark:text-slate-500"
                  >
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    No bills found matching your criteria.
                  </td>
                </tr>
              ) : (
                paged.map((bill) => (
                  <tr
                    key={bill.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {bill.billNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {bill.date}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white text-sm">
                          {bill.businessName}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {bill.uniqueNumber}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap hidden lg:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {bill.billType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {(bill.arrears ?? 0) > 0 ? formatCurrency(bill.arrears) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(bill.charge)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(bill.amountDue)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={bill.status} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleViewBill(bill)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                          title="View Bill"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrintBill(bill)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                          title="Print Bill"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {bill.status !== 'Paid' && (
                          <button
                            onClick={() => handleCancelBill(bill.id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Cancel Bill"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Showing {showingFrom}–{showingTo} of {filtered.length} bills
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage === 1}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                page === safeCurrentPage
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage === totalPages}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Bulk Generate Modal ────────────────────────────────────────── */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseBulkModal} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Bulk Generate Bills</h2>
              <button onClick={handleCloseBulkModal} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {bulkProgress === 'done' ? (
              <div className="px-6 py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Bills Generated Successfully</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  {bulkGeneratedCount} bill{bulkGeneratedCount !== 1 ? 's were' : ' was'} generated successfully.
                </p>
                <button onClick={handleCloseBulkModal} className={btnPrimary}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="px-6 py-5 space-y-4">
                  {/* 1. Select Bill Type */}
                  <div>
                    <label className={labelClass}>Select Bill Type</label>
                    <select
                      value={bulkForm.billType}
                      onChange={(e) => setBulkForm((p) => ({ ...p, billType: e.target.value as Bill['billType'], billClass: '' }))}
                      className={inputClass}
                    >
                      <option value="">Select bill type...</option>
                      {BILL_TYPES.map((bt) => (
                        <option key={bt.value} value={bt.value}>{bt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Select Class */}
                  <div>
                    <label className={labelClass}>Select Class</label>
                    <select
                      value={bulkForm.billClass}
                      onChange={(e) => setBulkForm((p) => ({ ...p, billClass: e.target.value }))}
                      className={inputClass}
                      disabled={!bulkForm.billType}
                    >
                      <option value="">{bulkForm.billType ? 'Select class...' : 'Select a bill type first'}</option>
                      {bulkClasses.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Field Officer */}
                  <div>
                    <label className={labelClass}>Field Officer</label>
                    <select
                      value={bulkForm.fieldOfficer}
                      onChange={(e) => setBulkForm((p) => ({ ...p, fieldOfficer: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">Select field officer...</option>
                      {fieldOfficers.map((fo) => (
                        <option key={fo.value} value={fo.value}>{fo.label}</option>
                      ))}
                    </select>
                    {fieldOfficers.length === 0 && (
                      <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">No active Field Collectors or Revenue Officers found. Add officers in User Management.</p>
                    )}
                  </div>

                  {/* 4. Due Date */}
                  <div>
                    <label className={labelClass}>Due Date</label>
                    <input
                      type="date"
                      value={bulkForm.dueDate}
                      onChange={(e) => setBulkForm((p) => ({ ...p, dueDate: e.target.value }))}
                      className={inputClass}
                    />
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Defaults to 30 days from today if not set.</p>
                  </div>

                  {bulkForm.billType && bulkForm.billClass && (
                    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-700 dark:text-blue-300 font-medium">Eligible entities (no existing bill):</span>
                        <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{bulkEligibleCount}</span>
                      </div>
                      {bulkEligibleCount === 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">All eligible entities in this class already have a bill for this type.</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700 px-6 py-4">
                  <button onClick={handleCloseBulkModal} className={btnSecondary}>
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkGenerate}
                    disabled={!bulkForm.billType || !bulkForm.billClass || bulkEligibleCount === 0 || bulkProgress === 'generating'}
                    className={btnPrimary}
                  >
                    {bulkProgress === 'generating' ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Generate {bulkEligibleCount > 0 ? `${bulkEligibleCount} Bill${bulkEligibleCount !== 1 ? 's' : ''}` : ''}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── View / Print Bill Modal ─────────────────────────────────────── */}
      {viewingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewingBill(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div id="bill-print-content">
              {/* Header */}
              <div className="text-center border-b-2 border-dashed border-slate-300 dark:border-slate-600 px-6 py-5">
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-wider uppercase">{_asmName()}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Revenue Management System</p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-3 tracking-wide">OFFICIAL BILL</p>
              </div>

              {/* Bill Info Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">Bill Number</p>
                  <p className="text-sm font-mono font-semibold text-slate-900 dark:text-white mt-0.5">{viewingBill.billNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">Bill Date</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">{viewingBill.date}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">Due Date</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">{viewingBill.dueDate || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">Status</p>
                  <div className="mt-1"><StatusBadge status={viewingBill.status} /></div>
                </div>
              </div>

              {/* Entity Section */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium mb-2">Billed Entity</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{viewingBill.businessName}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{viewingBill.billType}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{viewingBill.category}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Owner: {viewingBill.owner}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Location: {viewingBill.location || 'N/A'}</p>
              </div>

              {/* Amount Breakdown */}
              <div className="px-6 py-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium mb-3">Amount Breakdown</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Arrears</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(viewingBill.arrears)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Charge</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(viewingBill.charge)}</span>
                  </div>
                  <div className="border-t-2 border-slate-900 dark:border-slate-100 pt-2 mt-2 flex justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">Amount Due</span>
                    <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{formatCurrency(viewingBill.amountDue)}</span>
                  </div>
                </div>
              </div>

              {/* Barcode Verification */}
              <div className="flex justify-center pb-2">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 w-full">
                  <div className="flex items-center gap-2 mb-2 justify-center">
                    <ScanBarcode className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">Verification Barcode</p>
                  </div>
                  <div className="flex justify-center bg-white dark:bg-slate-800 rounded p-2">
                    <canvas ref={billBarcodeRef} className="max-w-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700 px-6 py-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(viewingBill.billNumber);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Bill #
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setViewingBill(null)} className={btnSecondary}>
                  Close
                </button>
                <button onClick={() => handlePrintBill(viewingBill)} className={btnPrimary}>
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Generate Bill Modal ────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Generate New Bill
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              {/* 1. Select Bill Type */}
              <div>
                <label className={labelClass}>Select Bill Type</label>
                <select
                  value={formData.billType}
                  onChange={(e) => handleBillTypeChange(e.target.value as Bill['billType'])}
                  className={inputClass}
                >
                  {BILL_TYPES.map((bt) => (
                    <option key={bt.value} value={bt.value}>{bt.label}</option>
                  ))}
                </select>
              </div>

              {/* 2. Enter Unique Number */}
              <div>
                <label className={labelClass}>Unique Number</label>
                <input
                  type="text"
                  value={formData.uniqueNumber}
                  onChange={(e) => handleUniqueNumberChange(e.target.value)}
                  className={inputClass}
                  placeholder="Enter registration / property / rent number"
                />
              </div>

              {/* 3. Business Name (Autofill) */}
              <div>
                <label className={labelClass}>Business Name</label>
                <input
                  type="text"
                  value={formData.businessName}
                  className={inputClass}
                  placeholder="Auto-filled from Unique Number"
                  readOnly
                />
              </div>

              {/* 4. Owner (Autofill) */}
              <div>
                <label className={labelClass}>Owner</label>
                <input
                  type="text"
                  value={formData.owner}
                  className={inputClass}
                  placeholder="Auto-filled from Unique Number"
                  readOnly
                />
              </div>

              {/* 5. Category (Autofill) */}
              <div>
                <label className={labelClass}>Category</label>
                <input
                  type="text"
                  value={formData.category}
                  className={inputClass}
                  placeholder="Auto-filled from Unique Number"
                  readOnly
                />
              </div>

              {/* 6. Location (Autofill) */}
              <div>
                <label className={labelClass}>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  className={inputClass}
                  placeholder="Auto-filled from Unique Number"
                  readOnly
                />
              </div>

              {/* 7. Amount Fields */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Arrears (GH₵)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.arrears || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, arrears: Number(e.target.value) }))}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>Charge (GH₵)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.charge || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, charge: Number(e.target.value) }))}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>Amount Due (GH₵)</label>
                  <input
                    type="text"
                    value={formatCurrency(formData.arrears + formData.charge)}
                    className={inputClass}
                    readOnly
                  />
                </div>
              </div>

              {/* 8. Due Date */}
              <div>
                <label className={labelClass}>Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData((p) => ({ ...p, dueDate: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700 px-6 py-4">
              <button onClick={() => setShowModal(false)} className={btnSecondary}>
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleGenerateBill}
                className={btnPrimary}
                disabled={
                  !formData.uniqueNumber?.trim() ||
                  !formData.businessName?.trim() ||
                  (formData.charge <= 0 && formData.arrears <= 0) ||
                  !formData.dueDate
                }
              >
                <Save className="w-4 h-4" />
                Generate Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
