// ─── Permission Codes ─────────────────────────────────────────────────────
// These are checked by the auth middleware to enforce RBAC.
// Format: module:action  (e.g. business:read, invoice:create)

export const PERMISSIONS = {
  // Business
  business: {
    read: 'business:read',
    create: 'business:create',
    update: 'business:update',
    delete: 'business:delete',
    export: 'business:export',
    import: 'business:import',
  },
  // Property
  property: {
    read: 'property:read',
    create: 'property:create',
    update: 'property:update',
    delete: 'property:delete',
    export: 'property:export',
    import: 'property:import',
  },
  // Billing
  invoice: {
    read: 'invoice:read',
    create: 'invoice:create',
    update: 'invoice:update',
    delete: 'invoice:delete',
  },
  // Payment
  payment: {
    read: 'payment:read',
    create: 'payment:create',
    cancel: 'payment:cancel',
  },
  // Fine
  fine: {
    read: 'fine:read',
    create: 'fine:create',
    update: 'fine:update',
    delete: 'fine:delete',
    waive: 'fine:waive',
  },
  // Reports
  report: {
    view: 'report:view',
    export: 'report:export',
  },
  // Admin
  user: {
    read: 'user:read',
    create: 'user:create',
    update: 'user:update',
    delete: 'user:delete',
  },
  audit: {
    read: 'audit:read',
  },
  settings: {
    read: 'settings:read',
    manage: 'settings:manage',
  },
} as const;

// All permission codes flat for seeding
export const ALL_PERMISSION_CODES: { code: string; module: string; description: string }[] = [
  // Business
  { code: 'business:read', module: 'business', description: 'View businesses' },
  { code: 'business:create', module: 'business', description: 'Register new business' },
  { code: 'business:update', module: 'business', description: 'Edit business details' },
  { code: 'business:delete', module: 'business', description: 'Delete a business' },
  { code: 'business:export', module: 'business', description: 'Export business data' },
  { code: 'business:import', module: 'business', description: 'Import business data' },
  // Property
  { code: 'property:read', module: 'property', description: 'View properties' },
  { code: 'property:create', module: 'property', description: 'Register new property' },
  { code: 'property:update', module: 'property', description: 'Edit property details' },
  { code: 'property:delete', module: 'property', description: 'Delete a property' },
  { code: 'property:export', module: 'property', description: 'Export property data' },
  { code: 'property:import', module: 'property', description: 'Import property data' },
  // Invoice
  { code: 'invoice:read', module: 'invoice', description: 'View invoices/bills' },
  { code: 'invoice:create', module: 'invoice', description: 'Generate bills' },
  { code: 'invoice:update', module: 'invoice', description: 'Modify invoices' },
  { code: 'invoice:delete', module: 'invoice', description: 'Cancel/delete invoices' },
  // Payment
  { code: 'payment:read', module: 'payment', description: 'View payments' },
  { code: 'payment:create', module: 'payment', description: 'Record payments' },
  { code: 'payment:cancel', module: 'payment', description: 'Cancel payments' },
  // Fine
  { code: 'fine:read', module: 'fine', description: 'View fines' },
  { code: 'fine:create', module: 'fine', description: 'Create fines' },
  { code: 'fine:update', module: 'fine', description: 'Edit fines' },
  { code: 'fine:delete', module: 'fine', description: 'Delete fines' },
  { code: 'fine:waive', module: 'fine', description: 'Waive fines' },
  // Reports
  { code: 'report:view', module: 'report', description: 'View reports' },
  { code: 'report:export', module: 'report', description: 'Export reports' },
  // Users
  { code: 'user:read', module: 'user', description: 'View users' },
  { code: 'user:create', module: 'user', description: 'Create users' },
  { code: 'user:update', module: 'user', description: 'Edit users' },
  { code: 'user:delete', module: 'user', description: 'Delete users' },
  // Audit
  { code: 'audit:read', module: 'audit', description: 'View audit trail' },
  // Settings
  { code: 'settings:read', module: 'settings', description: 'View settings' },
  { code: 'settings:manage', module: 'settings', description: 'Manage settings' },
];

// Role → permissions map for seeding
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  Administrator: ALL_PERMISSION_CODES.map((p) => p.code),
  'Revenue Superintendent': [
    'business:read', 'business:create', 'business:update', 'business:export',
    'property:read', 'property:export',
    'invoice:read', 'invoice:create', 'invoice:update',
    'payment:read', 'payment:create',
    'fine:read', 'fine:create', 'fine:update',
    'report:view', 'report:export',
    'audit:read',
  ],
  'Revenue Collector': [
    'business:read',
    'property:read',
    'invoice:read',
    'payment:read', 'payment:create',
    'fine:read',
  ],
  Cashier: [
    'invoice:read',
    'payment:read', 'payment:create',
    'report:view',
  ],
  Auditor: [
    'business:read', 'business:export',
    'property:read', 'property:export',
    'invoice:read',
    'payment:read',
    'fine:read',
    'report:view', 'report:export',
    'audit:read',
  ],
};
