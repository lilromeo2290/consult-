'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  Building,
  Phone,
  Mail,
  Globe,
  Calendar,
  DollarSign,
  FileText,
  Shield,
  Pen,
  Database,
  Bell,
  Save,
  Upload,
  Download,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { useSyncedStorage } from '@/hooks/use-synced-storage';

const ASSEMBLY_KEY = 'rms-settings-assembly';
const FINANCIAL_KEY = 'rms-settings-financial';
const BILLING_KEY = 'rms-settings-billing';
const SECURITY_KEY = 'rms-settings-security';
const NOTIFICATIONS_KEY = 'rms-settings-notifications';
const BACKUP_KEY = 'rms-settings-backup';
const BILL_CATEGORY_KEY = 'rms-settings-bill-categories';

// ── Types ──
interface AssemblyInfo {
  name: string;
  code: string;
  telephone: string;
  email: string;
  website: string;
  address: string;
  description: string;
  logo: string;
  signature: string;
  signatureName: string;
  signatureTitle: string;
}

interface FinancialInfo {
  currency: string;
  financialYearStart: string;
  currentFinancialYear: string;
  taxRate: string;
  penaltyRate: string;
  interestRate: string;
}

interface BillingInfo {
  billPrefix: string;
  receiptPrefix: string;
  defaultDueDays: string;
  penaltyAfterDays: string;
  autoGenerateBills: boolean;
  includeQrCode: boolean;
  digitalSignature: boolean;
  duplicateBillDetection: boolean;
}

interface SecurityInfo {
  sessionTimeout: string;
  maxLoginAttempts: string;
  passwordMinLength: string;
  lockoutDuration: string;
  twoFactorAuth: boolean;
  auditTrail: boolean;
}

interface NotificationInfo {
  [key: string]: boolean;
}

interface BackupInfo {
  autoDailyBackup: boolean;
  retentionDays: string;
}

interface BillCategoryConfig {
  billPrefix: string;
  receiptPrefix: string;
  defaultDueDays: string;
  penaltyAfterDays: string;
  enabled: boolean;
}

type BillCategorySettings = Record<string, BillCategoryConfig>;

const REVENUE_CATEGORIES = [
  { key: 'BOP', label: 'Business Operating Permit (BOP)', shortLabel: 'BOP', color: 'emerald' },
  { key: 'Property Rate', label: 'Property Rate', shortLabel: 'Property', color: 'blue' },
  { key: 'Rent', label: 'Rent', shortLabel: 'Rent', color: 'amber' },
  { key: 'Fine', label: 'Fine', shortLabel: 'Fine', color: 'red' },
  { key: 'BP', label: 'Building Permit (BP)', shortLabel: 'BP', color: 'purple' },
] as const;

const defaultBillCategories: BillCategorySettings = {
  'BOP': { billPrefix: 'BOP-BILL', receiptPrefix: 'BOP-REC', defaultDueDays: '30', penaltyAfterDays: '15', enabled: true },
  'Property Rate': { billPrefix: 'PROP-BILL', receiptPrefix: 'PROP-REC', defaultDueDays: '30', penaltyAfterDays: '15', enabled: true },
  'Rent': { billPrefix: 'RENT-BILL', receiptPrefix: 'RENT-REC', defaultDueDays: '30', penaltyAfterDays: '15', enabled: true },
  'Fine': { billPrefix: 'FINE-BILL', receiptPrefix: 'FINE-REC', defaultDueDays: '14', penaltyAfterDays: '7', enabled: true },
  'BP': { billPrefix: 'BP-BILL', receiptPrefix: 'BP-REC', defaultDueDays: '30', penaltyAfterDays: '15', enabled: true },
};

const defaultAssembly: AssemblyInfo = {
  name: '',
  code: '',
  telephone: '',
  email: '',
  website: '',
  address: '',
  description: '',
  logo: '',
  signature: '',
  signatureName: '',
  signatureTitle: '',
};

const defaultFinancial: FinancialInfo = {
  currency: 'GHS',
  financialYearStart: 'january',
  currentFinancialYear: '2026',
  taxRate: '',
  penaltyRate: '5',
  interestRate: '2',
};

const defaultBilling: BillingInfo = {
  billPrefix: '',
  receiptPrefix: '',
  defaultDueDays: '30',
  penaltyAfterDays: '15',
  autoGenerateBills: false,
  includeQrCode: true,
  digitalSignature: false,
  duplicateBillDetection: true,
};

const defaultSecurity: SecurityInfo = {
  sessionTimeout: '30',
  maxLoginAttempts: '5',
  passwordMinLength: '8',
  lockoutDuration: '15',
  twoFactorAuth: false,
  auditTrail: true,
};

const defaultNotifications: NotificationInfo = {
  smsDueDateReminders: false,
  emailDueDateReminders: false,
  paymentConfirmationSms: false,
  paymentConfirmationEmail: false,
  overdueBillAlerts: false,
  systemNotifications: true,
  dailyCollectionSummary: false,
  weeklyRevenueReport: false,
};

const defaultBackup: BackupInfo = {
  autoDailyBackup: false,
  retentionDays: '90',
};

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('assembly');
  const [saved, setSaved] = useState(false);

  const [assembly, setAssembly, assemblyLoading] = useSyncedStorage<AssemblyInfo>(ASSEMBLY_KEY, defaultAssembly);
  const [financial, setFinancial, financialLoading] = useSyncedStorage<FinancialInfo>(FINANCIAL_KEY, defaultFinancial);
  const [billing, setBilling, billingLoading] = useSyncedStorage<BillingInfo>(BILLING_KEY, defaultBilling);
  const [security, setSecurity, securityLoading] = useSyncedStorage<SecurityInfo>(SECURITY_KEY, defaultSecurity);
  const [notifications, setNotifications, notifLoading] = useSyncedStorage<NotificationInfo>(NOTIFICATIONS_KEY, defaultNotifications);
  const [backup, setBackup, backupLoading] = useSyncedStorage<BackupInfo>(BACKUP_KEY, defaultBackup);
  const [billCategories, setBillCategories, billCatLoading] = useSyncedStorage<BillCategorySettings>(BILL_CATEGORY_KEY, defaultBillCategories);

  const loaded = !assemblyLoading && !financialLoading && !billingLoading && !securityLoading && !notifLoading && !backupLoading && !billCatLoading;

  const tabs = [
    { id: 'assembly', label: 'Assembly Info', icon: Building },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'billing', label: 'Billing Config', icon: FileText },
    { id: 'bill-categories', label: 'Revenue Categories', icon: FileText },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
  ];

  const handleSave = () => {
    // useSyncedStorage auto-syncs to server on every setter call.
    // The "Save" button gives visual confirmation.
    setSaved(true);
    toast.success('Successfully saved');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure system-wide settings and preferences</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-destructive text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'All Settings Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary rounded-lg px-4 py-3">
        <p className="text-sm text-primary dark:text-primary">
          <CheckCircle2 className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          All settings are automatically saved to the server and will persist across deployments.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-primary dark:text-primary shadow-sm'
                : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-muted rounded-xl border-border p-6">
        {activeTab === 'assembly' && loaded && (
          <AssemblySettings data={assembly} onChange={(field, value) => setAssembly((p: AssemblyInfo) => ({ ...p, [field]: value }))} />
        )}
        {activeTab === 'financial' && loaded && (
          <FinancialSettings data={financial} onChange={(field, value) => setFinancial((p: FinancialInfo) => ({ ...p, [field]: value }))} />
        )}
        {activeTab === 'billing' && loaded && (
          <BillingSettings data={billing} onChange={(field, value) => setBilling((p: BillingInfo) => ({ ...p, [field]: value }))} />
        )}
        {activeTab === 'bill-categories' && loaded && (
          <BillCategorySettingsPanel data={billCategories} onChange={setBillCategories} />
        )}
        {activeTab === 'security' && loaded && (
          <SecuritySettings data={security} onChange={(field, value) => setSecurity((p: SecurityInfo) => ({ ...p, [field]: value }))} />
        )}
        {activeTab === 'notifications' && loaded && (
          <NotificationSettings data={notifications} onChange={(field, value) => setNotifications((p: NotificationInfo) => ({ ...p, [field]: value }))} />
        )}
        {activeTab === 'backup' && loaded && (
          <BackupSettings data={backup} onChange={(field, value) => setBackup((p: BackupInfo) => ({ ...p, [field]: value }))} />
        )}
      </div>
    </div>
  );
}

// ── Shared input style ──
const inputCls = 'w-full rounded-lg border-border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition';
const selectCls = 'w-full rounded-lg border-border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition';

// ── Assembly Tab ──
function AssemblySettings({ data, onChange }: { data: AssemblyInfo; onChange: (field: keyof AssemblyInfo, value: string) => void }) {
  const sigInputRef = useRef<HTMLInputElement>(null);

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        onChange('signature', ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSignature = () => {
    onChange('signature', '');
    if (sigInputRef.current) sigInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground pb-2 border-b border-border">Assembly Information</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Assembly Name</label>
          <input type="text" value={data.name} onChange={(e) => onChange('name', e.target.value)} placeholder="e.g. Kpando Municipal Assembly" className={inputCls} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Assembly Code</label>
          <input type="text" value={data.code} onChange={(e) => onChange('code', e.target.value)} placeholder="e.g. KpMA" className={inputCls} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Telephone</label>
          <input type="tel" value={data.telephone} onChange={(e) => onChange('telephone', e.target.value)} placeholder="Enter telephone number" className={inputCls} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</label>
          <input type="email" value={data.email} onChange={(e) => onChange('email', e.target.value)} placeholder="Enter email address" className={inputCls} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Website</label>
          <input type="url" value={data.website} onChange={(e) => onChange('website', e.target.value)} placeholder="Enter website URL" className={inputCls} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Physical Address</label>
          <input type="text" value={data.address} onChange={(e) => onChange('address', e.target.value)} placeholder="Enter physical address" className={inputCls} />
        </div>
        <div className="lg:col-span-2 space-y-2">
          <label className="block text-sm font-medium text-foreground">Assembly Description</label>
          <textarea rows={6} value={data.description} onChange={(e) => onChange('description', e.target.value)} placeholder="Enter full assembly description (e.g. Kpando Municipal Assembly, Volta Region, Ghana)" className={inputCls + ' resize-y min-h-[100px]'} />
        </div>
        <div className="lg:col-span-2 space-y-2">
          <label className="block text-sm font-medium text-foreground flex items-center gap-1.5"><Pen className="w-3.5 h-3.5" /> Authorized Signature</label>
          <div className="flex items-start gap-5">
            <div className={`w-48 h-24 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-card/40 ${data.signature ? 'border-[#4a7ab5] dark:border-primary' : 'border-border'}`}>
              {data.signature ? (
                <img src={data.signature} alt="Assembly Signature" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center text-muted-foreground dark:text-muted-foreground">
                  <Pen className="w-6 h-6 mx-auto mb-1 opacity-40" />
                  <span className="text-xs">No signature</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input ref={sigInputRef} type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                <button type="button" onClick={() => sigInputRef.current?.click()} className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-card dark:hover:bg-slate-700 transition-colors flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" /> Upload Signature
                </button>
                {data.signature && (
                  <button onClick={handleRemoveSignature} className="px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-destructive/10 transition-colors cursor-pointer">
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground max-w-xs">Upload the authorized signer's signature image. This will appear on business certificates and official documents.</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Signatory Name</label>
          <input type="text" value={data.signatureName} onChange={(e) => onChange('signatureName', e.target.value)} placeholder="e.g. Hon. John Doe" className={inputCls} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Signatory Title</label>
          <input type="text" value={data.signatureTitle} onChange={(e) => onChange('signatureTitle', e.target.value)} placeholder="e.g. Municipal Chief Executive" className={inputCls} />
        </div>
      </div>
    </div>
  );
}

// ── Financial Tab ──
function FinancialSettings({ data, onChange }: { data: FinancialInfo; onChange: (field: keyof FinancialInfo, value: string) => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground pb-2 border-b border-border">Financial Settings</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Currency</label>
          <select value={data.currency} onChange={(e) => onChange('currency', e.target.value)} className={selectCls}>
            <option value="GHS">GHS - Ghana Cedis</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Financial Year Start</label>
          <select value={data.financialYearStart} onChange={(e) => onChange('financialYearStart', e.target.value)} className={selectCls}>
            <option value="january">January</option>
            <option value="april">April</option>
            <option value="july">July</option>
            <option value="october">October</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Current Financial Year</label>
          <input type="text" value={data.currentFinancialYear} onChange={(e) => onChange('currentFinancialYear', e.target.value)} placeholder="e.g. 2026" className={inputCls} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Tax Rate (%)</label>
          <input type="number" value={data.taxRate} onChange={(e) => onChange('taxRate', e.target.value)} placeholder="e.g. 10" className={inputCls} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Penalty Rate (%)</label>
          <input type="number" value={data.penaltyRate} onChange={(e) => onChange('penaltyRate', e.target.value)} placeholder="e.g. 5" className={inputCls} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Interest Rate (%)</label>
          <input type="number" value={data.interestRate} onChange={(e) => onChange('interestRate', e.target.value)} placeholder="e.g. 2" className={inputCls} />
        </div>
      </div>
    </div>
  );
}

// ── Billing Tab ──
function BillingSettings({ data, onChange }: { data: BillingInfo; onChange: (field: string, value: any) => void }) {
  const toggleBool = (field: keyof BillingInfo) => onChange(field, !data[field]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground pb-2 border-b border-border">Billing Configuration</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Bill Prefix</label>
          <input type="text" value={data.billPrefix} onChange={(e) => onChange('billPrefix', e.target.value)} placeholder="e.g. KpMA-BILL" className={inputCls} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Receipt Prefix</label>
          <input type="text" value={data.receiptPrefix} onChange={(e) => onChange('receiptPrefix', e.target.value)} placeholder="e.g. KpMA-REC" className={inputCls} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Default Due Days</label>
          <input type="number" value={data.defaultDueDays} onChange={(e) => onChange('defaultDueDays', e.target.value)} placeholder="e.g. 30" className={inputCls} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Penalty After (Days)</label>
          <input type="number" value={data.penaltyAfterDays} onChange={(e) => onChange('penaltyAfterDays', e.target.value)} placeholder="e.g. 15" className={inputCls} />
        </div>
        <ToggleCard label="Auto-Generate Bills" desc="Automatically generate bills at the start of each period" checked={data.autoGenerateBills} onToggle={() => toggleBool('autoGenerateBills')} />
        <ToggleCard label="Include QR Code on Bills" desc="Add QR code and barcode to printed bills" checked={data.includeQrCode} onToggle={() => toggleBool('includeQrCode')} />
        <ToggleCard label="Digital Signature" desc="Include assembly digital signature on receipts" checked={data.digitalSignature} onToggle={() => toggleBool('digitalSignature')} />
        <ToggleCard label="Duplicate Bill Detection" desc="Prevent generation of duplicate bills" checked={data.duplicateBillDetection} onToggle={() => toggleBool('duplicateBillDetection')} />
      </div>
    </div>
  );
}

// ── Security Tab ──
function SecuritySettings({ data, onChange }: { data: SecurityInfo; onChange: (field: string, value: any) => void }) {
  const toggleBool = (field: keyof SecurityInfo) => onChange(field, !data[field]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground pb-2 border-b border-border">Security Settings</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Session Timeout (Minutes)</label>
          <input type="number" value={data.sessionTimeout} onChange={(e) => onChange('sessionTimeout', e.target.value)} placeholder="e.g. 30" className={inputCls} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Max Login Attempts</label>
          <input type="number" value={data.maxLoginAttempts} onChange={(e) => onChange('maxLoginAttempts', e.target.value)} placeholder="e.g. 5" className={inputCls} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Password Min Length</label>
          <input type="number" value={data.passwordMinLength} onChange={(e) => onChange('passwordMinLength', e.target.value)} placeholder="e.g. 8" className={inputCls} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Account Lockout Duration (Minutes)</label>
          <input type="number" value={data.lockoutDuration} onChange={(e) => onChange('lockoutDuration', e.target.value)} placeholder="e.g. 15" className={inputCls} />
        </div>
        <ToggleCard label="Two-Factor Authentication (2FA)" desc="Require 2FA for all users" checked={data.twoFactorAuth} onToggle={() => toggleBool('twoFactorAuth')} />
        <ToggleCard label="Audit Trail Logging" desc="Log all user activities" checked={data.auditTrail} onToggle={() => toggleBool('auditTrail')} />
      </div>
    </div>
  );
}

// ── Notifications Tab ──
function NotificationSettings({ data, onChange }: { data: NotificationInfo; onChange: (field: string, value: boolean) => void }) {
  const items = [
    { key: 'smsDueDateReminders', label: 'SMS Due Date Reminders', desc: 'Send SMS reminder before bill due date' },
    { key: 'emailDueDateReminders', label: 'Email Due Date Reminders', desc: 'Send email reminder before bill due date' },
    { key: 'paymentConfirmationSms', label: 'Payment Confirmation SMS', desc: 'Send SMS after successful payment' },
    { key: 'paymentConfirmationEmail', label: 'Payment Confirmation Email', desc: 'Send email after successful payment' },
    { key: 'overdueBillAlerts', label: 'Overdue Bill Alerts', desc: 'Notify when bills become overdue' },
    { key: 'systemNotifications', label: 'System Notifications', desc: 'Show in-app system notifications' },
    { key: 'dailyCollectionSummary', label: 'Daily Collection Summary', desc: 'Send daily revenue summary to admins' },
    { key: 'weeklyRevenueReport', label: 'Weekly Revenue Report', desc: 'Email weekly revenue report' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground pb-2 border-b border-border">Notification Settings</h2>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 bg-card rounded-lg">
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <button
              type="button"
              onClick={() => onChange(item.key, !data[item.key])}
              className={`relative w-11 h-6 rounded-full transition-colors ${data[item.key] ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${data[item.key] ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Backup Tab ──
function BackupSettings({ data, onChange }: { data: BackupInfo; onChange: (field: string, value: any) => void }) {
  const toggleBool = (field: keyof BackupInfo) => onChange(field, !data[field]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground pb-2 border-b border-border">Backup & Restore</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ToggleCard label="Automatic Daily Backup" desc="Automatically backup database daily at midnight" checked={data.autoDailyBackup} onToggle={() => toggleBool('autoDailyBackup')} />
        <div className="flex items-center justify-between p-4 bg-card rounded-lg">
          <div>
            <p className="text-sm font-medium text-foreground">Backup Retention (Days)</p>
            <p className="text-xs text-muted-foreground">How long to keep backup files</p>
          </div>
          <input type="number" value={data.retentionDays} onChange={(e) => onChange('retentionDays', e.target.value)} placeholder="90" className="w-24 rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition" />
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-4">
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-destructive text-white rounded-lg text-sm font-medium transition-colors">
          <Download className="w-4 h-4" /> Manual Backup Now
        </button>
        <button className="flex items-center gap-2 px-4 py-2.5 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-card dark:hover:bg-slate-700 transition-colors">
          <Upload className="w-4 h-4" /> Restore from Backup
        </button>
        <button className="flex items-center gap-2 px-4 py-2.5 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-card dark:hover:bg-slate-700 transition-colors">
          <RefreshCw className="w-4 h-4" /> Download Latest Backup
        </button>
      </div>
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Recent Backups</h3>
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-center px-4 py-8 text-sm text-muted-foreground dark:text-muted-foreground">
            No backups yet. Click "Manual Backup Now" to create your first backup.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Revenue Categories Tab ──
function BillCategorySettingsPanel({ data, onChange }: { data: BillCategorySettings; onChange: React.Dispatch<React.SetStateAction<BillCategorySettings>> }) {
  const updateCategory = (key: string, field: keyof BillCategoryConfig, value: string | boolean) => {
    onChange((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const colorMap: Record<string, { border: string; bg: string; text: string; badge: string }> = {
    emerald: { border: 'border-primary/40 dark:border-primary', bg: 'bg-primary/10 dark:bg-primary/20', text: 'text-primary dark:text-primary', badge: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary' },
    blue: { border: 'border-blue-300 dark:border-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', badge: 'bg-[var(--accent-blue-light)] text-[var(--info)]' },
    amber: { border: 'border-amber-300 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', badge: 'bg-[var(--accent-amber-light)] text-[var(--warning)]' },
    red: { border: 'border-red-300 dark:border-red-700', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', badge: 'bg-[var(--accent-red-light)] text-destructive' },
    purple: { border: 'border-purple-300 dark:border-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground pb-2 border-b border-border">Revenue Category Configuration</h2>
        <p className="text-sm text-muted-foreground mt-2">Configure billing settings for each revenue category individually. These settings override the global billing configuration when generating bills.</p>
      </div>
      <div className="space-y-4">
        {REVENUE_CATEGORIES.map((cat) => {
          const config = data[cat.key] || defaultBillCategories[cat.key];
          const colors = colorMap[cat.color] || colorMap.emerald;
          return (
            <div key={cat.key} className={`rounded-xl border-border ${colors.border} ${colors.bg} overflow-hidden transition-all`}>
              {/* Category Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 dark:border-border/60">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${colors.badge}`}>
                    {cat.shortLabel}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{cat.label}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateCategory(cat.key, 'enabled', !config.enabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${config.enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              {/* Category Fields */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground dark:text-muted-foreground">Bill Prefix</label>
                  <input
                    type="text"
                    value={config.billPrefix}
                    onChange={(e) => updateCategory(cat.key, 'billPrefix', e.target.value)}
                    placeholder="e.g. BOP-BILL"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground dark:text-muted-foreground">Receipt Prefix</label>
                  <input
                    type="text"
                    value={config.receiptPrefix}
                    onChange={(e) => updateCategory(cat.key, 'receiptPrefix', e.target.value)}
                    placeholder="e.g. BOP-REC"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground dark:text-muted-foreground">Default Due Days</label>
                  <input
                    type="number"
                    value={config.defaultDueDays}
                    onChange={(e) => updateCategory(cat.key, 'defaultDueDays', e.target.value)}
                    placeholder="30"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground dark:text-muted-foreground">Penalty After (Days)</label>
                  <input
                    type="number"
                    value={config.penaltyAfterDays}
                    onChange={(e) => updateCategory(cat.key, 'penaltyAfterDays', e.target.value)}
                    placeholder="15"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Reusable Toggle Card ──
function ToggleCard({ label, desc, checked, onToggle }: { label: string; desc: string; checked: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-lg">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}
