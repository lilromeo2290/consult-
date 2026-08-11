with open('/home/z/my-project/src/components/rms/settings.tsx', 'r') as f:
    content = f.read()

# 1. Add new storage key constant after BACKUP_KEY
old_keys = """const BACKUP_KEY = 'rms-settings-backup';"""
new_keys = """const BACKUP_KEY = 'rms-settings-backup';
const BILL_CATEGORY_KEY = 'rms-settings-bill-categories';"""
assert old_keys in content, 'Could not find BACKUP_KEY!'
content = content.replace(old_keys, new_keys, 1)

# 2. Add BillCategoryConfig interface after BackupInfo interface
old_backup_end = '''interface BackupInfo {
  autoDailyBackup: boolean;
  retentionDays: string;
}'''

new_backup_end = '''interface BackupInfo {
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
};'''

assert old_backup_end in content, 'Could not find BackupInfo interface!'
content = content.replace(old_backup_end, new_backup_end, 1)

# 3. Add billCategories state after backup state
old_state = """  const [backup, setBackup, backupLoading] = useSyncedStorage<BackupInfo>(BACKUP_KEY, defaultBackup);"""
new_state = """  const [backup, setBackup, backupLoading] = useSyncedStorage<BackupInfo>(BACKUP_KEY, defaultBackup);
  const [billCategories, setBillCategories, billCatLoading] = useSyncedStorage<BillCategorySettings>(BILL_CATEGORY_KEY, defaultBillCategories);"""
assert old_state in content, 'Could not find backup state!'
content = content.replace(old_state, new_state, 1)

# 4. Update loaded check to include billCatLoading
old_loaded = 'const loaded = !assemblyLoading && !financialLoading && !billingLoading && !securityLoading && !notifLoading && !backupLoading;'
new_loaded = 'const loaded = !assemblyLoading && !financialLoading && !billingLoading && !securityLoading && !notifLoading && !backupLoading && !billCatLoading;'
assert old_loaded in content, 'Could not find loaded check!'
content = content.replace(old_loaded, new_loaded, 1)

# 5. Add new tab for per-category config
old_tabs = '''  const tabs = [
    { id: 'assembly', label: 'Assembly Info', icon: Building },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'billing', label: 'Billing Config', icon: FileText },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
  ];'''

new_tabs = '''  const tabs = [
    { id: 'assembly', label: 'Assembly Info', icon: Building },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'billing', label: 'Billing Config', icon: FileText },
    { id: 'bill-categories', label: 'Revenue Categories', icon: FileText },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
  ];'''
assert old_tabs in content, 'Could not find tabs!'
content = content.replace(old_tabs, new_tabs, 1)

# 6. Add tab content rendering for bill-categories
old_tab_content = """        {activeTab === 'billing' && loaded && (
          <BillingSettings data={billing} onChange={(field, value) => setBilling((p: BillingInfo) => ({ ...p, [field]: value }))} />
        )}"""

new_tab_content = """        {activeTab === 'billing' && loaded && (
          <BillingSettings data={billing} onChange={(field, value) => setBilling((p: BillingInfo) => ({ ...p, [field]: value }))} />
        )}
        {activeTab === 'bill-categories' && loaded && (
          <BillCategorySettingsPanel data={billCategories} onChange={setBillCategories} />
        )}"""

assert old_tab_content in content, 'Could not find billing tab content!'
content = content.replace(old_tab_content, new_tab_content, 1)

# 7. Add the BillCategorySettingsPanel component before the ToggleCard component
old_toggle = '''// ── Reusable Toggle Card ──
function ToggleCard({ label, desc, checked, onToggle }: { label: string; desc: string; checked: boolean; onToggle: () => void }) {'''

new_toggle = '''// ── Revenue Categories Tab ──
function BillCategorySettingsPanel({ data, onChange }: { data: BillCategorySettings; onChange: React.Dispatch<React.SetStateAction<BillCategorySettings>> }) {
  const updateCategory = (key: string, field: keyof BillCategoryConfig, value: string | boolean) => {
    onChange((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const colorMap: Record<string, { border: string; bg: string; text: string; badge: string }> = {
    emerald: { border: 'border-emerald-300 dark:border-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
    blue: { border: 'border-blue-300 dark:border-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
    amber: { border: 'border-amber-300 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
    red: { border: 'border-red-300 dark:border-red-700', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
    purple: { border: 'border-purple-300 dark:border-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-700">Revenue Category Configuration</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Configure billing settings for each revenue category individually. These settings override the global billing configuration when generating bills.</p>
      </div>
      <div className="space-y-4">
        {REVENUE_CATEGORIES.map((cat) => {
          const config = data[cat.key] || defaultBillCategories[cat.key];
          const colors = colorMap[cat.color] || colorMap.emerald;
          return (
            <div key={cat.key} className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden transition-all`}>
              {/* Category Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${colors.badge}`}>
                    {cat.shortLabel}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{cat.label}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateCategory(cat.key, 'enabled', !config.enabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${config.enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              {/* Category Fields */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Bill Prefix</label>
                  <input
                    type="text"
                    value={config.billPrefix}
                    onChange={(e) => updateCategory(cat.key, 'billPrefix', e.target.value)}
                    placeholder="e.g. BOP-BILL"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Receipt Prefix</label>
                  <input
                    type="text"
                    value={config.receiptPrefix}
                    onChange={(e) => updateCategory(cat.key, 'receiptPrefix', e.target.value)}
                    placeholder="e.g. BOP-REC"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Default Due Days</label>
                  <input
                    type="number"
                    value={config.defaultDueDays}
                    onChange={(e) => updateCategory(cat.key, 'defaultDueDays', e.target.value)}
                    placeholder="30"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Penalty After (Days)</label>
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
function ToggleCard({ label, desc, checked, onToggle }: { label: string; desc: string; checked: boolean; onToggle: () => void }) {'''

assert old_toggle in content, 'Could not find ToggleCard!'
content = content.replace(old_toggle, new_toggle, 1)

with open('/home/z/my-project/src/components/rms/settings.tsx', 'w') as f:
    f.write(content)

print('settings.tsx updated with per-category billing config successfully')
