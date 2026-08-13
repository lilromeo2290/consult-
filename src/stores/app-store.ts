import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AppView = 'landing' | 'login' | 'rms';
type RMSPage =
  | 'dashboard'
  | 'businesses'
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
  | 'bp-payment';

/** All available RMS pages for the permission picker */
const ALL_RMS_PAGES: { page: RMSPage; label: string }[] = [
  { page: 'dashboard', label: 'Dashboard' },
  { page: 'businesses', label: 'Business Registration' },
  { page: 'properties', label: 'Property Register' },
  { page: 'rent', label: 'Lease Management' },
  { page: 'rates', label: 'Rate Configuration' },
  { page: 'penalties', label: 'Penalties' },
  { page: 'building-permit', label: 'Building Permit' },
  { page: 'bp-official', label: 'BP Official' },
  { page: 'bp-payment', label: 'BP Payment' },
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
  hydrated: boolean;
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: 'landing' as AppView,
      rmsPage: 'dashboard' as RMSPage,
      currentUser: null,
      hydrated: false,
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
        if (currentUser.role === 'Administrator') return true;
        if (currentUser.accessiblePages.length === 0) return true;
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
          // Migration: add any newly-added pages to admin's accessiblePages
          if (state.currentUser && state.currentUser.role === 'Administrator') {
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
