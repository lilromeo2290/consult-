'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  Building2,
  Home,
  Key,
  Settings2,
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
  Wallet,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  LogOut,
  Bell,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { useAppStore, type RMSPage } from '@/stores/app-store';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', page: 'dashboard', icon: LayoutDashboard },
  { label: 'Businesses', page: 'businesses', icon: Building2 },
  { label: 'Property Register', page: 'properties', icon: Home },
  { label: 'Lease Management', page: 'rent', icon: Key },
  { label: 'Rate Config', page: 'rates', icon: Settings2 },
  { label: 'Penalties', page: 'penalties', icon: Gavel },
  { label: 'Building Permit', page: 'building-permit', icon: HardHat },
  { label: 'BP Official', page: 'bp-official', icon: Stamp },
  { label: 'BP Payment', page: 'bp-payment', icon: Wallet },
  { label: 'Billing', page: 'billing', icon: FileText },
  { label: 'Payments', page: 'payments', icon: CreditCard },
  { label: 'Payment History', page: 'payment-history', icon: Clock },
  { label: 'Receipts', page: 'receipts', icon: Receipt },
  { label: 'Reports', page: 'reports', icon: BarChart3 },
  { label: 'User Mgmt', page: 'users', icon: UserCog },
  { label: 'Settings', page: 'settings', icon: Settings },
  { label: 'Audit Trail', page: 'audit-trail', icon: Shield },
  { label: 'Search', page: 'search', icon: Search },
];

const PAGE_TITLES: Record<RMSPage, string> = {
  dashboard: 'Dashboard',
  businesses: 'Businesses',
  properties: 'Property Register',
  rent: 'Lease Management',
  rates: 'Rate Configuration',
  penalties: 'Penalties',
  billing: 'Billing',
  payments: 'Payments',
  'payment-history': 'Payment History',
  receipts: 'Receipts',
  reports: 'Reports',
  users: 'User Management',
  settings: 'Settings',
  search: 'Search',
  'audit-trail': 'Audit Trail',
  'building-permit': 'Building Permit',
  'bp-official': 'BP Official',
  'bp-payment': 'BP Payment',
};

// ---------- Constants ----------

const SIDEBAR_EXPANDED = 260;
const SIDEBAR_COLLAPSED = 70;

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
        'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground',
        collapsed && 'justify-center px-0'
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon
        className={cn(
          'shrink-0',
          active ? 'text-primary' : 'text-muted-foreground group-hover:text-accent-foreground',
        )}
        size={20}
      />
      {!collapsed && (
        <span className='truncate'>{item.label}</span>
      )}
      {!collapsed && active && (
        <ChevronRight className='ml-auto size-4 text-primary' />
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

  // Filter nav items based on current user's permissions
  const visibleNavItems = useMemo(() => {
    if (!currentUser) return NAV_ITEMS; // Fallback: show all if no user set
    return NAV_ITEMS.filter((item) => canAccess(item.page));
  }, [currentUser, canAccess]);

  const handleNavigate = useCallback(
    (page: RMSPage) => {
      onNavigate(page);
      onCloseMobile?.();
    },
    [onNavigate, onCloseMobile]
  );

  return (
    <div className='flex h-full flex-col'>
      {/* Logo */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-3 border-b border-border px-4',
          collapsed && 'justify-center px-0'
        )}
      >
        <img
          src='/logo-sidebar.png'
          alt='RMS Logo'
          className={cn(
            'h-8 w-8 object-contain',
            collapsed && 'h-8 w-8'
          )}
        />
        {!collapsed && (
          <span className='text-base font-semibold tracking-tight text-foreground'>
            Revenue Management
          </span>
        )}
      </div>

      {/* Nav items */}
      <div className='flex-1 overflow-y-auto px-3 py-3'>
        <nav
          className='flex flex-col gap-1'
          role='navigation'
          aria-label='Main navigation'
        >
          {visibleNavItems.map((item) => (
            <SidebarNavItem
              key={item.page}
              item={item}
              active={currentPage === item.page}
              collapsed={collapsed}
              onClick={() => handleNavigate(item.page)}
            />
          ))}
          {visibleNavItems.length === 0 && (
            <p className='text-xs text-muted-foreground text-center py-4'>No pages assigned</p>
          )}
        </nav>
      </div>

      {/* Bottom section - Back / Exit */}
      <div className='shrink-0 border-t border-border p-3'>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={onBack}
                className='flex w-full items-center justify-center rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                aria-label='Logout'
              >
                <LogOut size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side='right' sideOffset={12}>
              <p>Logout</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={onBack}
            className='flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          >
            <LogOut size={20} />
            <span>Logout</span>
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

  // Local state: sidebar collapsed (desktop only)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Mobile drawer open state
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
        <header className='flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setMobileOpen(true)}
            aria-label='Open navigation menu'
          >
            <Menu size={20} />
          </Button>
          <h1 className='text-base font-semibold text-foreground truncate'>
            {pageTitle}
          </h1>
          <div className='ml-auto flex items-center gap-1'>
            <Button variant='ghost' size='icon' className='relative' aria-label='Notifications'>
              <Bell size={18} />
            </Button>
            <Button variant='ghost' size='icon' onClick={logout} aria-label='Logout' className='text-muted-foreground hover:text-destructive'>
              <LogOut size={18} />
            </Button>
            <Avatar className='h-8 w-8'>
              <AvatarImage src='' alt='User avatar' />
              <AvatarFallback className='text-xs'>
                {currentUser ? `${currentUser.firstName[0]}${currentUser.lastName[0]}` : 'AD'}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Main content */}
        <main className='flex-1 overflow-y-auto bg-muted/30 p-4'>
          {children}
        </main>

        {/* Mobile Drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side='left' className='w-[280px] p-0' aria-label='Navigation sidebar'>
            <SheetTitle className='sr-only'>Navigation Menu</SheetTitle>
            <SidebarContent
              currentPage={rmsPage}
              collapsed={false}
              onNavigate={setRMSPage}
              onBack={() => {
                logout();
                setMobileOpen(false);
              }}
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
          'relative flex shrink-0 flex-col border-r border-border bg-background transition-[width] duration-200 ease-in-out',
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
      <div className='flex flex-1 flex-col overflow-hidden'>
        {/* Top Header Bar */}
        <header className='flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-6'>
          {/* Sidebar toggle */}
          <Button
            variant='ghost'
            size='icon'
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
          </Button>

          <Separator orientation='vertical' className='h-6' />

          {/* Page title */}
          <h1 className='text-base font-semibold text-foreground'>{pageTitle}</h1>

          {/* Spacer */}
          <div className='flex-1' />

          {/* Right-side header actions */}
          <div className='flex items-center gap-2'>
            <Button variant='ghost' size='icon' className='relative' aria-label='Notifications'>
              <Bell size={18} />
            </Button>
            <Separator orientation='vertical' className='h-6' />
            <div className='flex items-center gap-2'>
              <Avatar className='h-8 w-8'>
                <AvatarImage src='' alt='User avatar' />
                <AvatarFallback className='text-xs'>
                  {currentUser ? `${currentUser.firstName[0]}${currentUser.lastName[0]}` : 'AD'}
                </AvatarFallback>
              </Avatar>
              <span className='text-sm font-medium text-foreground hidden lg:inline'>
                {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Admin User'}
              </span>
              <Button
                variant='ghost'
                size='sm'
                onClick={logout}
                className='ml-1 text-xs text-muted-foreground hover:text-destructive'
              >
                <LogOut size={16} className='mr-1' />
                <span className='hidden xl:inline'>Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className='flex-1 overflow-y-auto bg-muted/30 p-6'>
          {children}
        </main>
      </div>
    </div>
  );
}
