'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Building2,
  Home,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Landmark,
  Receipt,
  Users,
  CircleDollarSign,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types (mirror what other pages store)
// ---------------------------------------------------------------------------

interface LSBusiness {
  regNumber: string;
  name: string;
  owner: string;
  type: string;
  category: string;
  status: 'Active' | 'Inactive';
  dateRegistered: string;
  zone: string;
  revenueArea: string;
  electoralArea: string;
  ward: string;
  [key: string]: any;
}

interface LSProperty {
  propNumber: string;
  owner: string;
  propertyType: string;
  category: string;
  valuation: number;
  occupancyStatus: string;
  zone: string;
  [key: string]: any;
}

interface LSBill {
  id: string;
  billNumber: string;
  date: string;
  entityName: string;
  entityType: string;
  category: string;
  revenueItem: string;
  amount: number;
  previousBalance: number;
  penalty: number;
  totalDue: number;
  status: string;
  dueDate: string;
}

interface LSPayment {
  id: string;
  receiptNo: string;
  billNo: string;
  business: string;
  amount: number;
  balance: number;
  date: string;
  collector: string;
  method: string;
  status: string;
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GH').format(n);

const fmtCurrency = (n: number) => `GH\u20a8 ${fmt(n)}`;

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48',
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/* ---------- Stat Card ---------- */

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: number;
  accent: string;
  sub?: string;
}

function StatCard({ icon, label, value, change, accent, sub }: StatCardProps) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${accent}`}>
          {icon}
        </span>
        {change !== undefined && change !== 0 && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              change >= 0
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
          {value}
        </p>
        {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

/* ---------- Chart Card Wrapper ---------- */

function ChartCard({
  title,
  children,
  className = '',
  action,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ---------- Table Card Wrapper ---------- */

function TableCard({
  title,
  children,
  className = '',
  emptyMessage,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  emptyMessage?: string;
}) {
  return (
    <div className={`rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow overflow-hidden ${className}`}>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{title}</h2>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        {children}
      </div>
      {emptyMessage && (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">{emptyMessage}</p>
      )}
    </div>
  );
}

/* ---------- Custom Recharts Tooltip ---------- */

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-slate-900 dark:text-white">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-semibold">
          {entry.name}: {fmtCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

/* ---------- Pie Custom Label ---------- */

const RADIAN = Math.PI / 180;
function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text x={x} y={y} fill="#475569" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[11px]">
      {name || `${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

/* ---------- Empty State ---------- */

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
      {icon}
      <p className="mt-3 text-sm">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Component
// ---------------------------------------------------------------------------

export function DashboardPage() {
  // Assembly info from synced storage
  const [assemblyInfo] = useSyncedStorage<{ name: string; code: string; address: string }>('rms-settings-assembly', { name: '', code: '', address: '' });
  const assemblyName = assemblyInfo.name || 'Kpando Municipal Assembly';

  // All data from server-synced storage
  const [businesses] = useSyncedStorage<LSBusiness[]>('rms-businesses', []);
  const [properties] = useSyncedStorage<LSProperty[]>('rms-properties', []);
  const [bills] = useSyncedStorage<LSBill[]>('rms-bills', []);
  const [payments] = useSyncedStorage<LSPayment[]>('rms-payments', []);
  const [financialSettings] = useSyncedStorage<{ currentFinancialYear: string }>('rms-settings-financial', { currentFinancialYear: '' });

  const fiscalYear = financialSettings.currentFinancialYear || new Date().getFullYear().toString();

  // ── Computed Stats ────────────────────────────────────────────────────

  const totalBusinesses = businesses.length;
  const activeBusinesses = businesses.filter(b => b.status === 'Active').length;
  const totalProperties = properties.length;
  
  const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalBilled = bills.reduce((sum, b) => sum + (b.totalDue || 0), 0);
  const totalPaidBills = bills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + (b.totalDue || 0), 0);
  const outstanding = bills.reduce((sum, b) => {
    if (b.status === 'Paid') return sum;
    return sum + (b.totalDue || 0);
  }, 0);

  // Revenue by month (from payments)
  const monthlyRevenue = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach(p => {
      if (!p.date) return;
      // Extract YYYY-MM from date string
      const parts = p.date.split('-');
      if (parts.length >= 2) {
        const key = `${parts[0]}-${parts[1]}`;
        map.set(key, (map.get(key) || 0) + (p.amount || 0));
      }
    });
    // Sort by month
    const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return entries.map(([month, revenue]) => {
      // Format month label
      const [y, m] = month.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        month: `${monthNames[parseInt(m, 10) - 1]} ${y}`,
        revenue,
      };
    });
  }, [payments]);

  // Revenue by category (from bills by revenue item)
  const revenueByCategory = useMemo(() => {
    const map = new Map<string, number>();
    bills.forEach(b => {
      const cat = b.revenueItem || b.category || 'Other';
      map.set(cat, (map.get(cat) || 0) + (b.totalDue || 0));
    });
    return Array.from(map.entries())
      .map(([name, value], i) => ({
        name,
        value,
        color: COLORS[i % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [bills]);

  // Businesses by category (pie chart)
  const businessesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    businesses.forEach(b => {
      const cat = b.category || b.type || 'Uncategorized';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value], i) => ({
        name,
        value,
        color: COLORS[i % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [businesses]);

  // Businesses by status
  const businessesByStatus = useMemo(() => {
    const active = businesses.filter(b => b.status === 'Active').length;
    const inactive = businesses.filter(b => b.status === 'Inactive').length;
    return [
      { name: 'Active', value: active, color: '#10b981' },
      { name: 'Inactive', value: inactive, color: '#ef4444' },
    ];
  }, [businesses]);

  // Bills by status
  const billsByStatus = useMemo(() => {
    const statusMap = new Map<string, number>();
    bills.forEach(b => {
      const s = b.status || 'Unknown';
      statusMap.set(s, (statusMap.get(s) || 0) + 1);
    });
    const statusColors: Record<string, string> = {
      Paid: '#10b981',
      Unpaid: '#ef4444',
      Partial: '#f59e0b',
      Overdue: '#dc2626',
    };
    return Array.from(statusMap.entries()).map(([name, value]) => ({
      name,
      value,
      color: statusColors[name] || '#64748b',
    }));
  }, [bills]);

  // Recent payments (last 10)
  const recentPayments = useMemo(() => {
    return [...payments]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 10);
  }, [payments]);

  // Top collectors (from payments grouped by collector)
  const topCollectors = useMemo(() => {
    const map = new Map<string, { amount: number; bills: number; area: string }>();
    payments.forEach(p => {
      const name = p.collector || 'Unknown';
      const existing = map.get(name) || { amount: 0, bills: 0, area: '' };
      existing.amount += p.amount || 0;
      existing.bills += 1;
      existing.area = p.method || '';
      map.set(name, existing);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [payments]);

  // Recent businesses registered (last 8)
  const recentBusinesses = useMemo(() => {
    return [...businesses]
      .sort((a, b) => (b.dateRegistered || '').localeCompare(a.dateRegistered || ''))
      .slice(0, 8);
  }, [businesses]);

  // Collection rate
  const collectionRate = totalBilled > 0 ? Math.round((totalPaidBills / totalBilled) * 100) : 0;

  // Determine if we have any data at all
  const hasData = totalBusinesses > 0 || totalProperties > 0 || bills.length > 0 || payments.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Revenue Management System
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {assemblyName} — Dashboard Overview
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400 dark:text-slate-500">Collection Rate</p>
              <p className={`text-lg font-bold ${collectionRate >= 50 ? 'text-emerald-600' : collectionRate > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                {collectionRate}%
              </p>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Fiscal Year {fiscalYear}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Stat Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            label="Total Businesses"
            value={fmt(totalBusinesses)}
            change={totalBusinesses > 0 ? 12 : 0}
            accent="bg-emerald-100 dark:bg-emerald-900/40"
            sub={`${activeBusinesses} active`}
          />
          <StatCard
            icon={<Home className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            label="Total Properties"
            value={fmt(totalProperties)}
            accent="bg-blue-100 dark:bg-blue-900/40"
          />
          <StatCard
            icon={<CircleDollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            label="Amount Collected"
            value={fmtCurrency(totalCollected)}
            change={totalCollected > 0 ? 8 : 0}
            accent="bg-emerald-100 dark:bg-emerald-900/40"
            sub={`${payments.length} payment(s)`}
          />
          <StatCard
            icon={<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            label="Outstanding"
            value={fmtCurrency(outstanding)}
            change={outstanding > 0 ? -5 : 0}
            accent="bg-amber-100 dark:bg-amber-900/40"
            sub={`${bills.filter(b => b.status !== 'Paid').length} unpaid bill(s)`}
          />
        </div>

        {/* ── Additional stat row ────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            label="Total Bills Generated"
            value={fmt(bills.length)}
            accent="bg-blue-100 dark:bg-blue-900/40"
            sub={`Total billed: ${fmtCurrency(totalBilled)}`}
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            label="Bills Paid"
            value={fmt(bills.filter(b => b.status === 'Paid').length)}
            accent="bg-emerald-100 dark:bg-emerald-900/40"
            sub={`Value: ${fmtCurrency(totalPaidBills)}`}
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            label="Bills Overdue"
            value={fmt(bills.filter(b => b.status === 'Overdue').length)}
            accent="bg-red-100 dark:bg-red-900/40"
          />
        </div>

        {/* ── No data banner ──────────────────────────────────────────── */}
        {!hasData && (
          <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-8 text-center">
            <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">No Data Yet</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 max-w-md mx-auto">
              Start by registering businesses, generating bills, or recording payments. 
              Your dashboard analytics will populate automatically as data is entered into the system.
            </p>
          </div>
        )}

        {/* ── Charts Row 1 ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Monthly Revenue Trend — 3/5 width */}
          <ChartCard title="Monthly Revenue Trend" className="lg:col-span-3">
            {monthlyRevenue.length > 0 ? (
              <div className="h-72 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenue}>
                    <defs>
                      <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                    <YAxis tickFormatter={(v) => `${v / 1000}k`} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip content={<RevenueTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#emeraldGradient)" dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#059669', strokeWidth: 2, stroke: '#fff' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={<TrendingUp className="w-10 h-10" />} message="No payment data yet. Record payments to see revenue trends." />
            )}
          </ChartCard>

          {/* Businesses by Category — 2/5 width */}
          <ChartCard title="Businesses by Category" className="lg:col-span-2">
            {businessesByCategory.length > 0 ? (
              <div className="h-72 sm:h-80 flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={businessesByCategory} cx="50%" cy="45%" outerRadius={90} innerRadius={40} paddingAngle={2} dataKey="value" label={renderPieLabel} labelLine={false}>
                      {businessesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.875rem' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 w-full max-w-xs">
                  {businessesByCategory.map((cat, i) => (
                    <div key={`biz-cat-${i}`} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cat.color }} />
                      {cat.name} ({cat.value})
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState icon={<Building2 className="w-10 h-10" />} message="No businesses registered yet." />
            )}
          </ChartCard>
        </div>

        {/* ── Charts Row 2 ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue by Category (from bills) */}
          <ChartCard title="Revenue by Bill Category" className="lg:col-span-1">
            {revenueByCategory.length > 0 ? (
              <div className="h-64 flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenueByCategory} cx="50%" cy="45%" outerRadius={80} innerRadius={35} paddingAngle={2} dataKey="value" label={renderPieLabel} labelLine={false}>
                      {revenueByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => fmtCurrency(value)} contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.875rem' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 w-full max-w-xs">
                  {revenueByCategory.slice(0, 6).map((cat, i) => (
                    <div key={`rev-cat-${i}`} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState icon={<FileText className="w-10 h-10" />} message="No bills generated yet." />
            )}
          </ChartCard>

          {/* Bills by Status (bar chart) */}
          <ChartCard title="Bills by Status" className="lg:col-span-1">
            {billsByStatus.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={billsByStatus} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {billsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={<BarChart3 className="w-10 h-10" />} message="No bills generated yet." />
            )}
          </ChartCard>

          {/* Business Status (pie) */}
          <ChartCard title="Business Status Overview" className="lg:col-span-1">
            {totalBusinesses > 0 ? (
              <div className="h-64 flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={businessesByStatus} cx="50%" cy="45%" outerRadius={80} innerRadius={35} paddingAngle={3} dataKey="value" label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
                      const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} fill="#475569" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs">
                          {name} ({percent * 100}%)
                        </text>
                      );
                    }} labelLine={false}>
                      {businessesByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={<Building2 className="w-10 h-10" />} message="No businesses registered yet." />
            )}
          </ChartCard>
        </div>

        {/* ── Tables Row ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Businesses Registered */}
          <TableCard title="Recent Business Registrations" emptyMessage={recentBusinesses.length === 0 ? 'No businesses registered yet' : undefined}>
            {recentBusinesses.length > 0 && (
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-xs uppercase text-slate-500 dark:text-slate-400 font-medium px-3 py-2.5">Business</th>
                    <th className="text-xs uppercase text-slate-500 dark:text-slate-400 font-medium px-3 py-2.5">Owner</th>
                    <th className="text-xs uppercase text-slate-500 dark:text-slate-400 font-medium px-3 py-2.5">Category</th>
                    <th className="text-xs uppercase text-slate-500 dark:text-slate-400 font-medium px-3 py-2.5">Status</th>
                    <th className="text-xs uppercase text-slate-500 dark:text-slate-400 font-medium px-3 py-2.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {recentBusinesses.map((b, i) => (
                    <tr key={`biz-${i}-${b.regNumber || b.name}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="text-sm text-slate-900 dark:text-white font-medium px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
                            {(b.name || '?')[0]}
                          </span>
                          <span className="truncate max-w-[140px]">{b.name}</span>
                        </div>
                      </td>
                      <td className="text-sm text-slate-600 dark:text-slate-400 px-3 py-3 truncate max-w-[100px]">{b.owner}</td>
                      <td className="text-sm text-slate-600 dark:text-slate-400 px-3 py-3">{b.category || b.type}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${
                          b.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="text-sm text-slate-500 dark:text-slate-400 px-3 py-3">{b.dateRegistered}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TableCard>

          {/* Recent Payments */}
          <TableCard title="Recent Payments" emptyMessage={recentPayments.length === 0 ? 'No payments recorded yet' : undefined}>
            {recentPayments.length > 0 && (
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-xs uppercase text-slate-500 dark:text-slate-400 font-medium px-3 py-2.5">Receipt #</th>
                    <th className="text-xs uppercase text-slate-500 dark:text-slate-400 font-medium px-3 py-2.5">Business</th>
                    <th className="text-xs uppercase text-slate-500 dark:text-slate-400 font-medium px-3 py-2.5 text-right">Amount</th>
                    <th className="text-xs uppercase text-slate-500 dark:text-slate-400 font-medium px-3 py-2.5">Date</th>
                    <th className="text-xs uppercase text-slate-500 dark:text-slate-400 font-medium px-3 py-2.5">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {recentPayments.map((p) => (
                    <tr key={p.id || p.receiptNo} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="text-sm text-slate-900 dark:text-white font-mono px-3 py-3">{p.receiptNo}</td>
                      <td className="text-sm text-slate-900 dark:text-white font-medium px-3 py-3 truncate max-w-[140px]">{p.business}</td>
                      <td className="text-sm text-slate-900 dark:text-white font-medium px-3 py-3 text-right">
                        {fmtCurrency(p.amount)}
                      </td>
                      <td className="text-sm text-slate-600 dark:text-slate-400 px-3 py-3">{p.date}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${
                          p.method === 'Mobile Money' || p.method === 'MoMo'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : p.method === 'Bank' || p.method === 'Bank Transfer'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {p.method}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TableCard>
        </div>

        {/* ── Top Collectors Row ───────────────────────────────────────── */}
        {topCollectors.length > 0 && (
          <TableCard title="Top Revenue Collectors">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-xs uppercase text-slate-500 dark:text-slate-400 font-medium px-3 py-2.5">Name</th>
                  <th className="text-xs uppercase text-slate-500 dark:text-slate-400 font-medium px-3 py-2.5">Method</th>
                  <th className="text-xs uppercase text-slate-500 dark:text-slate-400 font-medium px-3 py-2.5 text-right">Amount</th>
                  <th className="text-xs uppercase text-slate-500 dark:text-slate-400 font-medium px-3 py-2.5 text-right">Transactions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {topCollectors.map((c, i) => (
                  <tr key={`collector-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="text-sm text-slate-900 dark:text-white font-medium px-3 py-3 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
                        {c.name.split(' ').map((n) => n[0]).join('')}
                      </span>
                      {c.name}
                    </td>
                    <td className="text-sm text-slate-600 dark:text-slate-400 px-3 py-3">{c.area}</td>
                    <td className="text-sm text-slate-900 dark:text-white font-medium px-3 py-3 text-right">
                      {fmtCurrency(c.amount)}
                    </td>
                    <td className="text-sm text-slate-600 dark:text-slate-400 px-3 py-3 text-right">{c.bills}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        )}
      </main>
    </div>
  );
}
