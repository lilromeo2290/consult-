'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Eye,
  Printer,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Receipt,
  CalendarCheck,
  UserCheck,
  Building2,
  DollarSign,
  FileCheck,
  Copy,
  Check,
  ScanBarcode,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { encodeBarcodeData, getVerificationUrl } from '@/lib/barcode-utils';
import { assemblyHeaderHTML } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type PaymentMethod = 'Cash' | 'Mobile Money' | 'Bank Transfer' | 'POS' | 'Online';
type ReceiptStatus = 'Valid' | 'Voided' | 'Duplicate';

interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Receipt {
  id: string;
  receiptNo: string;
  billNo: string;
  issuedTo: string;
  entityType: 'Business' | 'Property';
  issuedBy: string;
  amount: number;
  penalty: number;
  totalPaid: number;
  method: PaymentMethod;
  reference: string;
  date: string;
  time: string;
  status: ReceiptStatus;
  revenueItem: string;
  zone: string;
  ward: string;
  items: ReceiptItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number): string => `GH₵ ${n.toLocaleString('en-GH')}`;

const methodStyle: Record<PaymentMethod, string> = {
  Cash: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Mobile Money': 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  'Bank Transfer': 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  POS: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Online: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
};

const statusStyle: Record<ReceiptStatus, { pill: string; icon: string }> = {
  Valid: { pill: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary', icon: 'text-destructive' },
  Voided: { pill: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: 'text-red-500' },
  Duplicate: { pill: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: 'text-amber-500' },
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockReceipts: Receipt[] = [];

// ─── Component ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 8;

export function ReceiptsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ReceiptStatus>('All');
  const [methodFilter, setMethodFilter] = useState<'All' | PaymentMethod>('All');
  const [page, setPage] = useState(1);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return mockReceipts.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.receiptNo.toLowerCase().includes(q) ||
        r.issuedTo.toLowerCase().includes(q) ||
        r.issuedBy.toLowerCase().includes(q) ||
        r.billNo.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchMethod = methodFilter === 'All' || r.method === methodFilter;
      return matchSearch && matchStatus && matchMethod;
    });
  }, [search, statusFilter, methodFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Generate Barcode SVG as string ─────────────────────────────────
  const getBarcodeSvg = (r: Receipt): string => {
    const _aName = (() => { try { const r = JSON.parse(localStorage.getItem('rms-settings-assembly') || '{}'); return r.name || 'Clipe Revenue Management System'; } catch { return 'Clipe Revenue Management System'; } })();
    const encoded = encodeBarcodeData({
      type: 'RECEIPT',
      refNo: r.receiptNo,
      issuedTo: r.issuedTo,
      entityType: r.entityType,
      amount: r.totalPaid,
      date: r.date,
      revenueItem: r.revenueItem,
      method: r.method,
      status: r.status,
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

  const getBarcodeData = (r: Receipt): string => {
    const _aName = (() => { try { const r = JSON.parse(localStorage.getItem('rms-settings-assembly') || '{}'); return r.name || 'Clipe Revenue Management System'; } catch { return 'Clipe Revenue Management System'; } })();
    return encodeBarcodeData({
      type: 'RECEIPT',
      refNo: r.receiptNo,
      issuedTo: r.issuedTo,
      entityType: r.entityType,
      amount: r.totalPaid,
      date: r.date,
      revenueItem: r.revenueItem,
      method: r.method,
      status: r.status,
      assemblyName: _aName,
    });
  };

  // ── Barcode canvas ref for modal ──────────────────────────────────────
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (selectedReceipt && barcodeCanvasRef.current) {
      try {
        JsBarcode(barcodeCanvasRef.current, getBarcodeData(selectedReceipt), {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: false,
          margin: 0,
          fontSize: 10,
        });
      } catch { /* barcode render failure */ }
    }
  }, [selectedReceipt]);

  const _asmName = () => { try { const r = JSON.parse(localStorage.getItem('rms-settings-assembly') || '{}'); return r.name || 'Clipe Revenue Management System'; } catch { return 'Clipe Revenue Management System'; } };
  const _asmDesc = () => { try { const r = JSON.parse(localStorage.getItem('rms-settings-assembly') || '{}'); return r.description || ''; } catch { return ''; } };
  const handlePrintReceipt = (r: Receipt) => {
    const barcodeSvg = getBarcodeSvg(r);
    const itemsRows = r.items.map((item) => `
              <tr>
                <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${item.description}</td>
                <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">${item.quantity}</td>
                <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">${fmtCurrency(item.unitPrice)}</td>
                <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:500;">${fmtCurrency(item.amount)}</td>
              </tr>`).join('');

    const printWin = window.open('', '_blank', 'width=794,height=1123');
    if (!printWin) return;
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${r.receiptNo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; }
          .header { text-align: center; border-bottom: 3px double #1e293b; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { font-size: 20px; font-weight: 700; letter-spacing: 0.05em; }
          .header p { font-size: 12px; color: #64748b; margin-top: 4px; }
          .receipt-title { text-align: center; font-size: 16px; font-weight: 600; margin-bottom: 20px; color: var(--destructive); }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
          .info-item { font-size: 13px; }
          .info-item .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
          .info-item .value { font-weight: 600; margin-top: 2px; }
          .section-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; margin-top: 20px; }
          .items-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
          .items-table th { text-align: left; padding: 8px 12px; background: #f8fafc; color: #64748b; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
          .items-table td { padding: 6px 12px; border-bottom: 1px solid #f1f5f9; }
          .items-table tfoot td { font-size: 15px; font-weight: 700; border-top: 2px solid #1e293b; background: #f8fafc; }
          .status-badge { display: inline-block; padding: 3px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
          .status-valid { background: #d1fae5; color: #065f46; }
          .status-voided { background: #fee2e2; color: #991b1b; }
          .status-duplicate { background: #fef3c7; color: #92400e; }
          .method-badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #f1f5f9; color: #475569; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
          .voided-stamp { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 48px; font-weight: 900; color: rgba(239,68,68,0.25); border: 6px solid rgba(239,68,68,0.25); padding: 8px 32px; border-radius: 12px; letter-spacing: 0.1em; text-transform: uppercase; pointer-events: none; }
          @page { size: A4; margin: 15mm; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div style="position:relative;">
          ${r.status === 'Voided' ? '<div class="voided-stamp">VOIDED</div>' : ''}
          <div class="header">
            ${assemblyHeaderHTML('Revenue Management System — Official Receipt')}
          </div>
          <div class="receipt-title">OFFICIAL RECEIPT</div>
          <div class="info-grid">
            <div class="info-item"><div class="label">Receipt Number</div><div class="value">${r.receiptNo}</div></div>
            <div class="info-item"><div class="label">Receipt Date</div><div class="value">${r.date} at ${r.time}</div></div>
            <div class="info-item"><div class="label">Bill Reference</div><div class="value">${r.billNo}</div></div>
            <div class="info-item"><div class="label">Status</div><div class="value"><span class="status-badge status-${r.status.toLowerCase()}">${r.status.toUpperCase()}</span></div></div>
          </div>
          <div class="section-title">Issued To</div>
          <div class="info-grid">
            <div class="info-item"><div class="label">Name</div><div class="value">${r.issuedTo}</div></div>
            <div class="info-item"><div class="label">Entity Type</div><div class="value">${r.entityType}</div></div>
            <div class="info-item"><div class="label">Zone / Ward</div><div class="value">${r.zone} — ${r.ward}</div></div>
            <div class="info-item"><div class="label">Collected By</div><div class="value">${r.issuedBy}</div></div>
          </div>
          <div class="section-title">Payment Details</div>
          <div class="info-grid">
            <div class="info-item"><div class="label">Revenue Item</div><div class="value">${r.revenueItem}</div></div>
            <div class="info-item"><div class="label">Payment Method</div><div class="value"><span class="method-badge">${r.method}</span></div></div>
            <div class="info-item"><div class="label">Transaction Reference</div><div class="value">${r.reference || 'N/A'}</div></div>
            <div class="info-item"><div class="label">Penalty Applied</div><div class="value">${r.penalty > 0 ? fmtCurrency(r.penalty) : 'None'}</div></div>
          </div>
          <div class="section-title">Line Items</div>
          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align:right">Qty</th>
                <th style="text-align:right">Unit Price</th>
                <th style="text-align:right">Amount</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding:8px 12px;text-align:right;">Total Paid</td>
                <td style="padding:8px 12px;text-align:right;">${fmtCurrency(r.totalPaid)}</td>
              </tr>
            </tfoot>
          </table>
          <div class="barcode-section" style="text-align:center;margin-top:30px;padding:16px;border:1px solid #e2e8f0;border-radius:8px;">
            <p style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Scan to Verify</p>
            ${barcodeSvg}
            <p style="font-size:9px;color:#94a3b8;margin-top:6px;">${getVerificationUrl(getBarcodeData(r))}</p>
          </div>
          <div class="footer">
            Thank you for your payment.<br/>
            This receipt is computer generated and does not require a signature.<br/><br/>
            Designed &amp; Powered by <strong>Clipe Consult</strong><br/>
            www.clipeconsult.com
          </div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.onload = () => { printWin.print(); };
  };

  const totalAmount = filtered.reduce((s, r) => s + r.totalPaid, 0);
  const validCount = filtered.filter((r) => r.status === 'Valid').length;
  const voidedCount = filtered.filter((r) => r.status === 'Voided').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Receipts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage all issued payment receipts
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white dark:bg-muted border border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary dark:text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Receipts</p>
            <p className="text-xl font-bold text-foreground">{filtered.length}</p>
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-muted border border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-primary dark:text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Collected</p>
            <p className="text-xl font-bold text-foreground">{fmtCurrency(totalAmount)}</p>
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-muted border border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <FileCheck className="w-5 h-5 text-primary dark:text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Valid / Voided</p>
            <p className="text-xl font-bold text-foreground">{validCount} / {voidedCount}</p>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-xl bg-white dark:bg-muted border border-border overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search receipts by number, entity, or issuer..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full rounded-lg border-border bg-card pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
              />
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-card dark:hover:bg-muted transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as 'All' | ReceiptStatus); setPage(1); }}
                className="rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="All">All Statuses</option>
                <option value="Valid">Valid</option>
                <option value="Voided">Voided</option>
                <option value="Duplicate">Duplicate</option>
              </select>
              <select
                value={methodFilter}
                onChange={(e) => { setMethodFilter(e.target.value as 'All' | PaymentMethod); setPage(1); }}
                className="rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="All">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="POS">POS</option>
                <option value="Online">Online</option>
              </select>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-card/50 sticky top-0 z-10">
              <tr className="border-b border-border">
                <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">Receipt #</th>
                <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">Issued To</th>
                <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">Revenue Item</th>
                <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3 text-right">Amount</th>
                <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">Method</th>
                <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">Date</th>
                <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">Status</th>
                <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-sm text-muted-foreground dark:text-muted-foreground">
                    No receipts found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((r) => (
                  <tr key={r.id} className="hover:bg-card dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-foreground font-medium">{r.receiptNo}</span>
                        <button
                          onClick={() => handleCopy(r.receiptNo, r.id)}
                          className="text-muted-foreground hover:text-primary dark:hover:dark:text-primary transition-colors"
                          aria-label="Copy receipt number"
                        >
                          {copiedId === r.id ? <Check className="w-3 h-3 text-destructive" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{r.issuedTo}</p>
                        <p className="text-xs text-muted-foreground">{r.entityType}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground dark:text-muted-foreground">{r.revenueItem}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground text-right">{fmtCurrency(r.totalPaid)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${methodStyle[r.method]}`}>
                        {r.method}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-muted-foreground dark:text-muted-foreground">{r.date}</div>
                      <div className="text-xs text-muted-foreground dark:text-muted-foreground">{r.time}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle[r.status].pill}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedReceipt(r)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary dark:hover:dark:text-primary hover:bg-primary/10 dark:hover:dark:bg-primary/20 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrintReceipt(r)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary dark:hover:dark:text-primary hover:bg-primary/10 dark:hover:dark:bg-primary/20 transition-colors"
                          title="Print receipt"
                        >
                          <Printer className="w-4 h-4" />
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Showing {paginated.length} of {filtered.length} receipts
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground dark:hover:text-slate-300 hover:bg-muted dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  p === page
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-muted dark:hover:bg-slate-700'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground dark:hover:text-slate-300 hover:bg-muted dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedReceipt(null)} />
          <div className="relative bg-white dark:bg-muted rounded-xl border-border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-primary dark:text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Receipt Details</h2>
                  <p className="text-sm font-mono text-muted-foreground">{selectedReceipt.receiptNo}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground dark:hover:text-slate-300 hover:bg-muted dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle[selectedReceipt.status].pill}`}>
                  {selectedReceipt.status}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => handlePrintReceipt(selectedReceipt)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white px-3 py-1.5 text-sm font-medium hover:bg-destructive transition-colors cursor-pointer">
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                  <button onClick={() => handlePrintReceipt(selectedReceipt)} className="inline-flex items-center gap-1.5 rounded-lg border-border text-foreground px-3 py-1.5 text-sm font-medium hover:bg-card dark:hover:bg-slate-700 transition-colors cursor-pointer">
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </button>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Bill Reference" value={selectedReceipt.billNo} />
                <InfoField label="Payment Method" value={selectedReceipt.method} />
                <InfoField label="Transaction Ref" value={selectedReceipt.reference} />
                <InfoField label="Zone / Ward" value={`${selectedReceipt.zone} — ${selectedReceipt.ward}`} />
                <InfoField label="Collected By" value={selectedReceipt.issuedBy} />
                <InfoField label="Entity Type" value={selectedReceipt.entityType} />
              </div>

              {/* Issued To */}
              <div className="rounded-lg bg-card/50 p-4">
                <p className="text-xs uppercase text-muted-foreground font-medium mb-1">Issued To</p>
                <p className="text-lg font-semibold text-foreground">{selectedReceipt.issuedTo}</p>
              </div>

              {/* Line Items */}
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium mb-3">Line Items</p>
                <div className="rounded-lg border-border overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-card/50">
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Description</th>
                        <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">Qty</th>
                        <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">Unit Price</th>
                        <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {selectedReceipt.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-foreground">{item.description}</td>
                          <td className="px-3 py-2 text-muted-foreground dark:text-muted-foreground text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-muted-foreground dark:text-muted-foreground text-right">{fmtCurrency(item.unitPrice)}</td>
                          <td className="px-3 py-2 text-foreground font-medium text-right">{fmtCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-card/50">
                      <tr className="border-t border-border">
                        <td colSpan={3} className="px-3 py-2.5 text-sm font-semibold text-foreground text-right">Total Paid</td>
                        <td className="px-3 py-2.5 text-sm font-bold text-primary dark:text-primary text-right">{fmtCurrency(selectedReceipt.totalPaid)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Barcode Section */}
              <div className="rounded-lg border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ScanBarcode className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs uppercase text-muted-foreground font-medium">Verification Barcode</p>
                </div>
                <div className="flex flex-col items-center bg-card rounded-lg p-3">
                  <canvas ref={barcodeCanvasRef} className="max-w-full" />
                  <p className="text-[9px] text-muted-foreground dark:text-muted-foreground mt-2 text-center break-all">
                    Scan barcode or visit verify page to confirm authenticity
                  </p>
                </div>
              </div>

              {/* Date / Time */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><CalendarCheck className="w-4 h-4" />{selectedReceipt.date}</span>
                <span className="flex items-center gap-1.5"><UserCheck className="w-4 h-4" />{selectedReceipt.issuedBy}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

