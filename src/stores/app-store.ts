import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AppView = 'rms';
type RMSPage =
  | 'dashboard'
  | 'business-register'
  | 'properties'
  | 'rent'
  | 'rates'
  | 'penalties'
  | 'billing'
  | 'payments'
  | 'payment-history'
  | 'receipts'
  | 'reports'
  | 'users'
  | 'settings'
  | 'search'
  | 'audit-trail'
  | 'building-permit'
  | 'bp-official'
  | 'fines-management'

/** All available RMS pages for the permission picker */
const ALL_RMS_PAGES: { page: RMSPage; label: string }[] = [
  { page: 'dashboard', label: 'Dashboard' },
  { page: 'business-register', label: 'Business Register' },
  { page: 'properties', label: 'Property Register' },
  { page: 'rent', label: 'Lease Management' },
  { page: 'rates', label: 'Rate Configuration' },
  { page: 'penalties', label: 'Penalties' },
  { page: 'building-permit', label: 'Building Permit' },
  { page: 'bp-official', label: 'BP Official' },
  { page: 'fines-management', label: 'Fines Management' },
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

const DEFAULT_ADMIN = {
  id: 'USR-001',
  staffId: 'STF-001',
  firstName: 'System',
  lastName: 'Administrator',
  role: 'Administrator',
  accessiblePages: ALL_RMS_PAGES.map((p) => p.page),
};

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
  hydrated: boolean;
  setView: (view: AppView) => void;
  setRMSPage: (page: RMSPage) => void;
  loginSuccess: (user?: AppUser) => void;
  logout: () => void;
  setCurrentUser: (user: AppUser | null) => void;
  /** Check if the current user can access a given page */
  canAccess: (page: RMSPage) => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: 'rms' as AppView,
      rmsPage: 'dashboard' as RMSPage,
      currentUser: DEFAULT_ADMIN as AppUser,
      hydrated: false,
      setView: (view) => set({ view }),
      setRMSPage: (page) => set({ rmsPage: page }),
      loginSuccess: (user) => {
        const defaultAdmin: AppUser = user ?? DEFAULT_ADMIN;
        set({ view: 'rms', rmsPage: 'dashboard', currentUser: defaultAdmin });
      },
      logout: () => set({ view: 'rms', rmsPage: 'dashboard', currentUser: DEFAULT_ADMIN }),
      setCurrentUser: (user) => set({ currentUser: user }),
      canAccess: (page) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        if (currentUser.role === 'Administrator') return true;
        if (currentUser.accessiblePages.length === 0) return false;
        return currentUser.accessiblePages.includes(page);
      },
    }),
    {
      name: 'rms-app-state',
      // Only persist these fields
      partialize: (state) => ({
        view: state.view,
        rmsPage: state.rmsPage,
        currentUser: state.currentUser,
      }),
      // Mark as hydrated after rehydration completes
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Force RMS view always
          state.view = 'rms';
          // Ensure admin user exists
          if (!state.currentUser) {
            state.currentUser = DEFAULT_ADMIN as AppUser;
          }
          // Migration: add any newly-added pages to admin's accessiblePages
          if (state.currentUser.role === 'Administrator') {
            const allPages = ALL_RMS_PAGES.map((p) => p.page);
            const current = state.currentUser.accessiblePages || [];
            const hasNew = allPages.some((p) => !current.includes(p));
            if (hasNew) {
              state.currentUser = {
                ...state.currentUser,
                accessiblePages: allPages,
              };
            }
          }
          state.hydrated = true;
        }
      },
    },
  ),
);

export type { AppView, RMSPage, AppUser };
export { ALL_RMS_PAGES };
