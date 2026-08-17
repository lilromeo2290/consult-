'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
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
  const [financialSettings] = useSyncedStorage<{ currentFinancialYear: string }>('rms-settings-financial', { currentFinancialYear: '' });

  // Customers by Revenue Type state
  const [revenueTypeFilter, setRevenueTypeFilter] = useState<string>('Business');
  const [customerSearch, setCustomerSearch] = useState('');

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

  // Customers by Revenue Type: flat listing with S/N, Owner Name, Name/Description, Amount
  const customerList = useMemo(() => {
    let rows: { ownerName: string; entityName: string; amount: number }[] = [];

    if (revenueTypeFilter === 'Business') {
      (bizData as any[]).forEach((b: any) => {
        // Sum bill amounts for this business
        const bizBills = billsData.filter((bl: any) => bl.uniqueNumber === b.regNumber && bl.billType === 'BOP');
        const totalAmt = bizBills.reduce((s: number, bl: any) => s + (bl.amountDue || bl.charge || 0), 0);
        rows.push({ ownerName: b.owner || '', entityName: b.name || '', amount: totalAmt });
      });
    } else if (revenueTypeFilter === 'Property') {
      (propData as any[]).forEach((p: any) => {
        const propBills = billsData.filter((bl: any) => bl.uniqueNumber === p.propertyUniqueNumber && bl.billType === 'Property Rate');
        const totalAmt = propBills.reduce((s: number, bl: any) => s + (bl.amountDue || bl.charge || 0), 0);
        rows.push({ ownerName: p.ownerName || '', entityName: p.streetName || '', amount: totalAmt });
      });
    } else if (revenueTypeFilter === 'Rent') {
      (rentData as any[]).forEach((r: any) => {
        const rentBills = billsData.filter((bl: any) => bl.uniqueNumber === (r.rentUniqueNumber || r.uniqueNumber) && bl.billType === 'Rent');
        const totalAmt = rentBills.reduce((s: number, bl: any) => s + (bl.amountDue || bl.charge || 0), 0);
        rows.push({ ownerName: r.ownerName || r.tenantName || '', entityName: r.location || r.propertyLocation || '', amount: totalAmt });
      });
    } else if (revenueTypeFilter === 'Fines') {
      (finesData as any[]).forEach((f: any) => {
        rows.push({ ownerName: f.nameOfOffender || '', entityName: f.classDescription || f.locationAddress || '', amount: f.amountDue || f.charge || 0 });
      });
    } else if (revenueTypeFilter === 'Locality') {
      // All types combined
      (bizData as any[]).forEach((b: any) => {
        const bizBills = billsData.filter((bl: any) => bl.uniqueNumber === b.regNumber);
        const totalAmt = bizBills.reduce((s: number, bl: any) => s + (bl.amountDue || bl.charge || 0), 0);
        rows.push({ ownerName: b.owner || '', entityName: b.name || '', amount: totalAmt });
      });
      (propData as any[]).forEach((p: any) => {
        const propBills = billsData.filter((bl: any) => bl.uniqueNumber === p.propertyUniqueNumber);
        const totalAmt = propBills.reduce((s: number, bl: any) => s + (bl.amountDue || bl.charge || 0), 0);
        rows.push({ ownerName: p.ownerName || '', entityName: p.streetName || '', amount: totalAmt });
      });
      (rentData as any[]).forEach((r: any) => {
        const rentBills = billsData.filter((bl: any) => bl.uniqueNumber === (r.rentUniqueNumber || r.uniqueNumber));
        const totalAmt = rentBills.reduce((s: number, bl: any) => s + (bl.amountDue || bl.charge || 0), 0);
        rows.push({ ownerName: r.ownerName || r.tenantName || '', entityName: r.location || r.propertyLocation || '', amount: totalAmt });
      });
      (finesData as any[]).forEach((f: any) => {
        rows.push({ ownerName: f.nameOfOffender || '', entityName: f.classDescription || f.locationAddress || '', amount: f.amountDue || f.charge || 0 });
      });
    }

    // Apply search
    if (customerSearch.trim()) {
      const q = customerSearch.toLowerCase();
      rows = rows.filter((r) =>
        r.ownerName.toLowerCase().includes(q) ||
        r.entityName.toLowerCase().includes(q)
      );
    }

    return rows;
  }, [revenueTypeFilter, customerSearch, bizData, propData, rentData, finesData, billsData]);

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
    w.document.write(`<!DOCTYPE html><html><head><title>Report - ${title}</title><style>@page{size:A4;margin:15mm;}*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Tahoma,sans-serif;color:#1e293b;}.header{text-align:center;border-bottom:3px double #1e293b;padding-bottom:12px;margin-bottom:16px;}.header h1{font-size:18px;font-weight:700;letter-spacing:0.05em;}.header p{font-size:11px;color:#64748b;margin-top:3px;}.report-title{text-align:center;font-size:15px;font-weight:600;margin-bottom:4px;color:#E31E24;}.report-meta{text-align:center;font-size:11px;color:#94a3b8;margin-bottom:20px;}</style></head><body><div class="header"><h1>KUMASI METROPOLITAN ASSEMBLY</h1><p>Revenue Management System</p></div><div class="report-title">${title}</div><div class="report-meta">Period: ${period} | Generated: ${new Date().toLocaleString()}</div>${bodyContent}<div style="margin-top:40px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#94a3b8;">This is a computer-generated document and does not require a signature.<br/>Designed, Developed &amp; Maintained by <strong>Clipe Consult</strong> | www.clipeconsult.com</div></body></html>`);
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
          {/* Revenue Type */}
          <div className="rounded-xl bg-white dark:bg-muted border border-border overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Revenue Type</h2>
              <p className="text-sm text-muted-foreground mt-1">Customers listing by revenue type</p>
            </div>
            <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
              <select
                value={revenueTypeFilter}
                onChange={(e) => setRevenueTypeFilter(e.target.value)}
                className="rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Business">Business</option>
                <option value="Property">Property</option>
                <option value="Rent">Rent</option>
                <option value="Locality">Locality</option>
                <option value="Fines">Fines</option>
              </select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search by name, unique number, or bill #..."
                  className="w-full rounded-lg border-border bg-card pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
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
                      <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">Name of Owner</th>
                      <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">Business Name</th>
                      <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {customerList.map((row, i) => (
                      <tr key={i} className="hover:bg-card dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-muted-foreground text-center">{i + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{row.ownerName || '—'}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{row.entityName || '—'}</td>
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

