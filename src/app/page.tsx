'use client';

import { motion } from 'framer-motion';
import { LoginPage } from '@/components/landing/login-page';
import { RmsLayout } from '@/components/rms/rms-layout';
import { DashboardPage } from '@/components/rms/dashboard';
import { BusinessRegisterPage } from '@/components/rms/business-register';
import { PropertiesPage } from '@/components/rms/properties';
import { RentPage } from '@/components/rms/rent';

import { RateConfigPage } from '@/components/rms/rate-config';
import { PenaltiesPage } from '@/components/rms/penalties';
import { BillingPage } from '@/components/rms/billing';
import { PaymentsPage } from '@/components/rms/payments';
import { PaymentHistoryPage } from '@/components/rms/payment-history';
import { ReceiptsPage } from '@/components/rms/receipts';
import { ReportsPage } from '@/components/rms/reports';
import { UsersPage } from '@/components/rms/users';
import { SettingsPage } from '@/components/rms/settings';
import { SearchPage } from '@/components/rms/search';
import { AuditTrailPage } from '@/components/rms/audit-trail';
import { BuildingPermitPage } from '@/components/rms/building-permit';
import { BPOfficialPage } from '@/components/rms/bp-official';
import { FinesManagementPage } from '@/components/rms/fines-management';
import { useAppStore, type RMSPage } from '@/stores/app-store';
import { loadOverrides } from '@/lib/rate-overrides';
import type { RateEntry } from '@/lib/rate-overrides';

function RMSView() {
  const rmsPage = useAppStore((s) => s.rmsPage);

  // Load persisted rate overrides into memory once when RMS loads
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/rms-data?key=rms-rate-overrides');
        if (!res.ok) return;
        const json = await res.json();
        if (json.data && typeof json.data === 'object') {
          loadOverrides(json.data as Record<string, RateEntry>);
        }
      } catch (err) {
        console.error('Failed to preload rate overrides:', err);
      }
    })();
  }, []);

  const renderPage = () => {
    switch (rmsPage) {
      case 'dashboard': return <DashboardPage />;
      case 'business-register': return <BusinessRegisterPage />;
      case 'properties': return <PropertiesPage />;
      case 'rent': return <RentPage />;

      case 'rates': return <RateConfigPage />;
      case 'penalties': return <PenaltiesPage />;
      case 'billing': return <BillingPage />;
      case 'payments': return <PaymentsPage />;
      case 'payment-history': return <PaymentHistoryPage />;
      case 'receipts': return <ReceiptsPage />;
      case 'reports': return <ReportsPage />;
      case 'users': return <UsersPage />;
      case 'settings': return <SettingsPage />;
      case 'search': return <SearchPage />;
      case 'audit-trail': return <AuditTrailPage />;
      case 'building-permit': return <BuildingPermitPage />;
      case 'bp-official': return <BPOfficialPage />;
      case 'fines-management': return <FinesManagementPage />;
      default: return <DashboardPage />;
    }
  };

  return <RmsLayout>{renderPage()}</RmsLayout>;
}

export default function Home() {
  const view = useAppStore((s) => s.view);

  return (
    <>
      {view === 'login' && (
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <LoginPage />
        </motion.div>
      )}

      {view === 'rms' && (
        <motion.div
          key="rms"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <RMSView />
        </motion.div>
      )}
    </>
  );
}
