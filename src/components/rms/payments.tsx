'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import {
  Plus,
  Search,
  Download,
  Eye,
  Trash2,
  X,
  Receipt,
  DollarSign,
  CalendarCheck,
  Clock,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Printer,
  Copy,
  User,
  FileText,
  Hash,
  ScanBarcode,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { encodeBarcodeData, getVerificationUrl } from '@/lib/barcode-utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type PaymentMethod = 'Cash' | 'Mobile Money' | 'Bank' | 'POS' | 'Online';
type PaymentStatus = 'Full' | 'Partial' | 'Advance';
type BillType = 'BOP' | 'Property Rate' | 'Rent' | 'BP' | 'Fine';

interface Payment {
  id: string;
  receiptNo: string;
  billNo: string;
  billType: BillType;
  uniqueNumber: string;
  business: string;
  owner: string;
  amount: number;
  balance: number;
  date: string;
  fieldOfficer: string;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string;
  remarks: string;
}

interface SourceBill {
  id: string;
  billNumber: string;
  billType: BillType;
  uniqueNumber: string;
  businessName: string;
  owner: string;
  amountDue: number;
  status: string;
  fieldOfficer?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number | undefined | null): string => {
  const safe = amount ?? 0;
  return `GH₵ ${safe.toLocaleString('en-GH', { minimumFractionDigits: safe % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
};

const methodBadge: Record<PaymentMethod, { bg: string; text: string }> = {
  Cash: { bg: 'bg-amber-100 text-amber-800', text: 'Cash' },
  'Mobile Money': { bg: 'bg-emerald-100 text-emerald-800', text: 'MoMo' },
  Bank: { bg: 'bg-blue-100 text-blue-800', text: 'Bank' },
  POS: { bg: 'bg-purple-100 text-purple-800', text: 'POS' },
  Online: { bg: 'bg-sky-100 text-sky-800', text: 'Online' },
};

const statusBadge: Record<PaymentStatus, { bg: string; text: string; dot: string }> = {
  Full: { bg: 'bg-green-100 text-green-800', text: 'Full', dot: 'bg-green-500' },
  Partial: { bg: 'bg-amber-100 text-amber-800', text: 'Partial', dot: 'bg-amber-500' },
  Advance: { bg: 'bg-blue-100 text-blue-800', text: 'Advance', dot: 'bg-blue-500' },
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockPayments: Payment[] = [];

const BILL_TYPE_OPTIONS: { value: BillType; label: string }[] = [
  { value: 'BOP', label: 'BOP - Business Operating Permit' },
  { value: 'Property Rate', label: 'Property Rate' },
  { value: 'Rent', label: 'Rent' },
  { value: 'BP', label: 'BP - Building Permit' },
  { value: 'Fine', label: 'Fine' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentsPage() {
  const [payments, setPayments] = useSyncedStorage<Payment[]>('rms-payments', mockPayments);
  const [sourceBills, setSourceBills] = useSyncedStorage<SourceBill[]>('rms-bills', []);
  const asmName = useMemo(() => { try { const r = JSON.parse(localStorage.getItem('rms-settings-assembly') || '{}'); return r.name || 'Kpando Municipal Assembly'; } catch { return 'Kpando Municipal Assembly'; } }, []);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [payRevenueCategory, setPayRevenueCategory] = useState<BillType | ''>('');
  const [selectedBillNo, setSelectedBillNo] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');
  const [payReference, setPayReference] = useState('');
  const [payRemarks, setPayRemarks] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 8;

  // Derive available bills filtered by revenue category and with balance > 0
  const availableBills = useMemo(() => {
    return sourceBills
      .filter((b) => b.status !== 'Paid' && (b.amountDue ?? 0) > 0)
      .filter((b) => !payRevenueCategory || b.billType === payRevenueCategory)
      .map((b) => {
        // Calculate how much has already been paid for this bill
        const totalPaid = payments
          .filter((p) => p.billNo === b.billNumber)
          .reduce((sum, p) => sum + p.amount, 0);
        const balance = (b.amountDue ?? 0) - totalPaid;
        return {
          billNo: b.billNumber,
          billType: b.billType,
          uniqueNumber: b.uniqueNumber || '',
          business: b.businessName || '',
          owner: b.owner || '',
          totalAmount: b.amountDue ?? 0,
          balance: Math.max(0, balance),
          fieldOfficer: b.fieldOfficer || '',
        };
      })
      .filter((b) => b.balance > 0);
  }, [sourceBills, payRevenueCategory, payments]);

  const autoFill = useMemo(() => {
    const bill = availableBills.find((b) => b.billNo === selectedBillNo);
    if (!bill) return { business: '', owner: '', balance: 0, totalAmount: 0, fieldOfficer: '', uniqueNumber: '', billType: '' as BillType | '' };
    return { business: bill.business, owner: bill.owner, balance: bill.balance, totalAmount: bill.totalAmount, fieldOfficer: bill.fieldOfficer, uniqueNumber: bill.uniqueNumber, billType: bill.billType };
  }, [selectedBillNo, availableBills]);

  // ─── Filtering ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const matchSearch =
        search === '' ||
        p.receiptNo.toLowerCase().includes(search.toLowerCase()) ||
        p.billNo.toLowerCase().includes(search.toLowerCase()) ||
        p.business.toLowerCase().includes(search.toLowerCase()) ||
        p.fieldOfficer.toLowerCase().includes(search.toLowerCase());

      const matchMethod = methodFilter === 'All' || p.method === methodFilter;
      const matchStatus = statusFilter === 'All' || p.status === statusFilter;
      const matchFrom = dateFrom === '' || p.date >= dateFrom;
      const matchTo = dateTo === '' || p.date <= dateTo;

      return matchSearch && matchMethod && matchStatus && matchFrom && matchTo;
    });
  }, [payments, search, methodFilter, statusFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  // ─── Stats ──────────────────────────────────────────────────────────────

  const totalPayments = payments.length;
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const todayPayments = payments
    .filter((p) => p.date === new Date().toISOString().split('T')[0])
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.reduce((sum, p) => sum + p.balance, 0);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const openModal = () => {
    setPayRevenueCategory('');
    setSelectedBillNo('');
    setPayAmount('');
    setPayMethod('Cash');
    setPayReference('');
    setPayRemarks('');
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleSave = () => {
    // Validate compulsory fields
    const missing: string[] = [];
    if (!payRevenueCategory) missing.push('Revenue Category');
    if (!selectedBillNo) missing.push('Bill Number');
    if (!payAmount || parseFloat(payAmount) <= 0) missing.push('Payment Amount');
    if (missing.length > 0) {
      alert('Please complete the following required field(s):\n\n' + missing.map((f) => '• ' + f).join('\n'));
      return;
    }

    const bill = availableBills.find((b) => b.billNo === selectedBillNo);
    if (!bill) return;
    const paidAmount = parseFloat(payAmount) || 0;
    const isFull = paidAmount >= bill.balance;
    const newBalance = isFull ? 0 : bill.balance - paidAmount;

    const newPayment: Payment = {
      id: String(Date.now()),
      receiptNo: `RCP-${new Date().getFullYear()}-${String(payments.length + 1).padStart(4, '0')}`,
      billNo: selectedBillNo,
      billType: bill.billType,
      uniqueNumber: bill.uniqueNumber,
      business: bill.business,
      owner: bill.owner,
      amount: paidAmount,
      balance: newBalance,
      date: new Date().toISOString().split('T')[0],
      fieldOfficer: bill.fieldOfficer || 'System',
      method: payMethod,
      status: isFull ? 'Full' : 'Partial',
      reference: payReference,
      remarks: payRemarks,
    };

    setPayments([newPayment, ...payments]);
    toast.success('Payment recorded successfully');

    // Update the bill status in billing
    setSourceBills((prev) =>
      prev.map((b) => {
        if (b.billNumber !== selectedBillNo) return b;
        return {
          ...b,
          status: (isFull ? 'Paid' : 'Partial') as SourceBill['status'],
        };
      })
    );

    closeModal();
  };

  const handleDelete = (id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  // ─── View Payment ───────────────────────────────────────────────────────

  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);

  const handleViewPayment = (p: Payment) => {
    setViewingPayment(p);
  };

  // ── Barcode helpers ──────────────────────────────────────
  const getPayBarcodeSvg = (p: Payment, asmName: string): string => {
    const encoded = encodeBarcodeData({
      type: 'PAYMENT',
      refNo: p.receiptNo,
      issuedTo: p.business,
      entityType: 'Business',
      amount: p.amount,
      date: p.date,
      revenueItem: 'Revenue Payment',
      method: p.method,
      status: p.status,
      assemblyName: asmName,
    });
    try {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      JsBarcode(svg, encoded, { format: 'CODE128', width: 2, height: 50, displayValue: false, margin: 0, fontSize: 10 });
      return svg.outerHTML;
    } catch { return ''; }
  };

  const getPayBarcodeData = (p: Payment, asmName: string): string => {
    return encodeBarcodeData({
      type: 'PAYMENT',
      refNo: p.receiptNo,
      issuedTo: p.business,
      entityType: 'Business',
      amount: p.amount,
      date: p.date,
      revenueItem: 'Revenue Payment',
      method: p.method,
      status: p.status,
      assemblyName: asmName,
    });
  };

  // ── Barcode canvas ref for modal ──────────────────────────────────────
  const payBarcodeRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (viewingPayment && payBarcodeRef.current) {
      try {
        JsBarcode(payBarcodeRef.current, getPayBarcodeData(viewingPayment, asmName), {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: false,
          margin: 0,
          fontSize: 10,
        });
      } catch { /* barcode render failure */ }
    }
  }, [viewingPayment, asmName]);

  const handlePrintPayment = (p: Payment) => {
    const _asmName = (() => { try { const r = JSON.parse(localStorage.getItem('rms-settings-assembly') || '{}'); return r.name || 'Kpando Municipal Assembly'; } catch { return 'Kpando Municipal Assembly'; } })();
    const printWin = window.open('', '_blank', 'width=800,height=600');
    if (!printWin) return;
    const barcodeSvg = getPayBarcodeSvg(p, _asmName);
    const barcodeData = getPayBarcodeData(p, _asmName);
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt - ${p.receiptNo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; }
          .header { text-align: center; border-bottom: 3px double #1e293b; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { font-size: 20px; font-weight: 700; letter-spacing: 0.05em; }
          .header p { font-size: 12px; color: #64748b; margin-top: 4px; }
          .receipt-title { text-align: center; font-size: 16px; font-weight: 600; margin-bottom: 20px; color: #059669; }
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
          .status-full { background: #d1fae5; color: #065f46; }
          .status-partial { background: #fef3c7; color: #92400e; }
          .status-advance { background: #dbeafe; color: #1e40af; }
          .method-badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #f1f5f9; color: #475569; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${_asmName.toUpperCase()}</h1>
          <p>Revenue Management System — Official Payment Receipt</p>
        </div>
        <div class="receipt-title">PAYMENT RECEIPT</div>
        <div class="info-grid">
          <div class="info-item"><div class="label">Receipt Number</div><div class="value">${p.receiptNo}</div></div>
          <div class="info-item"><div class="label">Payment Date</div><div class="value">${p.date}</div></div>
          <div class="info-item"><div class="label">Bill Number</div><div class="value">${p.billNo}</div></div>
          <div class="info-item"><div class="label">Payment Status</div><div class="value"><span class="status-badge status-${p.status.toLowerCase()}">${p.status.toUpperCase()}</span></div></div>
        </div>
        <div class="section-title">Payment Details</div>
        <div class="info-grid">
          <div class="info-item"><div class="label">Business / Entity</div><div class="value">${p.business}</div></div>
          <div class="info-item"><div class="label">Payment Method</div><div class="value"><span class="method-badge">${p.method}</span></div></div>
          <div class="info-item"><div class="label">Reference #</div><div class="value">${p.reference || 'N/A'}</div></div>
          <div class="info-item"><div class="label">Field Officer</div><div class="value">${p.fieldOfficer}</div></div>
        </div>
        <div class="section-title">Amount Summary</div>
        <table class="amount-table">
          <thead><tr><th>Description</th><th style="text-align:right">Amount (GH₵)</th></tr></thead>
          <tbody>
            <tr><td>Amount Paid</td><td style="text-align:right">${formatCurrency(p.amount)}</td></tr>
            <tr><td>Outstanding Balance</td><td style="text-align:right">${p.balance > 0 ? formatCurrency(p.balance) : 'GH₵ 0.00 (Settled)'}</td></tr>
            <tr class="total-row"><td>Total Amount Paid</td><td style="text-align:right">${formatCurrency(p.amount)}</td></tr>
          </tbody>
        </table>
        ${p.remarks ? '<div style="margin-top:20px"><div class="section-title">Remarks</div><p style="font-size:13px;color:#475569;">' + p.remarks + '</p></div>' : ''}
        <div style="text-align:center;margin-top:30px;padding:16px;border:1px solid #e2e8f0;border-radius:8px;">
          <p style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Scan to Verify</p>
          ${barcodeSvg}
          <p style="font-size:9px;color:#94a3b8;margin-top:6px;">${getVerificationUrl(barcodeData)}</p>
        </div>
        <div class="footer">
          Thank you for your payment.<br/>
          This receipt is computer generated and does not require a signature.<br/><br/>
          Designed &amp; Powered by <strong>Clipe Consult</strong><br/>
          www.clipeconsult.com
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.onload = () => { printWin.print(); };
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-sm text-gray-500 mt-1">Record, track and manage all revenue payments</p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Record Payment
        </button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Payments', value: totalPayments.toLocaleString(), icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Collected', value: formatCurrency(totalCollected), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Today', value: formatCurrency(todayPayments), icon: CalendarCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Pending Balance', value: formatCurrency(totalPending), icon: Clock, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search receipts, bills, business…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
            />
          </div>
          {/* Date From */}
          <div className="relative">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
            />
          </div>
          {/* Date To */}
          <div className="relative">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
            />
          </div>
          {/* Method */}
          <div className="relative">
            <select
              value={methodFilter}
              onChange={(e) => { setMethodFilter(e.target.value); setCurrentPage(1); }}
              className="w-full appearance-none rounded-lg border border-gray-300 py-2 pl-3 pr-9 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition cursor-pointer"
            >
              <option value="All">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Mobile Money">Mobile Money</option>
              <option value="Bank">Bank Transfer</option>
              <option value="POS">POS</option>
              <option value="Online">Online</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          {/* Status */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full appearance-none rounded-lg border border-gray-300 py-2 pl-3 pr-9 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Full">Full</option>
              <option value="Partial">Partial</option>
              <option value="Advance">Advance</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Receipt #</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Bill #</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Business</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Amount</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Balance</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Collector</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Method</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                    No payments found matching your filters.
                  </td>
                </tr>
              ) : (
                paginated.map((p) => {
                  const m = methodBadge[p.method];
                  const s = statusBadge[p.status];
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-emerald-700">{p.receiptNo}</td>
                      <td className="px-4 py-3 text-gray-600">{p.billNo}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium max-w-[200px] truncate">{p.business}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-semibold whitespace-nowrap">{formatCurrency(p.amount)}</td>
                      <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${p.balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {p.balance > 0 ? formatCurrency(p.balance) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.date}</td>
                      <td className="px-4 py-3 text-gray-700">{p.fieldOfficer}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.bg}`}>
                          {m.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                          {s.text}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleViewPayment(p)}
                            className="rounded-md p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-md p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Delete"
                            onClick={() => handleDelete(p.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} of {filtered.length} payments
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 w-8 rounded-md text-xs font-semibold transition cursor-pointer ${
                    page === currentPage
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── View Payment Modal ─────────────────────────────────────────── */}
      {viewingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewingPayment(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="text-center border-b-2 border-dashed border-gray-300 dark:border-slate-600 px-6 py-5">
              <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-wider uppercase">{asmName}</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Revenue Management System</p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-3 tracking-wide">PAYMENT RECEIPT</p>
            </div>

            {/* Receipt Info */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-medium">Receipt #</p>
                <p className="text-sm font-mono font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">{viewingPayment.receiptNo}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-medium">Payment Date</p>
                <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mt-0.5">{viewingPayment.date}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-medium">Bill #</p>
                <p className="text-sm font-mono font-medium text-gray-700 dark:text-slate-300 mt-0.5">{viewingPayment.billNo}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-medium">Status</p>
                <div className="mt-1">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[viewingPayment.status].bg}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusBadge[viewingPayment.status].dot}`} />
                    {statusBadge[viewingPayment.status].text}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-medium mb-2">Payment Details</p>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase">Business / Entity</p>
                    <p className="font-medium text-gray-900 dark:text-white">{viewingPayment.business}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase">Payment Method</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${methodBadge[viewingPayment.method].bg}`}>
                      {methodBadge[viewingPayment.method].text}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Hash className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase">Reference #</p>
                    <p className="font-medium text-gray-700 dark:text-slate-300">{viewingPayment.reference || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase">Field Officer</p>
                    <p className="font-medium text-gray-700 dark:text-slate-300">{viewingPayment.fieldOfficer}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Amount Summary */}
            <div className="px-6 py-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-medium mb-3">Amount Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400">Amount Paid</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(viewingPayment.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400">Outstanding Balance</span>
                  <span className={`font-medium ${viewingPayment.balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                    {viewingPayment.balance > 0 ? formatCurrency(viewingPayment.balance) : 'Settled'}
                  </span>
                </div>
                <div className="border-t-2 border-gray-900 dark:border-slate-100 pt-2 mt-2 flex justify-between">
                  <span className="font-bold text-gray-900 dark:text-white">Total Paid</span>
                  <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{formatCurrency(viewingPayment.amount)}</span>
                </div>
              </div>
            </div>

            {viewingPayment.remarks && (
              <div className="px-6 pb-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-medium mb-1">Remarks</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">{viewingPayment.remarks}</p>
              </div>
            )}

            {/* Barcode Verification */}
            <div className="px-6 pb-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <ScanBarcode className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">Verification Barcode</p>
                </div>
                <div className="flex justify-center">
                  <canvas ref={payBarcodeRef} className="max-w-full" />
                </div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-2 break-all">{viewingPayment ? getVerificationUrl(getPayBarcodeData(viewingPayment, asmName)) : ''}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 border-t border-gray-200 dark:border-slate-700 px-6 py-4">
              <button
                onClick={() => navigator.clipboard.writeText(viewingPayment.receiptNo)}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Receipt #
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setViewingPayment(null)} className="rounded-lg border border-gray-300 bg-white dark:bg-slate-800 dark:border-slate-600 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer">
                  Close
                </button>
                <button onClick={() => handlePrintPayment(viewingPayment)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer">
                  <Printer className="h-4 w-4" />
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Record Payment Modal ─────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          {/* Panel */}
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                  <Plus className="h-5 w-5 text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
              </div>
              <button
                onClick={closeModal}
                className="rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
              {/* 1. Select Revenue Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Revenue Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={payRevenueCategory}
                    onChange={(e) => {
                      setPayRevenueCategory(e.target.value as BillType | '');
                      setSelectedBillNo('');
                    }}
                    className="w-full appearance-none rounded-lg border border-gray-300 py-2.5 pl-3 pr-9 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition cursor-pointer"
                  >
                    <option value="">Select revenue category…</option>
                    {BILL_TYPE_OPTIONS.map((bt) => (
                      <option key={bt.value} value={bt.value}>{bt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* 2. Select Bill Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Bill Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedBillNo}
                    onChange={(e) => setSelectedBillNo(e.target.value)}
                    disabled={!payRevenueCategory}
                    className="w-full appearance-none rounded-lg border border-gray-300 py-2.5 pl-3 pr-9 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{payRevenueCategory ? 'Select a bill…' : 'Select a revenue category first'}</option>
                    {availableBills.map((b) => (
                      <option key={b.billNo} value={b.billNo}>
                        {b.billNo} — {b.uniqueNumber}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
                {payRevenueCategory && availableBills.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">No unpaid bills found for this category.</p>
                )}
              </div>

              {/* 3. Business Name (Autofill) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  type="text"
                  readOnly
                  value={autoFill.business}
                  placeholder="Auto-filled from bill"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm text-gray-700 cursor-not-allowed"
                />
              </div>

              {/* 4. Owner Name (Autofill) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                <input
                  type="text"
                  readOnly
                  value={autoFill.owner}
                  placeholder="Auto-filled from bill"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm text-gray-700 cursor-not-allowed"
                />
              </div>

              {/* 5. Bill Balance (Autofill) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill Balance</label>
                <input
                  type="text"
                  readOnly
                  value={selectedBillNo ? formatCurrency(autoFill.balance) : '—'}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm font-semibold text-emerald-700 cursor-not-allowed"
                />
              </div>

              {/* 6. Field Officer (Autofill) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Officer</label>
                <input
                  type="text"
                  readOnly
                  value={autoFill.fieldOfficer || '—'}
                  placeholder="Auto-filled from bill"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm text-gray-700 cursor-not-allowed"
                />
              </div>

              {/* 7. Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (GH₵) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                />
              </div>

              {/* 8. Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <div className="relative">
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full appearance-none rounded-lg border border-gray-300 py-2.5 pl-3 pr-9 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition cursor-pointer"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="POS">POS</option>
                    <option value="Online">Online</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* 9. Reference Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                <input
                  type="text"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder="e.g. MTN-12345"
                  className="w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                />
              </div>

              {/* 10. Remarks / Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / Comment</label>
                <textarea
                  rows={3}
                  value={payRemarks}
                  onChange={(e) => setPayRemarks(e.target.value)}
                  placeholder="Optional notes about this payment…"
                  className="w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!payRevenueCategory || !selectedBillNo || !payAmount}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
