import { create } from 'zustand';

type AppView = 'landing' | 'login' | 'rms';
type RMSPage =
  | 'dashboard'
  | 'businesses'
  | 'properties'
  | 'rent'
  | 'rates'
  | 'billing'
  | 'payments'
  | 'payment-history'
  | 'receipts'
  | 'reports'
  | 'users'
  | 'settings'
  | 'search'
  | 'audit-trail';

/** All available RMS pages for the permission picker */
const ALL_RMS_PAGES: { page: RMSPage; label: string }[] = [
  { page: 'dashboard', label: 'Dashboard' },
  { page: 'businesses', label: 'Business Registration' },
  { page: 'properties', label: 'Property Register' },
  { page: 'rent', label: 'Lease Management' },
  { page: 'rates', label: 'Rate Configuration' },
  { page: 'billing', label: 'Bill Management' },
  { page: 'payments', label: 'Payments' },
  { page: 'payment-history', label: 'Payment History' },
  { page: 'receipts', label: 'Receipts' },
  { page: 'reports', label: 'Reports' },
  { page: 'users', label: 'User Management' },
  { page: 'settings', label: 'Settings' },
  { page: 'audit-trail', label: 'Audit Trail' },
  { page: 'search', label: 'Search' },
];

interface AppUser {
  id: string;
  staffId: string;
  firstName: string;
  lastName: string;
  role: string;
  accessiblePages: RMSPage[];
}

interface AppState {
  view: AppView;
  rmsPage: RMSPage;
  currentUser: AppUser | null;
  setView: (view: AppView) => void;
  setRMSPage: (page: RMSPage) => void;
  openRMS: () => void;
  showLogin: () => void;
  loginSuccess: (user?: AppUser) => void;
  logout: () => void;
  backToLanding: () => void;
  setCurrentUser: (user: AppUser | null) => void;
  /** Check if the current user can access a given page */
  canAccess: (page: RMSPage) => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'landing',
  rmsPage: 'dashboard',
  currentUser: null,
  setView: (view) => set({ view }),
  setRMSPage: (page) => set({ rmsPage: page }),
  openRMS: () => set({ view: 'login' }),
  showLogin: () => set({ view: 'login' }),
  loginSuccess: (user) => {
    const defaultAdmin: AppUser = user ?? {
      id: 'USR-001',
      staffId: 'STF-001',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'Administrator',
      accessiblePages: ALL_RMS_PAGES.map((p) => p.page),
    };
    set({ view: 'rms', rmsPage: 'dashboard', currentUser: defaultAdmin });
  },
  logout: () => set({ view: 'landing', rmsPage: 'dashboard', currentUser: null }),
  backToLanding: () => set({ view: 'landing' }),
  setCurrentUser: (user) => set({ currentUser: user }),
  canAccess: (page) => {
    const { currentUser } = get();
    if (!currentUser) return false;
    // Administrator always has full access to everything
    if (currentUser.role === 'Administrator') return true;
    // If accessiblePages is empty, grant all access (safety fallback)
    if (currentUser.accessiblePages.length === 0) return true;
    return currentUser.accessiblePages.includes(page);
  },
}));

export type { AppView, RMSPage, AppUser };
export { ALL_RMS_PAGES };
