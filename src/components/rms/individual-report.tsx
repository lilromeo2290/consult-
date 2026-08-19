'use client';

import { useState, useMemo } from 'react';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import { assemblyHeaderHTML } from '@/lib/utils';
import {
  UserCircle,
  Printer,
  X,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number): string => `GH₵ ${n.toLocaleString('en-GH')}`;

// ─── Component ────────────────────────────────────────────────────────────────

export function IndividualReportPage() {
  const [billsData] = useSyncedStorage<any[]>('rms-bills', []);
  const [payData] = useSyncedStorage<any[]>('rms-payments', []);

  const [indStmtType, setIndStmtType] = useState<string>('Business');
  const [indCustomer, setIndCustomer] = useState('');
  const [indUniqueNo, setIndUniqueNo] = useState('');
  const [indDateFrom, setIndDateFrom] = useState('');
  const [indDateTo, setIndDateTo] = useState('');

  const individualReport = useMemo(() => {
    const billTypeMap: Record<string, string> = { Business: 'BOP', Property: 'Property Rate', Rent: 'Rent', Fines: 'Fine', 'Building Permit': 'BP' };
    const billType = billTypeMap[indStmtType] || '';
    if (!billType) return null;

    let typeBills = billsData.filter((b: any) => b.billType === billType);

    if (indDateFrom) typeBills = typeBills.filter((b: any) => (b.date || '') >= indDateFrom);
    if (indDateTo) typeBills = typeBills.filter((b: any) => (b.date || '') <= indDateTo);

    let matchedBills: any[] = [];
    if (indUniqueNo.trim()) {
      matchedBills = typeBills.filter((b: any) => (b.uniqueNumber || '').toLowerCase().includes(indUniqueNo.toLowerCase()));
    } else if (indCustomer.trim()) {
      const q = indCustomer.toLowerCase();
      matchedBills = typeBills.filter((b: any) =>
        (b.businessName || '').toLowerCase().includes(q) ||
        (b.owner || '').toLowerCase().includes(q)
      );
    } else {
      matchedBills = typeBills;
    }

    if (matchedBills.length === 0) return null;

    const grouped = new Map<string, any[]>();
    matchedBills.forEach((b) => {
      const key = b.uniqueNumber || b.billNumber;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(b);
    });

    const results: { customer: string; uniqueNumber: string; statementType: string; rows: { date: string; description: string; ref: string; billDR: number; receiptCR: number; balance: number }[]; totalBilled: number; totalPaid: number; balance: number }[] = [];

    grouped.forEach((bills, uniqueNum) => {
      bills.sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));
      const customerName = bills[0].businessName || bills[0].owner || 'Unknown';
      const rows: { date: string; description: string; ref: string; billDR: number; receiptCR: number; balance: number }[] = [];
      let balance = 0;
      let totalBilled = 0;
      let totalPaid = 0;

      let entityPayments = (payData as any[]).filter((p: any) => {
        const pDate = p.date || p.paymentDate || '';
        if (indDateFrom && pDate < indDateFrom) return false;
        if (indDateTo && pDate > indDateTo) return false;
        return bills.some((b) => b.billNumber === (p.billNo || p.billNumber));
      });

      bills.forEach((bill) => {
        const billAmt = bill.amountDue || bill.charge || 0;
        balance += billAmt;
        totalBilled += billAmt;
        rows.push({ date: bill.date || '', description: bill.revenueDescription || bill.description || 'Bill', ref: bill.billNumber || '', billDR: billAmt, receiptCR: 0, balance });

        const billPayments = entityPayments.filter((p: any) => p.billNo === bill.billNumber);
        billPayments.forEach((p) => {
          const payAmt = p.amount || 0;
          balance = Math.max(0, balance - payAmt);
          totalPaid += payAmt;
          rows.push({ date: p.date || p.paymentDate || '', description: 'Payment', ref: p.receiptNumber || p.receiptNo || '', billDR: 0, receiptCR: payAmt, balance: balance > 0 ? balance : 0 });
        });
      });

      if (rows.length > 0) {
        results.push({ customer: customerName, uniqueNumber: uniqueNum, statementType: indStmtType, rows, totalBilled, totalPaid, balance });
      }
    });

    return results;
  }, [indStmtType, indCustomer, indUniqueNo, indDateFrom, indDateTo, billsData, payData]);

  const handlePrint = (stmtIndex?: number) => {
    if (!individualReport || individualReport.length === 0) return;
    const stmts = stmtIndex !== undefined ? [individualReport[stmtIndex]] : individualReport;

    const filterMeta = `<div style="display:flex;flex-wrap:wrap;gap:6px 24px;padding:6px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;margin-bottom:16px;font-size:11px;color:#64748b;"><span><strong>Statement:</strong> ${indStmtType}</span>${indCustomer ? `<span><strong>Customer:</strong> ${indCustomer}</span>` : ''}${indUniqueNo ? `<span><strong>Unique #:</strong> ${indUniqueNo}</span>` : ''}${indDateFrom ? `<span><strong>From:</strong> ${indDateFrom}</span>` : ''}${indDateTo ? `<span><strong>To:</strong> ${indDateTo}</span>` : ''}</div>`;

    const stmtsHtml = stmts.map(stmt => {
      const sRows = stmt.rows.map(r => `<tr><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:11px;">${r.date}</td><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:11px;">${r.description}</td><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:11px;">${r.ref||'—'}</td><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;">${r.billDR>0?fmtCurrency(r.billDR):'—'}</td><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;">${r.receiptCR>0?fmtCurrency(r.receiptCR):'—'}</td><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;">${r.balance>0?fmtCurrency(r.balance):'—'}</td></tr>`).join('');
      return `<div style="margin-bottom:20px;"><div style="padding:6px 8px;background:#f8fafc;border-bottom:1px solid #e2e8f0;margin-bottom:8px;"><strong style="font-size:12px;">${stmt.customer}</strong><span style="font-size:11px;color:#64748b;margin-left:8px;">${stmt.uniqueNumber}</span></div><div style="display:flex;gap:24px;padding:6px 8px;background:#f1f5f9;font-size:11px;margin-bottom:8px;"><span>Total Billed: <strong>${fmtCurrency(stmt.totalBilled)}</strong></span><span>Total Paid: <strong style="color:#E31E24;">${fmtCurrency(stmt.totalPaid)}</strong></span><span>Balance: <strong>${fmtCurrency(stmt.balance)}</strong></span></div><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f1f5f9;border-bottom:1px solid #e2e8f0;"><th style="text-align:left;padding:4px 8px;font-size:10px;text-transform:uppercase;color:#64748b;">Date</th><th style="text-align:left;padding:4px 8px;font-size:10px;text-transform:uppercase;color:#64748b;">Description</th><th style="text-align:left;padding:4px 8px;font-size:10px;text-transform:uppercase;color:#64748b;">Ref #</th><th style="text-align:right;padding:4px 8px;font-size:10px;text-transform:uppercase;color:#64748b;">Bill/DR</th><th style="text-align:right;padding:4px 8px;font-size:10px;text-transform:uppercase;color:#64748b;">Receipt/CR</th><th style="text-align:right;padding:4px 8px;font-size:10px;text-transform:uppercase;color:#64748b;">Balance</th></tr></thead><tbody>${sRows}</tbody></table></div>`;
    }).join(stmts.length > 1 ? '<div style="page-break-before:always;"></div>' : '');

    const w = window.open('', '_blank', 'width=794,height=1123');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Individual Report</title><style>@page{size:A4;margin:15mm;}*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Tahoma,sans-serif;color:#1e293b;}.header{text-align:center;border-bottom:3px double #1e293b;padding-bottom:12px;margin-bottom:16px;}.header h1{font-size:18px;font-weight:700;letter-spacing:0.05em;}.header p{font-size:11px;color:#64748b;margin-top:3px;}.report-title{text-align:center;font-size:15px;font-weight:600;margin-bottom:4px;color:#E31E24;}.report-meta{text-align:center;font-size:11px;color:#94a3b8;margin-bottom:16px;}</style></head><body><div class="header">${assemblyHeaderHTML('Revenue Management System')}</div><div class="report-title">Individual Report — ${indStmtType}</div><div class="report-meta">Generated: ${new Date().toLocaleString()}</div>${filterMeta}${stmtsHtml}<div style="margin-top:40px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#94a3b8;">This is a computer-generated document and does not require a signature.<br/>Designed, Developed &amp; Maintained by <strong>Clipe Consult</strong> | www.clipeconsult.com</div></body></html>`);
    w.document.close();
    w.onload = () => { w.print(); };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Individual Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View statement for a specific customer
          </p>
        </div>
        {individualReport && individualReport.length > 0 && (
          <button onClick={() => handlePrint()} className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-3 py-2 text-sm font-medium hover:bg-destructive transition-colors cursor-pointer">
            <Printer className="w-4 h-4" />
            Print All ({individualReport.length})
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white dark:bg-muted border border-border p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {/* Statement */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground font-medium w-28 shrink-0">Statement</label>
            <select
              value={indStmtType}
              onChange={(e) => setIndStmtType(e.target.value)}
              className="flex-1 rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Business">Business</option>
              <option value="Property">Property</option>
              <option value="Rent">Rent</option>
              <option value="Fines">Fines</option>
              <option value="Building Permit">Building Permit</option>
            </select>
          </div>
          {/* Customer Name */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground font-medium w-28 shrink-0">Customer Name</label>
            <input type="text" value={indCustomer} onChange={(e) => setIndCustomer(e.target.value)} placeholder="Name..." className="flex-1 rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          {/* Unique Number */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground font-medium w-28 shrink-0">Unique Number</label>
            <input type="text" value={indUniqueNo} onChange={(e) => setIndUniqueNo(e.target.value)} placeholder="Unique #..." className="flex-1 rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          {/* Date From */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground font-medium w-28 shrink-0">Date From</label>
            <input type="date" value={indDateFrom} onChange={(e) => setIndDateFrom(e.target.value)} className="flex-1 rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          {/* Date To */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground font-medium w-28 shrink-0">Date To</label>
            <input type="date" value={indDateTo} onChange={(e) => setIndDateTo(e.target.value)} className="flex-1 rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        {/* Clear */}
        <div className="flex justify-end pt-3">
          <button onClick={() => { setIndCustomer(''); setIndUniqueNo(''); setIndDateFrom(''); setIndDateTo(''); }} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        </div>
      </div>

      {/* Results */}
      {!individualReport || individualReport.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-muted border border-border">
          <div className="text-center py-16 text-muted-foreground">
            <UserCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No statement found.</p>
            <p className="text-xs mt-1">Adjust the filters above.</p>
          </div>
        </div>
      ) : (
        individualReport.map((stmt, sIdx) => (
          <div key={sIdx} className="rounded-xl bg-white dark:bg-muted border border-border overflow-hidden">
            {/* Customer header */}
            <div className="px-5 py-3 bg-muted/40 dark:bg-slate-700/40 border-b border-border flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-foreground">{stmt.customer}</span>
                <span className="text-xs text-muted-foreground ml-3">{stmt.uniqueNumber}</span>
              </div>
              <button onClick={() => handlePrint(sIdx)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white dark:bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-card transition-colors cursor-pointer">
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </div>
            {/* Summary bar */}
            <div className="flex gap-6 px-5 py-2.5 bg-card/50 dark:bg-slate-700/30 border-b border-border text-xs">
              <span className="text-muted-foreground">Billed: <strong className="text-foreground">{fmtCurrency(stmt.totalBilled)}</strong></span>
              <span className="text-muted-foreground">Paid: <strong className="text-primary dark:text-primary">{fmtCurrency(stmt.totalPaid)}</strong></span>
              <span className="text-muted-foreground">Balance: <strong className="text-foreground">{fmtCurrency(stmt.balance)}</strong></span>
            </div>
            {/* Statement table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-card/30">
                  <tr className="border-b border-border">
                    <th className="text-[11px] uppercase text-muted-foreground font-medium px-4 py-2">Date</th>
                    <th className="text-[11px] uppercase text-muted-foreground font-medium px-4 py-2">Item Description</th>
                    <th className="text-[11px] uppercase text-muted-foreground font-medium px-4 py-2">Ref #</th>
                    <th className="text-[11px] uppercase text-muted-foreground font-medium px-4 py-2 text-right">Bill / DR</th>
                    <th className="text-[11px] uppercase text-muted-foreground font-medium px-4 py-2 text-right">Receipt / CR</th>
                    <th className="text-[11px] uppercase text-muted-foreground font-medium px-4 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {stmt.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-card/50 transition-colors">
                      <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{row.date}</td>
                      <td className="px-4 py-2 text-sm text-foreground">{row.description}</td>
                      <td className="px-4 py-2 text-sm font-mono text-muted-foreground">{row.ref || '—'}</td>
                      <td className="px-4 py-2 text-sm text-right text-foreground">{row.billDR > 0 ? fmtCurrency(row.billDR) : '—'}</td>
                      <td className="px-4 py-2 text-sm text-right text-primary dark:text-primary">{row.receiptCR > 0 ? fmtCurrency(row.receiptCR) : '—'}</td>
                      <td className="px-4 py-2 text-sm text-right font-semibold text-foreground">{row.balance > 0 ? fmtCurrency(row.balance) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
