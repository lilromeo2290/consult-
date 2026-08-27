'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useSyncedStorage } from '@/hooks/use-synced-storage';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCog,
  Eye,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Filter,
  Save,
  LayoutGrid,
  Check,
  SquareStack,
  LogIn,
  KeyRound,
  UserCircle,
} from 'lucide-react';
import { ALL_RMS_PAGES, useAppStore, type RMSPage } from '@/stores/app-store';

// ─── Types ───────────────────────────────────────────────────────────────────

type UserRole = 'Administrator' | 'Revenue Officer' | 'Field Collector' | 'Auditor' | 'Finance Manager';
type UserStatus = 'Active' | 'Inactive' | 'Suspended';
type PagePermission = 'view' | 'add' | 'edit' | 'delete' | 'export' | 'import';

const ALL_PAGE_PERMISSIONS: PagePermission[] = ['view', 'add', 'edit', 'delete', 'export', 'import'];

const PERMISSION_LABELS: Record<PagePermission, string> = {
  view: 'View Page',
  add: 'Add Records',
  edit: 'Edit Records',
  delete: 'Delete Records',
  export: 'Export Data',
  import: 'Import Data',
};

const PERMISSION_ICONS: Record<PagePermission, string> = {
  view: '👁',
  add: '➕',
  edit: '✏️',
  delete: '🗑️',
  export: '📤',
  import: '📥',
};

interface User {
  id: string;
  staffId: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  zone: string;
  ward: string;
  status: UserStatus;
  lastLogin: string;
  dateCreated: string;
  ghanaCard: string;
  accessiblePages: RMSPage[];
  pagePermissions: Record<string, PagePermission[]>;
}

interface UserFormData {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  zone: string;
  ward: string;
  ghanaCard: string;
  accessiblePages: RMSPage[];
  pagePermissions: Record<string, PagePermission[]>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const roleIcon: Record<UserRole, string> = {
  Administrator: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  'Revenue Officer': 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  'Field Collector': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Auditor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Finance Manager': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
};

const statusConfig: Record<UserStatus, { pill: string; icon: React.ElementType }> = {
  Active: { pill: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary', icon: CheckCircle2 },
  Inactive: { pill: 'bg-muted text-muted-foreground dark:bg-slate-700 dark:text-muted-foreground', icon: Clock },
  Suspended: { pill: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

const ALL_PAGES: RMSPage[] = ALL_RMS_PAGES.map((p) => p.page);

const ROLE_DEFAULT_PAGES: Record<UserRole, RMSPage[]> = {
  'Administrator': ALL_PAGES,
  'Revenue Officer': ['dashboard', 'businesses', 'properties', 'billing', 'payments', 'payment-history', 'receipts', 'search'],
  'Field Collector': ['dashboard', 'businesses', 'properties', 'payments', 'receipts', 'search'],
  'Auditor': ['dashboard', 'businesses', 'properties', 'billing', 'payments', 'payment-history', 'receipts', 'reports', 'audit-trail', 'search'],
  'Finance Manager': ['dashboard', 'billing', 'payments', 'payment-history', 'receipts', 'reports', 'search'],
};

const defaultPagePermissions = (): Record<string, PagePermission[]> => {
  const perms: Record<string, PagePermission[]> = {};
  ALL_PAGES.forEach((p) => { perms[p] = [...ALL_PAGE_PERMISSIONS]; });
  return perms;
};

const emptyForm: UserFormData = {
  username: '',
  password: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'Field Collector',
  zone: 'Zone A',
  ward: '',
  ghanaCard: '',
  accessiblePages: [...ALL_PAGES],
  pagePermissions: defaultPagePermissions(),
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const USERS_STORAGE_KEY = 'rms-users';

const defaultUsers: User[] = [
  { id: 'USR-001', staffId: 'STF-001', username: 'admin', password: 'admin123', firstName: 'System', lastName: 'Administrator', email: 'admin@kpma.gov.gh', phone: '', role: 'Administrator', zone: 'Zone A', ward: '', status: 'Active', lastLogin: new Date().toISOString().split('T')[0], dateCreated: new Date().toISOString().split('T')[0], ghanaCard: '', accessiblePages: ALL_PAGES, pagePermissions: defaultPagePermissions() },
];

function migrateUsers(raw: unknown): User[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultUsers;
  return raw.map((u: Partial<User>) => {
    const base = {
      ...defaultUsers[0],
      ...u,
      lastLogin: u.lastLogin || 'Never',
      dateCreated: u.dateCreated || new Date().toISOString().split('T')[0],
    } as User;
    // Only auto-add new pages for Administrators
    if (base.role === 'Administrator') {
      const missing = ALL_PAGES.filter((p) => !base.accessiblePages.includes(p));
      if (missing.length > 0) {
        base.accessiblePages = [...base.accessiblePages, ...missing];
        missing.forEach((p) => { base.pagePermissions[p] = [...ALL_PAGE_PERMISSIONS]; });
      }
    }
    // Migrate old users without pagePermissions
    if (!base.pagePermissions || Object.keys(base.pagePermissions).length === 0) {
      base.pagePermissions = {};
      base.accessiblePages.forEach((p) => {
        base.pagePermissions[p] = [...ALL_PAGE_PERMISSIONS];
      });
    }
    return base;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 8;

export function UsersPage() {
  const [serverUsers, setServerUsers] = useSyncedStorage<User[]>(USERS_STORAGE_KEY, defaultUsers);
  const loginSuccess = useAppStore((s) => s.loginSuccess);

  // Migrate users from server data (ensure all fields + pages present)
  const users = useMemo(() => migrateUsers(serverUsers), [serverUsers]);

  // Persist to server + localStorage on every change
  const updateUsers = useCallback((updater: (prev: User[]) => User[]) => {
    setServerUsers((prev) => {
      const next = updater(prev);
      return next;
    });
  }, [setServerUsers]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | UserRole>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | UserStatus>('All');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());

  const toggleExpand = (page: string) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(page)) next.delete(page); else next.add(page);
      return next;
    });
  };
  const [viewUser, setViewUser] = useState<User | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      const matchSearch =
        !q ||
        fullName.includes(q) ||
        u.staffId.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.zone.toLowerCase().includes(q);
      const matchRole = roleFilter === 'All' || u.role === roleFilter;
      const matchStatus = statusFilter === 'All' || u.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const activeCount = users.filter((u) => u.status === 'Active').length;
  const inactiveCount = users.filter((u) => u.status === 'Inactive').length;
  const suspendedCount = users.filter((u) => u.status === 'Suspended').length;

  const openAdd = () => {
    setForm(emptyForm);
    setShowAddModal(true);
  };

  const openEdit = (user: User) => {
    const perms: Record<string, PagePermission[]> = {};
    ALL_PAGES.forEach((p) => {
      perms[p] = user.pagePermissions?.[p] ? [...user.pagePermissions[p]] : [...ALL_PAGE_PERMISSIONS];
    });
    setForm({
      username: user.username || '',
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      zone: user.zone,
      ward: user.ward,
      ghanaCard: user.ghanaCard,
      accessiblePages: user.accessiblePages || ROLE_DEFAULT_PAGES[user.role],
      pagePermissions: perms,
    });
    setEditUser(user);
  };

  // When role changes, only update role and zone — pages are chosen manually
  const handleRoleChange = (role: UserRole) => {
    setForm((prev) => ({
      ...prev,
      role,
      zone: (role === 'Revenue Officer' || role === 'Field Collector') ? prev.zone : '',
    }));
  };

  const togglePage = (page: RMSPage) => {
    setForm((prev) => {
      const isSelected = prev.accessiblePages.includes(page);
      const newPages = isSelected
        ? prev.accessiblePages.filter((p) => p !== page)
        : [...prev.accessiblePages, page];
      const newPerms = { ...prev.pagePermissions };
      if (isSelected) {
        delete newPerms[page];
      } else {
        newPerms[page] = [...ALL_PAGE_PERMISSIONS];
      }
      return { ...prev, accessiblePages: newPages, pagePermissions: newPerms };
    });
  };

  const selectAllPages = () => {
    const perms: Record<string, PagePermission[]> = {};
    ALL_PAGES.forEach((p) => { perms[p] = [...ALL_PAGE_PERMISSIONS]; });
    setForm((prev) => ({ ...prev, accessiblePages: [...ALL_PAGES], pagePermissions: perms }));
  };
  const deselectAllPages = () => setForm((prev) => ({ ...prev, accessiblePages: [], pagePermissions: {} }));

  const togglePermission = (page: RMSPage, perm: PagePermission) => {
    setForm((prev) => {
      const current = prev.pagePermissions[page] || [];
      const newPermsForPage = current.includes(perm)
        ? current.filter((p) => p !== perm)
        : [...current, perm];
      const newPages = newPermsForPage.length === 0
        ? prev.accessiblePages.filter((p) => p !== page)
        : prev.accessiblePages.includes(page)
          ? prev.accessiblePages
          : [...prev.accessiblePages, page];
      const newAllPerms = { ...prev.pagePermissions, [page]: newPermsForPage };
      if (newPermsForPage.length === 0) delete newAllPerms[page];
      return { ...prev, accessiblePages: newPages, pagePermissions: newAllPerms };
    });
  };

  const toggleAllPermissionsForPage = (page: RMSPage, enable: boolean) => {
    setForm((prev) => {
      const newPerms = { ...prev.pagePermissions };
      const newPages = enable
        ? prev.accessiblePages.includes(page) ? prev.accessiblePages : [...prev.accessiblePages, page]
        : prev.accessiblePages.filter((p) => p !== page);
      if (enable) {
        newPerms[page] = [...ALL_PAGE_PERMISSIONS];
      } else {
        delete newPerms[page];
      }
      return { ...prev, accessiblePages: newPages, pagePermissions: newPerms };
    });
  };

  const handleSave = () => {
    // Validate compulsory fields
    const missing: string[] = [];
    if (!form.username?.trim()) missing.push('Username');
    if (!editUser && !form.password?.trim()) missing.push('Password');
    if (!form.firstName?.trim()) missing.push('First Name');
    if (!form.lastName?.trim()) missing.push('Last Name');
    if (!form.email?.trim()) missing.push('Email');
    if (!form.phone?.trim()) missing.push('Phone');
    if (missing.length > 0) {
      alert('Please complete the following required field(s):\n\n' + missing.map((f) => '• ' + f).join('\n'));
      return;
    }
    if (editUser) {
      updateUsers((prev) =>
        prev.map((u) =>
          u.id === editUser.id
            ? { ...u, ...form, password: form.password || u.password } // keep old password if blank
            : u
        )
      );
      setEditUser(null);
    } else {
      const newUser: User = {
        id: String(Date.now()),
        staffId: `STF-${String(users.length + 1).padStart(3, '0')}`,
        ...form,
        status: 'Active',
        lastLogin: 'Never',
        dateCreated: new Date().toISOString().slice(0, 10),
      };
      updateUsers((prev) => [newUser, ...prev]);
      setShowAddModal(false);
    }
    toast.success('Successfully saved');
    setForm(emptyForm);
  };

  const handleDelete = (id: string) => {
    updateUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const toggleStatus = (id: string) => {
    updateUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' }
          : u
      )
    );
  };

  const handleLoginAs = (user: User) => {
    if (user.status === 'Suspended') return;
    // Update last login
    const now = new Date();
    const lastLogin = now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 8);
    updateUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, lastLogin } : u))
    );
    // Login as this user with their exact permissions
    loginSuccess({
      id: user.id,
      staffId: user.staffId,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      accessiblePages: user.accessiblePages,
    });
  };

  const updateForm = (field: keyof UserFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isValid =
    form.username.trim() !== '' &&
    (editUser || form.password.trim() !== '') &&
    form.firstName.trim() !== '' &&
    form.lastName.trim() !== '' &&
    form.email.trim() !== '' &&
    form.phone.trim() !== '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage system users, roles, and access permissions
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-destructive text-white px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white dark:bg-muted border border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary dark:text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-xl font-bold text-foreground">{users.length}</p>
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-muted border border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-primary dark:text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-xl font-bold text-foreground">{activeCount}</p>
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-muted border border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-muted dark:bg-slate-700 flex items-center justify-center">
            <Clock className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Inactive</p>
            <p className="text-xl font-bold text-foreground">{inactiveCount}</p>
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-muted border border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Suspended</p>
            <p className="text-xl font-bold text-foreground">{suspendedCount}</p>
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
                placeholder="Search by name, staff ID, email, or zone..."
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
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3">
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value as 'All' | UserRole); setPage(1); }}
                className="rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="All">All Roles</option>
                <option value="Administrator">Administrator</option>
                <option value="Revenue Officer">Revenue Officer</option>
                <option value="Field Collector">Field Collector</option>
                <option value="Auditor">Auditor</option>
                <option value="Finance Manager">Finance Manager</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as 'All' | UserStatus); setPage(1); }}
                className="rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-card/50 sticky top-0 z-10">
              <tr className="border-b border-border">
                <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">Username</th>
                <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">Name</th>
                <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">Role</th>
                <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">Zone / Ward</th>
                <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">Status</th>
                <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3">Last Login</th>
                <th className="text-xs uppercase text-muted-foreground font-medium px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground dark:text-muted-foreground">
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((u) => {
                  const StatusIcon = statusConfig[u.status].icon;
                  return (
                    <tr key={u.id} className="hover:bg-card dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-foreground">{u.username}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary text-xs font-bold shrink-0">
                            {u.firstName[0]}{u.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${roleIcon[u.role]}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground">{(u.role === 'Revenue Officer' || u.role === 'Field Collector') ? u.zone : '—'}</p>
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground">{u.ward}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusConfig[u.status].pill}`}>
                          <StatusIcon className="w-3 h-3" />
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-muted-foreground dark:text-muted-foreground">{(u.lastLogin || 'Never').split(' ')[0]}</div>
                        <div className="text-xs text-muted-foreground dark:text-muted-foreground">{(u.lastLogin || '').split(' ')[1] || ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewUser(u)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary dark:hover:dark:text-primary hover:bg-primary/10 dark:hover:dark:bg-primary/20 transition-colors"
                            title="View user"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary dark:hover:dark:text-primary hover:bg-primary/10 dark:hover:dark:bg-primary/20 transition-colors"
                            title="Edit user"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleStatus(u.id)}
                            className={`p-1.5 rounded-lg transition-colors ${u.status === 'Active' ? 'text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-amber-500 hover:text-primary dark:hover:dark:text-primary hover:bg-primary/10 dark:hover:dark:bg-primary/20'}`}
                            title={u.status === 'Active' ? 'Deactivate' : 'Activate'}
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleLoginAs(u)}
                            className={`p-1.5 rounded-lg transition-colors ${u.status === 'Suspended' ? 'text-slate-300 dark:text-muted-foreground cursor-not-allowed' : 'text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                            title={u.status === 'Suspended' ? 'User is suspended' : `Login as ${u.firstName} ${u.lastName}`}
                            disabled={u.status === 'Suspended'}
                          >
                            <LogIn className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive dark:hover:text-red-400 hover:bg-destructive/10 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Showing {paginated.length} of {filtered.length} users
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

      {/* Add/Edit Modal */}
      {(showAddModal || editUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setEditUser(null); setForm(emptyForm); }} />
          <div className="relative bg-white dark:bg-muted rounded-xl border-border shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-primary dark:text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  {editUser ? 'Edit User' : 'Add New User'}
                </h2>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setEditUser(null); setForm(emptyForm); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground dark:hover:text-slate-300 hover:bg-muted dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Username</label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) => updateForm('username', e.target.value)}
                      className="w-full rounded-lg border-border bg-card pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g. kmensah"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Password {editUser && <span className="text-muted-foreground font-normal">(leave blank to keep)</span>}
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={form.password}
                      onChange={(e) => updateForm('password', e.target.value)}
                      className="w-full rounded-lg border-border bg-card pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={editUser ? '********' : 'Set login password'}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">First Name</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => updateForm('firstName', e.target.value)}
                    className="w-full rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Kwame"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Last Name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => updateForm('lastName', e.target.value)}
                    className="w-full rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Mensah"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm('email', e.target.value)}
                  className="w-full rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="kwame.mensah@kma.gov.gh"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateForm('phone', e.target.value)}
                  className="w-full rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="+233 24 567 8901"
                />
              </div>
              <div className={`grid gap-4 ${(form.role === 'Revenue Officer' || form.role === 'Field Collector') ? 'grid-cols-2' : ''}`}>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Field Collector">Field Collector</option>
                    <option value="Revenue Officer">Revenue Officer</option>
                    <option value="Auditor">Auditor</option>
                    <option value="Finance Manager">Finance Manager</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>
                {(form.role === 'Revenue Officer' || form.role === 'Field Collector') && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Zone</label>
                    <select
                      value={form.zone}
                      onChange={(e) => updateForm('zone', e.target.value)}
                      className="w-full rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Zone A">Zone A</option>
                      <option value="Zone B">Zone B</option>
                      <option value="Zone C">Zone C</option>
                      <option value="Zone D">Zone D</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Ward</label>
                <input
                  type="text"
                  value={form.ward}
                  onChange={(e) => updateForm('ward', e.target.value)}
                  className="w-full rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Bantama"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Ghana Card No.</label>
                <input
                  type="text"
                  value={form.ghanaCard}
                  onChange={(e) => updateForm('ghanaCard', e.target.value)}
                  className="w-full rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="GHA-123456789-0"
                />
              </div>

              {/* ── Navigation Permissions ── */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-primary dark:text-primary" />
                    <label className="text-sm font-semibold text-foreground">
                      Navigation Access
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllPages}
                      className="text-xs text-primary dark:text-primary hover:underline font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300 dark:text-muted-foreground">|</span>
                    <button
                      type="button"
                      onClick={deselectAllPages}
                      className="text-xs text-red-500 dark:text-red-400 hover:underline font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Choose which pages this user can access and set action permissions.
                </p>
                <div className="max-h-72 overflow-y-auto rounded-lg border border-border bg-card/50 divide-y divide-border">
                  {ALL_RMS_PAGES.map((p) => {
                    const isSelected = form.accessiblePages.includes(p.page);
                    const perms = form.pagePermissions[p.page] || [];
                    const allPerms = ALL_PAGE_PERMISSIONS.every((pp) => perms.includes(pp));
                    const isExpanded = expandedPages.has(p.page);
                    return (
                      <div key={p.page}>
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => togglePage(p.page)}
                            className="w-4 h-4 rounded border-border accent-primary"
                          />
                          <span className={`flex-1 text-xs font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {p.label}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] text-muted-foreground mr-1">
                              {perms.length}/{ALL_PAGE_PERMISSIONS.length}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleExpand(p.page)}
                            disabled={!isSelected}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
                              isSelected
                                ? 'text-primary dark:text-primary hover:bg-primary/10'
                                : 'text-muted-foreground cursor-not-allowed'
                            }`}
                          >
                            {isExpanded ? 'Collapse' : 'Permissions'}
                          </button>
                        </div>
                        {isExpanded && isSelected && (
                          <div className="px-3 pb-3 pl-9 space-y-1.5">
                            <div className="flex items-center gap-3 mb-2">
                              <button
                                type="button"
                                onClick={() => toggleAllPermissionsForPage(p.page, !allPerms)}
                                className="text-[10px] font-medium text-primary dark:text-primary hover:underline"
                              >
                                {allPerms ? 'Deselect All' : 'Select All'}
                              </button>
                            </div>
                            {ALL_PAGE_PERMISSIONS.map((perm) => {
                              const hasPerm = perms.includes(perm);
                              return (
                                <label
                                  key={perm}
                                  className="flex items-center gap-2 cursor-pointer group"
                                >
                                  <input
                                    type="checkbox"
                                    checked={hasPerm}
                                    onChange={() => togglePermission(p.page, perm)}
                                    className="w-3.5 h-3.5 rounded border-border accent-primary"
                                  />
                                  <span className={`text-[11px] ${hasPerm ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                    {PERMISSION_LABELS[perm]}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground dark:text-muted-foreground">
                  <SquareStack className="w-3 h-3" />
                  {form.accessiblePages.length} of {ALL_PAGES.length} pages selected
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 p-5 border-t border-border flex-shrink-0">
              <button
                onClick={() => { setShowAddModal(false); setEditUser(null); setForm(emptyForm); }}
                className="rounded-lg border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-card dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!isValid}
                className="inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-destructive disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                {editUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewUser(null)} />
          <div className="relative bg-white dark:bg-muted rounded-xl border-border shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary text-sm font-bold">
                  {viewUser.firstName[0]}{viewUser.lastName[0]}
                </div>
                <h2 className="text-lg font-semibold text-foreground">{viewUser.firstName} {viewUser.lastName}</h2>
              </div>
              <button onClick={() => setViewUser(null)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground dark:hover:text-slate-300 hover:bg-muted dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <ViewField label="Username" value={viewUser.username} />
                <ViewField label="Staff ID" value={viewUser.staffId} />
                <ViewField label="Ghana Card" value={viewUser.ghanaCard} />
                <ViewField label="Role" value={viewUser.role} />
                <ViewField label="Status" value={viewUser.status} />
                {(viewUser.role === 'Revenue Officer' || viewUser.role === 'Field Collector') && (
                  <ViewField label="Zone" value={viewUser.zone} />
                )}
                <ViewField label="Ward" value={viewUser.ward} />
              </div>
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  <Mail className="w-4 h-4" />{viewUser.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  <Phone className="w-4 h-4" />{viewUser.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  <Clock className="w-4 h-4" />Last login: {viewUser.lastLogin}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  <MapPin className="w-4 h-4" />Created: {viewUser.dateCreated}
                </div>
              </div>
              {/* Accessible Pages */}
              <div className="border-t border-border pt-4">
                <p className="text-xs uppercase text-muted-foreground font-medium mb-2">Accessible Navigation Pages</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_RMS_PAGES.map((p) => {
                    const hasAccess = viewUser.accessiblePages?.includes(p.page);
                    return (
                      <span
                        key={p.page}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                          hasAccess
                            ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                            : 'bg-muted text-muted-foreground dark:bg-slate-700 dark:text-muted-foreground line-through'
                        }`}
                      >
                        {p.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Login As Button */}
              {viewUser.status !== 'Suspended' && (
                <div className="border-t border-border pt-4">
                  <button
                    onClick={() => { handleLoginAs(viewUser); setViewUser(null); }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-sm font-medium transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Login as {viewUser.firstName} {viewUser.lastName}
                  </button>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-2 text-center">
                    Switch to this user's session with their exact navigation permissions
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ViewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
