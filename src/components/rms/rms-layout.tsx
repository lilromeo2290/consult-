'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  Building2,
  Home,
  Key,
  SlidersHorizontal,
  FileText,
  CreditCard,
  Receipt,
  BarChart3,
  UserCog,
  Settings,
  Shield,
  Search,
  Gavel,
  HardHat,
  Stamp,
  UserCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  LogOut,
  Bell,
  ChevronRight,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { useAppStore, type RMSPage } from '@/stores/app-store';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';

// ---------- Nav item definitions ----------

interface NavItem {
  label: string;
  page: RMSPage;
  icon: React.ElementType;
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', page: 'dashboard', icon: LayoutDashboard, group: 'Overview' },
  { label: 'Business Register', page: 'business-register', icon: Building2, group: 'Revenue' },
  { label: 'Property Register', page: 'properties', icon: Home, group: 'Revenue' },
  { label: 'Lease Management', page: 'rent', icon: Key, group: 'Revenue' },
  { label: 'Rate Config', page: 'rates', icon: SlidersHorizontal, group: 'Revenue' },
  { label: 'Penalties', page: 'penalties', icon: Gavel, group: 'Revenue' },
  { label: 'Building Permit', page: 'building-permit', icon: HardHat, group: 'Building' },
  { label: 'BP Official', page: 'bp-official', icon: Stamp, group: 'Building' },
  { label: 'Bill Management', page: 'billing', icon: FileText, group: 'Finance' },
  { label: 'Payments', page: 'payments', icon: CreditCard, group: 'Finance' },
  { label: 'Payment History', page: 'payment-history', icon: Clock, group: 'Finance' },
  { label: 'Receipts', page: 'receipts', icon: Receipt, group: 'Finance' },
  { label: 'Reports', page: 'reports', icon: BarChart3, group: 'System' },
  { label: 'Individual Report', page: 'individual-report', icon: UserCircle, group: 'System' },
  { label: 'User Mgmt', page: 'users', icon: UserCog, group: 'System' },
  { label: 'Settings', page: 'settings', icon: Settings, group: 'System' },
  { label: 'Audit Trail', page: 'audit-trail', icon: Shield, group: 'System' },
  { label: 'Search', page: 'search', icon: Search, group: 'System' },
];

const PAGE_TITLES: Record<RMSPage, string> = {
  dashboard: 'Dashboard',
  'business-register': 'Business Register',
  businesses: 'Businesses',
  properties: 'Property Register',
  rent: 'Lease Management',
  rates: 'Rate Configuration',
  penalties: 'Penalties',
  billing: 'Bill Management',
  payments: 'Payments',
  'payment-history': 'Payment History',
  receipts: 'Receipts',
  reports: 'Reports',
  'individual-report': 'Individual Report',
  users: 'User Management',
  settings: 'Settings',
  search: 'Search',
  'audit-trail': 'Audit Trail',
  'building-permit': 'Building Permit',
  'bp-official': 'BP Official',
  'fines-management': 'Fines Management',
};

// ---------- Constants ----------

const SIDEBAR_EXPANDED = 260;
const SIDEBAR_COLLAPSED = 72;

// ---------- Sidebar Nav Item ----------

function SidebarNavItem({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  const button = (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150',
        active
          ? 'bg-sidebar-active text-sidebar-active-fg'
          : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-white',
        collapsed && 'justify-center px-0',
      )}
      aria-current={active ? 'page' : undefined}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-accent-teal" />
      )}
      <Icon
        className={cn(
          'shrink-0 transition-colors',
          active ? 'text-accent-teal' : 'text-sidebar-foreground group-hover:text-white',
        )}
        size={20}
      />
      {!collapsed && (
        <span className='truncate'>{item.label}</span>
      )}
      {!collapsed && active && (
        <ChevronRight className='ml-auto size-3.5 text-sidebar-active-fg opacity-60' />
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side='right' sideOffset={12}>
          <p>{item.label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

// ---------- Sidebar Content (shared between desktop & mobile) ----------

function SidebarContent({
  currentPage,
  collapsed,
  onNavigate,
  onBack,
  onCloseMobile,
}: {
  currentPage: RMSPage;
  collapsed: boolean;
  onNavigate: (page: RMSPage) => void;
  onBack: () => void;
  onCloseMobile?: () => void;
}) {
  const currentUser = useAppStore((s) => s.currentUser);
  const canAccess = useAppStore((s) => s.canAccess);

  const visibleNavItems = useMemo(() => {
    if (!currentUser) return NAV_ITEMS;
    return NAV_ITEMS.filter((item) => canAccess(item.page));
  }, [currentUser, canAccess]);

  // Group items
  const groupedItems = useMemo(() => {
    const groups: Record<string, NavItem[]> = {};
    visibleNavItems.forEach((item) => {
      const g = item.group || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    });
    return groups;
  }, [visibleNavItems]);

  const handleNavigate = useCallback(
    (page: RMSPage) => {
      onNavigate(page);
      onCloseMobile?.();
    },
    [onNavigate, onCloseMobile]
  );

  return (
    <div className='flex h-full flex-col bg-sidebar-bg'>
      {/* Logo / Branding */}
      <div
        className={cn(
          'flex h-[68px] shrink-0 items-center border-b border-sidebar-border px-4',
          collapsed && 'justify-center px-0'
        )}
      >
        <img
          src='/logo-sidebar.png'
          alt='RMS Logo'
          className='h-9 w-9 object-contain rounded-lg'
        />
        {!collapsed && (
          <div className='ml-3 flex flex-col'>
            <span className='text-[13px] font-bold tracking-tight text-white leading-tight'>
              CLIPE CONSULT
            </span>
            <span className='text-[10px] font-medium text-sidebar-foreground/70 uppercase tracking-widest leading-tight'>
              Revenue System
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className='flex-1 overflow-y-auto px-3 py-4 space-y-5'>
        {Object.entries(groupedItems).map(([group, items]) => (
          <div key={group}>
            {!collapsed && (
              <p className='px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40'>
                {group}
              </p>
            )}
            <nav className='flex flex-col gap-0.5' role='navigation' aria-label={`${group} navigation`}>
              {items.map((item) => (
                <SidebarNavItem
                  key={item.page}
                  item={item}
                  active={currentPage === item.page}
                  collapsed={collapsed}
                  onClick={() => handleNavigate(item.page)}
                />
              ))}
            </nav>
          </div>
        ))}
        {visibleNavItems.length === 0 && (
          <p className='text-xs text-sidebar-foreground/50 text-center py-4'>No pages assigned</p>
        )}
      </div>

      {/* Bottom: Logout */}
      <div className='shrink-0 border-t border-sidebar-border p-3'>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={onBack}
                className='flex w-full items-center justify-center rounded-lg p-2.5 text-sidebar-foreground/60 transition-colors hover:bg-red-500/10 hover:text-red-400'
                aria-label='Logout'
              >
                <LogOut size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side='right' sideOffset={12}>
              <p>Logout</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={onBack}
            className='flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-sidebar-foreground/60 transition-colors hover:bg-red-500/10 hover:text-red-400'
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Main Layout Component ----------

export function RmsLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { rmsPage, setRMSPage, logout, currentUser } = useAppStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const pageTitle = useMemo(() => PAGE_TITLES[rmsPage] ?? 'Dashboard', [rmsPage]);

  // ---- Mobile layout ----
  if (isMobile) {
    return (
      <div className='flex h-dvh flex-col'>
        {/* Mobile Header */}
        <header className='flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 shadow-sm'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setMobileOpen(true)}
            aria-label='Open navigation menu'
            className='text-muted-foreground'
          >
            <Menu size={20} />
          </Button>
          <h1 className='text-[15px] font-semibold text-foreground truncate'>
            {pageTitle}
          </h1>
          <div className='ml-auto flex items-center gap-1'>
            <Button variant='ghost' size='icon' className='relative text-muted-foreground' aria-label='Notifications'>
              <Bell size={18} />
            </Button>
            <Avatar className='h-7 w-7'>
              <AvatarImage src='' alt='User avatar' />
              <AvatarFallback className='text-[10px] bg-primary text-primary-foreground'>
                {currentUser ? `${currentUser.firstName[0]}${currentUser.lastName[0]}` : 'AD'}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Main content */}
        <main className='flex-1 overflow-y-auto bg-[#F5F7FA] dark:bg-background p-4'>
          {children}
        </main>

        {/* Mobile Drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side='left' className='w-[280px] p-0 bg-sidebar-bg border-none' aria-label='Navigation sidebar'>
            <SheetTitle className='sr-only'>Navigation Menu</SheetTitle>
            <SidebarContent
              currentPage={rmsPage}
              collapsed={false}
              onNavigate={setRMSPage}
              onBack={() => { logout(); setMobileOpen(false); }}
              onCloseMobile={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // ---- Desktop layout ----
  return (
    <div className='flex h-dvh overflow-hidden'>
      {/* Sidebar */}
      <aside
        className={cn(
          'relative flex shrink-0 flex-col transition-[width] duration-200 ease-in-out',
          'border-r border-sidebar-border bg-sidebar-bg',
        )}
        style={{ width: sidebarWidth }}
      >
        <SidebarContent
          currentPage={rmsPage}
          collapsed={sidebarCollapsed}
          onNavigate={setRMSPage}
          onBack={logout}
        />
      </aside>

      {/* Main area */}
      <div className='flex flex-1 flex-col overflow-hidden bg-[#F5F7FA] dark:bg-background'>
        {/* Top Header Bar */}
        <header className='flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-6 shadow-sm'>
          <Button
            variant='ghost'
            size='icon'
            onClick={toggleSidebar}
            className='text-muted-foreground'
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </Button>

          <div className='w-px h-5 bg-border' />

          <h1 className='text-[15px] font-semibold text-foreground'>{pageTitle}</h1>

          <div className='flex-1' />

          {/* Right-side header actions */}
          <div className='flex items-center gap-3'>
            <Button variant='ghost' size='icon' className='relative text-muted-foreground' aria-label='Notifications'>
              <Bell size={18} />
            </Button>

            <div className='w-px h-5 bg-border' />

            <div className='flex items-center gap-2.5'>
              <Avatar className='h-7 w-7'>
                <AvatarImage src='' alt='User avatar' />
                <AvatarFallback className='text-[10px] bg-primary text-primary-foreground'>
                  {currentUser ? `${currentUser.firstName[0]}${currentUser.lastName[0]}` : 'AD'}
                </AvatarFallback>
              </Avatar>
              <div className='hidden lg:flex flex-col'>
                <span className='text-[13px] font-medium text-foreground leading-tight'>
                  {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Admin User'}
                </span>
                <span className='text-[11px] text-muted-foreground leading-tight'>
                  {currentUser?.role || 'Administrator'}
                </span>
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={logout}
                className='ml-1 text-muted-foreground hover:text-destructive'
              >
                <LogOut size={16} />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className='flex-1 overflow-y-auto p-6'>
          {children}
        </main>
      </div>
    </div>
  );
}