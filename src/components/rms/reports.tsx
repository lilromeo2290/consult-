'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import { LOCALITIES } from '@/lib/localities';
import {
  BarChart3,
  Download,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Calendar,
  Building2,
  Home,
  DollarSign,
  Users,
  Receipt,
  PieChart,
  Target,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Printer,
  X,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RevenueBreakdown {
  category: string;
  budget: number;
  collected: number;
  target: number;
  percentage: number;
  officer: string;
}

interface ZoneReport {
  zone: string;
  businesses: number;
  properties: number;
  collected: number;
  target: number;
  compliance: number;
}

interface MonthlyComparison {
  month: string;
  currentYear: number;
  previousYear: number;
  change: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number): string => `GH₵ ${n.toLocaleString('en-GH')}`;
const fmtNumber = (n: number): string => n.toLocaleString('en-GH');

// ─── Mock Data ────────────────────────────────────────────────────────────────

const revenueBreakdown: RevenueBreakdown[] = [];

const zoneReports: ZoneReport[] = [];

const monthlyComparison: MonthlyComparison[] = [];

// ─── Component ────────────────────────────────────────────────────────────────

type ReportView = 'overview' | 'revenue' | 'zones' | 'monthly';

export function ReportsPage() {
  // Synced data for counts
  const [bizData] = useSyncedStorage<unknown[]>('rms-businesses', []);
  const [propData] = useSyncedStorage<unknown[]>('rms-properties', []);
  const [rentData] = useSyncedStorage<unknown[]>('rms-rents', []);
  const [payData] = useSyncedStorage<unknown[]>('rms-payments', []);
  const [billsData] = useSyncedStorage<any[]>('rms-bills', []);
  const [finesData] = useSyncedStorage<any[]>('rms-fines', []);
  const [bpData] = useSyncedStorage<any[]>('rms-building-permits', []);
  const [financialSettings] = useSyncedStorage<{ currentFinancialYear: string }>('rms-settings-financial', { currentFinancialYear: '' });

  // Unified report filters
  const [revenueTypeFilter, setRevenueTypeFilter] = useState<string>('Business');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterUniqueNo, setFilterUniqueNo] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterLocality, setFilterLocality] = useState('');
  const [filterRevenueItem, setFilterRevenueItem] = useState('');
  const [filterRevenueCode, setFilterRevenueCode] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const currentFY = financialSettings.currentFinancialYear || new Date().getFullYear().toString();
  const previousFY = String(Number(currentFY) - 1);

  const [view, setView] = useState<ReportView>('overview');
  const [period, setPeriod] = useState<'Monthly' | 'Quarterly' | 'Annually'>('Monthly');
  const [zoneFilter, setZoneFilter] = useState<string>('All');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const entityCount = bizData.length + propData.length + rentData.length;
  const receiptCount = payData.length;

  const filteredZones = useMemo(() => {
    if (zoneFilter === 'All') return zoneReports;
    return zoneReports.filter((z) => z.zone.includes(zoneFilter));
  }, [zoneFilter]);

  // Helper: filter bills by all unified criteria
  const filteredBills = useMemo(() => {
    let result = [...billsData];

    // Revenue type filter
    const billTypeMap: Record<string, string> = { Business: 'BOP', Property: 'Property Rate', Rent: 'Rent', Fines: 'Fine', BP: 'BP' };
    if (revenueTypeFilter && billTypeMap[revenueTypeFilter]) {
      result = result.filter((b: any) => b.billType === billTypeMap[revenueTypeFilter]);
    }

    // Customer name filter
    if (filterCustomer.trim()) {
      const q = filterCustomer.toLowerCase();
      result = result.filter((b: any) =>
        (b.businessName || '').toLowerCase().includes(q) ||
        (b.owner || '').toLowerCase().includes(q)
      );
    }

    // Unique number filter
    if (filterUniqueNo.trim()) {
      const q = filterUniqueNo.toLowerCase();
      result = result.filter((b: any) => (b.uniqueNumber || '').toLowerCase().includes(q));
    }

    // Date range filter
    if (filterDateFrom) {
      result = result.filter((b: any) => (b.date || '') >= filterDateFrom);
    }
    if (filterDateTo) {
      result = result.filter((b: any) => (b.date || '') <= filterDateTo);
    }

    // Locality filter
    if (filterLocality) {
      const q = filterLocality.toLowerCase();
      result = result.filter((b: any) => (b.locality || '').toLowerCase().includes(q));
    }

    // Revenue item (description) filter
    if (filterRevenueItem.trim()) {
      const q = filterRevenueItem.toLowerCase();
      result = result.filter((b: any) =>
        (b.revenueDescription || b.description || '').toLowerCase().includes(q)
      );
    }

    // Revenue code filter
    if (filterRevenueCode.trim()) {
      const q = filterRevenueCode.toLowerCase();
      result = result.filter((b: any) => (b.revenueCode || '').toLowerCase().includes(q));
    }

    return result;
  }, [billsData, revenueTypeFilter, filterCustomer, filterUniqueNo, filterDateFrom, filterDateTo, filterLocality, filterRevenueItem, filterRevenueCode]);

  // Also filter payments by date range
  const filteredPayments = useMemo(() => {
    let result = [...(payData as any[])];
    if (filterDateFrom) {
      result = result.filter((p: any) => (p.date || p.paymentDate || '') >= filterDateFrom);
    }
    if (filterDateTo) {
      result = result.filter((p: any) => (p.date || p.paymentDate || '') <= filterDateTo);
    }
    return result;
  }, [payData, filterDateFrom, filterDateTo]);

  // Column config per revenue type
  const columnConfig = useMemo(() => {
    switch (revenueTypeFilter) {
      case 'Property': return { col1: "Property Owner's Name", col2: 'Class' };
      case 'Business': return { col1: 'Business Name', col2: 'Class' };
      case 'Rent': return { col1: "Occupant's Name", col2: 'Rent Type' };
      case 'Fines': return { col1: "Offender's Name", col2: 'Fine Type' };
      case 'BP': return { col1: "Applicant's Name", col2: 'Development Type' };
      default: return { col1: 'Name', col2: 'Type' };
    }
  }, [revenueTypeFilter]);

  // A. Customers by Revenue Type: flat listing (uses filteredBills)
  const customerList = useMemo(() => {
    let rows: { col1: string; col2: string; amount: number }[] = [];

    if (revenueTypeFilter === 'Business') {
      (bizData as any[]).forEach((b: any) => {
        const bizBills = filteredBills.filter((bl: any) => bl.uniqueNumber === b.regNumber);
        if (bizBills.length === 0) return;
        const totalAmt = bizBills.reduce((s: number, bl: any) => s + (bl.amountDue || bl.charge || 0), 0);
        rows.push({ col1: b.name || '', col2: b.category || '', amount: totalAmt });
      });
    } else if (revenueTypeFilter === 'Property') {
      (propData as any[]).forEach((p: any) => {
        const propBills = filteredBills.filter((bl: any) => bl.uniqueNumber === p.propertyUniqueNumber);
        if (propBills.length === 0) return;
        const totalAmt = propBills.reduce((s: number, bl: any) => s + (bl.amountDue || bl.charge || 0), 0);
        rows.push({ col1: p.ownerName || '', col2: p.category || p.revenueDescription || '', amount: totalAmt });
      });
    } else if (revenueTypeFilter === 'Rent') {
      (rentData as any[]).forEach((r: any) => {
        const rentBills = filteredBills.filter((bl: any) => bl.uniqueNumber === (r.rentPropertyUniqueNumber || r.uniqueNumber));
        if (rentBills.length === 0) return;
        const totalAmt = rentBills.reduce((s: number, bl: any) => s + (bl.amountDue || bl.charge || 0), 0);
        rows.push({ col1: r.occupantName || '', col2: r.rentPropertyType || r.rentRevenueDescription || '', amount: totalAmt });
      });
    } else if (revenueTypeFilter === 'Fines') {
      (finesData as any[]).forEach((f: any) => {
        rows.push({ col1: f.nameOfOffender || '', col2: f.classDescription || f.category || '', amount: f.amountDue || f.charge || 0 });
      });
    } else if (revenueTypeFilter === 'BP') {
      (bpData as any[]).forEach((bp: any) => {
        const bpBills = filteredBills.filter((bl: any) => bl.uniqueNumber === bp.permitNumber);
        if (bpBills.length === 0) return;
        const totalAmt = bpBills.reduce((s: number, bl: any) => s + (bl.amountDue || bl.charge || 0), 0);
        rows.push({ col1: bp.applicantFullName || '', col2: bp.typeOfDevelopment || '', amount: totalAmt });
      });
    }

    return rows;
  }, [revenueTypeFilter, filteredBills, bizData, propData, rentData, finesData, bpData]);

  // B. Customer Statements (uses filteredBills + filteredPayments)
  const customerStatements = useMemo(() => {
    const statements: { customer: string; uniqueNumber: string; rows: { date: string; description: string; ref: string; billDR: number; receiptCR: number; balance: number }[] }[] = [];

    const entityBills = new Map<string, any[]>();
    filteredBills.forEach((b) => {
      const key = b.uniqueNumber || b.billNumber;
      if (!entityBills.has(key)) entityBills.set(key, []);
      entityBills.get(key)!.push(b);
    });

    entityBills.forEach((bills) => {
      bills.sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));
      const customerName = bills[0].businessName || bills[0].owner || 'Unknown';
      const uniqueNum = bills[0].uniqueNumber || '';
      const rows: { date: string; description: string; ref: string; billDR: number; receiptCR: number; balance: number }[] = [];
      let balance = 0;

      bills.forEach((bill) => {
        const billAmt = bill.amountDue || bill.charge || 0;
        balance += billAmt;
        rows.push({ date: bill.date || '', description: 'Bill', ref: bill.billNumber || '', billDR: billAmt, receiptCR: 0, balance });

        const billPayments = filteredPayments.filter((p: any) => p.billNo === bill.billNumber);
        billPayments.forEach((p) => {
          const payAmt = p.amount || 0;
          balance = Math.max(0, balance - payAmt);
          rows.push({ date: p.date || p.paymentDate || '', description: 'Payment', ref: p.receiptNumber || p.receiptNo || '', billDR: 0, receiptCR: payAmt, balance: balance > 0 ? balance : 0 });
        });
      });

      if (rows.length > 0) {
        statements.push({ customer: customerName, uniqueNumber: uniqueNum, rows });
      }
    });

    statements.sort((a, b) => a.customer.localeCompare(b.customer));
    return statements;
  }, [filteredBills, filteredPayments]);

  // C. Detailed Collection by Revenue Items (uses filteredBills + filteredPayments)
  const revenueItems = useMemo(() => {
    const map = new Map<string, { code: string; description: string; target: number; collected: number }>();

    filteredBills.forEach((b: any) => {
      const code = b.revenueCode || '';
      const desc = b.revenueDescription || b.description || '';
      if (!code) return;

      const existing = map.get(code);
      const billAmt = b.amountDue || b.charge || 0;
      const paid = filteredPayments
        .filter((p: any) => p.billNo === b.billNumber)
        .reduce((s: number, p: any) => s + (p.amount || 0), 0);

      if (existing) {
        existing.target += billAmt;
        existing.collected += paid;
      } else {
        map.set(code, { code, description: desc, target: billAmt, collected: paid });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [filteredBills, filteredPayments]);

  const handlePrintReport = () => {
    const title = view === 'overview' ? 'Revenue Overview' : view === 'revenue' ? 'Revenue Breakdown' : view === 'zones' ? 'Zone Reports' : 'Monthly Comparison';
    let bodyContent = '';

    if (view === 'revenue') {
      const rows = revenueBreakdown.map((r) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;">${r.category}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;">${r.officer}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:right;">${fmtCurrency(r.budget)}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:right;">${fmtCurrency(r.collected)}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:right;">${fmtCurrency(r.target)}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:600;text-align:right;">${r.percentage}%</td></tr>`).join('');
      bodyContent = `<table style="width:100%;border-collapse:collapse;margin-top:12px;"><thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748b;">Category</th><th style="text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748b;">Officer</th><th style="text-align:right;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748b;">Budget</th><th style="text-align:right;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748b;">Collected</th><th style="text-align:right;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748b;">Target</th><th style="text-align:right;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748b;">Rate</th></tr></thead><tbody>${rows}</tbody><tfoot><tr style="border-top:2px solid #1e293b;background:#f8fafc;"><td colspan="2" style="padding:8px 10px;font-size:12px;font-weight:700;">Total</td><td style="padding:8px 10px;font-size:12px;font-weight:700;text-align:right;">${fmtCurrency(totalBudget)}</td><td style="padding:8px 10px;font-size:12px;font-weight:700;text-align:right;color:#E31E24;">${fmtCurrency(totalCollected)}</td><td style="padding:8px 10px;font-size:12px;font-weight:700;text-align:right;">${fmtCurrency(revenueBreakdown.reduce((s,r)=>s+r.target,0))}</td><td style="padding:8px 10px;font-size:12px;font-weight:700;text-align:right;">${overallCompliance}%</td></tr></tfoot></table>`;
    } else if (view === 'zones') {
      const zoneData = zoneFilter === 'All' ? zoneReports : zoneReports.filter(z => z.zone.includes(zoneFilter));
      const rows = zoneData.map((z) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:500;">${z.zone}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:right;">${z.businesses}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:right;">${z.properties}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:right;">${fmtCurrency(z.collected)}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:right;">${fmtCurrency(z.target)}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:600;text-align:right;">${z.compliance}%</td></tr>`).join('');
      bodyContent = `<table style="width:100%;border-collapse:collapse;margin-top:12px;"><thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748b;">Zone</th><th style="text-align:right;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748b;">Businesses</th><th style="text-align:right;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748b;">Properties</th><th style="text-align:right;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748b;">Collected</th><th style="text-align:right;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748b;">Target</th><th style="text-align:right;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748b;">Compliance</th></tr></thead><tbody>${rows}</tbody></table>`;
    } else if (view === 'monthly') {
      const rows = monthlyComparison.map((m) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:500;">${m.month}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:right;">${fmtCurrency(m.currentYear)}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:right;">${fmtCurrency(m.previousYear)}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:right;color:${m.change>=0?'#E31E24':'#dc2626'};font-weight:600;">${m.change>=0?'+':''}${m.change}%</td></tr>`).join('');
      bodyContent = `<table style="width:100%;border-collapse:collapse;margin-top:12px;"><thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748b;">Month</th><th style="text-align:right;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748b;">${currentFY}</th><th style="text-align:right;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748b;">${previousFY}</th><th style="text-align:right;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748b;">Change</th></tr></thead><tbody>${rows}</tbody><tfoot><tr style="border-top:2px solid #1e293b;background:#f8fafc;"><td style="padding:8px 10px;font-size:12px;font-weight:700;">Total</td><td style="padding:8px 10px;font-size:12px;font-weight:700;text-align:right;color:#E31E24;">${fmtCurrency(monthlyComparison.reduce((s,m)=>s+m.currentYear,0))}</td><td style="padding:8px 10px;font-size:12px;font-weight:700;text-align:right;">${fmtCurrency(monthlyComparison.reduce((s,m)=>s+m.previousYear,0))}</td><td style="padding:8px 10px;font-size:12px;font-weight:700;text-align:right;color:#E31E24;">+9.8%</td></tr></tfoot></table>`;
    } else {
      bodyContent = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;"><div style="padding:16px;border:1px solid #e2e8f0;border-radius:8px;"><p style="font-size:11px;color:#64748b;text-transform:uppercase;">Total Collected</p><p style="font-size:20px;font-weight:700;margin-top:4px;">${fmtCurrency(totalCollected)}</p><p style="font-size:11px;color:#94a3b8;margin-top:2px;">Budget: ${fmtCurrency(totalBudget)}</p></div><div style="padding:16px;border:1px solid #e2e8f0;border-radius:8px;"><p style="font-size:11px;color:#64748b;text-transform:uppercase;">Collection Rate</p><p style="font-size:20px;font-weight:700;margin-top:4px;">${overallCompliance}%</p><p style="font-size:11px;color:#94a3b8;margin-top:2px;">Target: 95%</p></div><div style="padding:16px;border:1px solid #e2e8f0;border-radius:8px;"><p style="font-size:11px;color:#64748b;text-transform:uppercase;">Registered Entities</p><p style="font-size:20px;font-weight:700;margin-top:4px;">${entityCount}</p><p style="font-size:11px;color:#94a3b8;margin-top:2px;">Businesses + Properties + Rents</p></div><div style="padding:16px;border:1px solid #e2e8f0;border-radius:8px;"><p style="font-size:11px;color:#64748b;text-transform:uppercase;">Receipts Issued</p><p style="font-size:20px;font-weight:700;margin-top:4px;">${receiptCount}</p><p style="font-size:11px;color:#94a3b8;margin-top:2px;">Total recorded</p></div></div><div style="margin-top:24px;"><h3 style="font-size:13px;font-weight:600;margin-bottom:12px;">Top Revenue Categories</h3><table style="width:100%;border-collapse:collapse;"><thead><tr style="border-bottom:1px solid #e2e8f0;"><th style="text-align:left;padding:6px 10px;font-size:11px;color:#64748b;">Category</th><th style="text-align:right;padding:6px 10px;font-size:11px;color:#64748b;">Budget</th><th style="text-align:right;padding:6px 10px;font-size:11px;color:#64748b;">Collected</th><th style="text-align:right;padding:6px 10px;font-size:11px;color:#64748b;">Rate</th></tr></thead><tbody>${revenueBreakdown.slice(0,5).map(r=>`<tr><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;">${r.category}</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:right;">${fmtCurrency(r.budget)}</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:right;">${fmtCurrency(r.collected)}</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:right;font-weight:600;">${r.percentage}%</td></tr>`).join('')}</tbody></table></div>`;
    }

    const w = window.open('', '_blank', 'width=794,height=1123');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Report - ${title}</title><style>@page{size:A4;margin:15mm;}*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Tahoma,sans-serif;color:#1e293b;}.header{text-align:center;border-bottom:3px double #1e293b;padding-bottom:12px;margin-bottom:16px;}.header h1{font-size:18px;font-weight:700;letter-spacing:0.05em;}.header p{font-size:11px;color:#64748b;margin-top:3px;}.report-title{text-align:center;font-size:15px;font-weight:600;margin-bottom:4px;color:#E31E24;}.report-meta{text-align:center;font-size:11px;color:#94a3b8;margin-bottom:20px;}</style></head><body><div class="header"><h1>KPANDO MUNICIPAL ASSEMBLY</h1><p>Revenue Management System</p></div><div class="report-title">${title}</div><div class="report-meta">Period: ${period} | Generated: ${new Date().toLocaleString()}</div>${bodyContent}<div style="margin-top:40px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#94a3b8;">This is a computer-generated document and does not require a signature.<br/>Designed, Developed &amp; Maintained by <strong>Clipe Consult</strong> | www.clipeconsult.com</div></body></html>`);
    w.document.close();
    w.onload = () => { w.print(); };
  };

  const totalBudget = revenueBreakdown.reduce((s, r) => s + r.budget, 0);
  const totalCollected = revenueBreakdown.reduce((s, r) => s + r.collected, 0);
  const overallCompliance = totalBudget > 0 ? ((totalCollected / totalBudget) * 100).toFixed(1) : '0.0';

  const tabs: { key: ReportView; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: PieChart },
    { key: 'revenue', label: 'Revenue Breakdown', icon: DollarSign },
    { key: 'zones', label: 'Zone Reports', icon: Building2 },
    { key: 'monthly', label: 'Monthly Comparison', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Revenue collection performance and analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="inline-flex items-center gap-2 rounded-lg border-border bg-white dark:bg-muted px-3 py-2 text-sm font-medium text-foreground hover:bg-card dark:hover:bg-slate-700 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              {period}
              <ChevronDown className={`w-3 h-3 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showPeriodDropdown && (
              <div className="absolute right-0 mt-1 w-36 rounded-lg border-border bg-white dark:bg-muted shadow-lg z-20 py-1">
                {(['Monthly', 'Quarterly', 'Annually'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPeriod(p); setShowPeriodDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      p === period
                        ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary font-medium'
                        : 'text-foreground hover:bg-card dark:hover:bg-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={handlePrintReport} className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-3 py-2 text-sm font-medium hover:bg-destructive transition-colors cursor-pointer">
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 rounded-lg border-border bg-card/50 p-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = view === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? 'bg-white dark:bg-muted text-primary dark:text-primary shadow-sm'
                  : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Overview Tab ──────────────────────────────────────────────────── */}
      {view === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={<DollarSign className="w-5 h-5 text-primary dark:text-primary" />}
              label="Total Collected"
              value={fmtCurrency(totalCollected)}
              sub={`Budget: ${fmtCurrency(totalBudget)}`}
              trend={14.3}
            />
            <KpiCard
              icon={<Target className="w-5 h-5 text-primary dark:text-primary" />}
              label="Collection Rate"
              value={`${overallCompliance}%`}
              sub="Target: 95%"
              trend={2.1}
            />
            <KpiCard
              icon={<Users className="w-5 h-5 text-primary dark:text-primary" />}
              label="Registered Entities"
              value={fmtNumber(entityCount)}
              sub="Businesses + Properties + Rents"
            />
            <KpiCard
              icon={<Receipt className="w-5 h-5 text-primary dark:text-primary" />}
              label="Receipts Issued"
              value={fmtNumber(receiptCount)}
              sub="Total recorded"
            />
          </div>

          {/* Two-column: Top Performers + Zone Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Revenue Categories */}
            <div className="rounded-xl bg-white dark:bg-muted border border-border p-5">
              <h2 className="text-base font-semibold text-foreground mb-4">Top Revenue Categories</h2>
              <div className="space-y-3">
                {revenueBreakdown.slice(0, 5).map((item, i) => (
                  <CategoryBar key={`rev-cat-${i}`} item={item} />
                ))}
              </div>
            </div>

            {/* Zone Summary */}
            <div className="rounded-xl bg-white dark:bg-muted border border-border p-5">
              <h2 className="text-base font-semibold text-foreground mb-4">Zone Compliance Summary</h2>
              <div className="space-y-3">
                {zoneReports.map((zone, i) => (
                  <div key={`zone-bar-${i}`} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{zone.zone}</p>
                      <p className="text-xs text-muted-foreground">{fmtCurrency(zone.collected)} of {fmtCurrency(zone.target)}</p>
                    </div>
                    <span className={`inline-flex items-center text-sm font-semibold ${
                      zone.compliance >= 95 ? 'text-primary dark:text-primary' : zone.compliance >= 90 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {zone.compliance}%
                      {zone.compliance >= 95 ? <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" /> : zone.compliance < 90 ? <TrendingDown className="w-3.5 h-3.5 ml-0.5" /> : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Revenue Breakdown Tab ──────────────────────────────────────────── */}
      {view === 'revenue' && (
        <div className="space-y-6">
          {/* Unified Filter Bar */}
          <div className="rounded-xl bg-white dark:bg-muted border border-border overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between cursor-pointer" onClick={() => setShowFilters(!showFilters)}>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary dark:text-primary" />
                <span className="text-sm font-semibold text-foreground">Report Filters</span>
                {(filterCustomer || filterUniqueNo || filterDateFrom || filterDateTo || filterLocality || filterRevenueItem || filterRevenueCode) && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold">!</span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </div>
            {showFilters && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Revenue Type */}
                <div>
                  <label className="text-[11px] uppercase text-muted-foreground font-medium mb-1 block">Revenue Type</label>
                  <select
                    value={revenueTypeFilter}
                    onChange={(e) => setRevenueTypeFilter(e.target.value)}
                    className="w-full rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Business">Business</option>
                    <option value="Property">Property</option>
                    <option value="Rent">Rent</option>
                    <option value="BP">BP-Building Permit</option>
                    <option value="Fines">Fines</option>
                  </select>
                </div>
                {/* Customer */}
                <div>
                  <label className="text-[11px] uppercase text-muted-foreground font-medium mb-1 block">Customer</label>
                  <input type="text" value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} placeholder="Name..." className="w-full rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                {/* Unique Number */}
                <div>
                  <label className="text-[11px] uppercase text-muted-foreground font-medium mb-1 block">Unique Number</label>
                  <input type="text" value={filterUniqueNo} onChange={(e) => setFilterUniqueNo(e.target.value)} placeholder="Unique #..." className="w-full rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                {/* Locality */}
                <div>
                  <label className="text-[11px] uppercase text-muted-foreground font-medium mb-1 block">Locality</label>
                  <select value={filterLocality} onChange={(e) => setFilterLocality(e.target.value)} className="w-full rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">All Localities</option>
                    {LOCALITIES.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
                {/* Date From */}
                <div>
                  <label className="text-[11px] uppercase text-muted-foreground font-medium mb-1 block">Date From</label>
                  <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                {/* Date To */}
                <div>
                  <label className="text-[11px] uppercase text-muted-foreground font-medium mb-1 block">Date To</label>
                  <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                {/* Revenue Item */}
                <div>
                  <label className="text-[11px] uppercase text-muted-foreground font-medium mb-1 block">Revenue Item</label>
                  <input type="text" value={filterRevenueItem} onChange={(e) => setFilterRevenueItem(e.target.value)} placeholder="Description..." className="w-full rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                {/* Revenue Code */}
                <div>
                  <label className="text-[11px] uppercase text-muted-foreground font-medium mb-1 block">Revenue Code</label>
                  <input type="text" value={filterRevenueCode} onChange={(e) => setFilterRevenueCode(e.target.value)} placeholder="Code..." className="w-full rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                {/* Clear button */}
                <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                  <button onClick={() => { setFilterCustomer(''); setFilterUniqueNo(''); setFilterDateFrom(''); setFilterDateTo(''); setFilterLocality(''); setFilterRevenueItem(''); setFilterRevenueCode(''); }} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    <X className="w-3.5 h-3.5" /> Clear all filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* A. Customer Listing by Revenue Type */}
          <div className="rounded-xl bg-white dark:bg-muted border border-border overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Customer Listing by Revenue Type</h2>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              {customerList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No records found for this revenue type.</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-card/50 sticky top-0 z-10">
                    <tr className="border-b border-border">
                      <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3 w-16">S/N</th>
                      <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">{columnConfig.col1}</th>
                      <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">{columnConfig.col2}</th>
                      <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {customerList.map((row, i) => (
                      <tr key={i} className="hover:bg-card dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-muted-foreground text-center">{i + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{row.col1 || '—'}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{row.col2 || '—'}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-foreground">{row.amount > 0 ? fmtCurrency(row.amount) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-card/50">
                    <tr className="border-t-2 border-border">
                      <td className="px-4 py-3 text-sm font-bold text-foreground" colSpan={3}>Total</td>
                      <td className="px-4 py-3 text-sm font-bold text-primary dark:text-primary text-right">{fmtCurrency(customerList.reduce((s, r) => s + r.amount, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>

          {/* B. Customer Statements */}
          <div className="rounded-xl bg-white dark:bg-muted border border-border overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Customer Statements</h2>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              {customerStatements.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No statements found.</p>
                </div>
              ) : (
                customerStatements.map((stmt, sIdx) => (
                  <div key={sIdx} className={sIdx > 0 ? 'border-t-4 border-muted/40' : ''}>
                    <div className="px-4 py-2.5 bg-muted/40 dark:bg-slate-700/40">
                      <span className="text-sm font-semibold text-foreground">{stmt.customer}</span>
                      <span className="text-xs text-muted-foreground ml-3">{stmt.uniqueNumber}</span>
                    </div>
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
                ))
              )}
            </div>
          </div>

          {/* C. Detailed Collection by Revenue Items */}
          <div className="rounded-xl bg-white dark:bg-muted border border-border overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Detailed Collection by Revenue Items</h2>
              <p className="text-sm text-muted-foreground mt-1">Aggregated collections grouped by revenue code</p>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              {revenueItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No revenue items found.</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-card/50 sticky top-0 z-10">
                    <tr className="border-b border-border">
                      <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">Revenue Code</th>
                      <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">Revenue Description</th>
                      <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3 text-right">Target</th>
                      <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3 text-right">Total Collections</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {revenueItems.map((item, i) => (
                      <tr key={i} className="hover:bg-card dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono font-medium text-foreground">{item.code}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{item.description || '—'}</td>
                        <td className="px-4 py-3 text-sm text-right text-foreground">{item.target > 0 ? fmtCurrency(item.target) : '—'}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-primary dark:text-primary">{item.collected > 0 ? fmtCurrency(item.collected) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-card/50">
                    <tr className="border-t-2 border-border">
                      <td className="px-4 py-3 text-sm font-bold text-foreground" colSpan={2}>Total</td>
                      <td className="px-4 py-3 text-sm font-bold text-foreground text-right">{fmtCurrency(revenueItems.reduce((s, r) => s + r.target, 0))}</td>
                      <td className="px-4 py-3 text-sm font-bold text-primary dark:text-primary text-right">{fmtCurrency(revenueItems.reduce((s, r) => s + r.collected, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── Zones Tab ─────────────────────────────────────────────────────── */}
      {view === 'zones' && (
        <div className="space-y-4">
          {/* Zone Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="All">All Zones</option>
              <option value="Zone A">Zone A</option>
              <option value="Zone B">Zone B</option>
              <option value="Zone C">Zone C</option>
              <option value="Zone D">Zone D</option>
            </select>
          </div>

          {/* Zone Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredZones.map((zone, i) => (
              <div key={`zone-card-${i}`} className="rounded-xl bg-white dark:bg-muted border border-border p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-foreground">{zone.zone}</h3>
                  <ComplianceBadge percentage={zone.compliance} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <MiniStat icon={<Building2 className="w-4 h-4 text-destructive" />} label="Businesses" value={fmtNumber(zone.businesses)} />
                  <MiniStat icon={<Home className="w-4 h-4 text-destructive" />} label="Properties" value={fmtNumber(zone.properties)} />
                  <MiniStat icon={<DollarSign className="w-4 h-4 text-destructive" />} label="Collected" value={fmtCurrency(zone.collected)} />
                  <MiniStat icon={<Target className="w-4 h-4 text-destructive" />} label="Target" value={fmtCurrency(zone.target)} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Collection Progress</span>
                    <span className="text-xs font-semibold text-foreground">{zone.target > 0 ? ((zone.collected / zone.target) * 100).toFixed(1) : '0.0'}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-muted dark:bg-slate-700">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        zone.compliance >= 95 ? 'bg-primary/100' : zone.compliance >= 90 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((zone.collected / zone.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Monthly Comparison Tab ───────────────────────────────────────── */}
      {view === 'monthly' && (
        <div className="rounded-xl bg-white dark:bg-muted border border-border overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">Year-over-Year Monthly Revenue</h2>
            <p className="text-sm text-muted-foreground mt-1">Comparing {currentFY} vs {previousFY} monthly collection figures</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-card/50">
                <tr className="border-b border-border">
                  <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">Month</th>
                  <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3 text-right">{currentFY}</th>
                  <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3 text-right">{previousFY}</th>
                  <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3 text-right">Change</th>
                  <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">Visual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {monthlyComparison.map((m) => (
                  <tr key={m.month} className="hover:bg-card dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{m.month}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground text-right">{fmtCurrency(m.currentYear)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground text-right">{fmtCurrency(m.previousYear)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-0.5 text-sm font-semibold ${
                        m.change >= 0 ? 'text-primary dark:text-primary' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {m.change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {Math.abs(m.change)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-muted dark:bg-slate-700 relative overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-slate-300 dark:bg-slate-600"
                            style={{ width: `${(m.previousYear / 400000) * 100}%` }}
                          />
                          <div
                            className="absolute inset-y-0 left-0 bg-primary/100"
                            style={{ width: `${(m.currentYear / 400000) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-card/50">
                <tr className="border-t-2 border-border">
                  <td className="px-4 py-3 text-sm font-bold text-foreground">Total</td>
                  <td className="px-4 py-3 text-sm font-bold text-primary dark:text-primary text-right">
                    {fmtCurrency(monthlyComparison.reduce((s, m) => s + m.currentYear, 0))}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-muted-foreground text-right">
                    {fmtCurrency(monthlyComparison.reduce((s, m) => s + m.previousYear, 0))}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-primary dark:text-primary text-right">
                    +9.8%
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, trend }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  trend?: number;
}) {
  return (
    <div className="rounded-xl bg-white dark:bg-muted border border-border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20">
          {icon}
        </span>
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend >= 0
              ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
              : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function CategoryBar({ item }: { item: RevenueBreakdown }) {
  const pct = (item.collected / item.budget) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-foreground truncate">{item.category}</p>
        <span className="text-xs font-semibold text-muted-foreground">{pct.toFixed(1)}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted dark:bg-slate-700">
        <div
          className={`h-2 rounded-full transition-all ${
            pct >= 95 ? 'bg-primary/100' : pct >= 90 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">{fmtCurrency(item.collected)} of {fmtCurrency(item.budget)}</p>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-primary dark:text-primary">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function ComplianceBadge({ percentage }: { percentage: number }) {
  if (percentage >= 95) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary">
        <CheckCircle2 className="w-3 h-3" />
        On Track
      </span>
    );
  }
  if (percentage >= 90) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <Clock className="w-3 h-3" />
        At Risk
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <AlertCircle className="w-3 h-3" />
      Behind
    </span>
  );
}

