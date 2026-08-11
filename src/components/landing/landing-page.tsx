'use client';

import { motion } from 'framer-motion';
import { ThemeToggle } from './theme-toggle';
import { ParticleBackground } from './particle-background';
import { NavigationCard } from './navigation-card';
import { useTheme } from 'next-themes';
import { useAppStore } from '@/stores/app-store';
import {
  Building2,
  Users,
  GraduationCap,
  Package,
  ClipboardList,
  HelpCircle,
  FileText,
  ArrowRightLeft,
  MessageSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface SystemEntry {
  title: string;
  description: string;
  icon: LucideIcon;
  active: boolean;
  route?: string;
}

const SYSTEMS: SystemEntry[] = [
  {
    title: 'RMS',
    description:
      'Access the Revenue Management System securely to manage operations, users, reports, financial records, and administrative functions.',
    icon: ArrowRightLeft,
    active: true,
    route: '/rms',
  },
  {
    title: 'HR Management',
    description:
      'Comprehensive human resources management for employee records, payroll, attendance, and performance evaluations.',
    icon: Users,
    active: false,
  },
  {
    title: 'School Management',
    description:
      'Complete school administration including student enrollment, academic records, scheduling, and grade management.',
    icon: GraduationCap,
    active: false,
  },
  {
    title: 'Property Management',
    description:
      'End-to-end property lifecycle management covering leases, maintenance, inspections, and tenant communications.',
    icon: Building2,
    active: false,
  },
  {
    title: 'Inventory System',
    description:
      'Real-time inventory tracking with stock management, procurement workflows, and automated reorder alerts.',
    icon: Package,
    active: false,
  },
  {
    title: 'Visitor Management',
    description:
      'Streamline visitor registration, check-in/check-out processes, and security compliance with digital logs.',
    icon: ClipboardList,
    active: false,
  },
  {
    title: 'Help Desk',
    description:
      'Centralized ticketing and support system for issue tracking, knowledge base, and team collaboration.',
    icon: HelpCircle,
    active: false,
  },
  {
    title: 'Document Management',
    description:
      'Secure document storage, version control, collaborative editing, and automated workflow approvals.',
    icon: FileText,
    active: false,
  },
  {
    title: 'CMS Community Hub',
    description:
      'Centralized community engagement platform for announcements, discussions, feedback, and public service requests.',
    icon: MessageSquare,
    active: false,
  },
];

export function LandingPage() {
  const { resolvedTheme } = useTheme();
  const openRMS = useAppStore((s) => s.openRMS);
  const mounted = resolvedTheme !== undefined;

  const isDark = resolvedTheme === 'dark';

  const handleCardClick = (entry: SystemEntry) => {
    if (!entry.active) return;
    openRMS();
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background layers */}
      <div
        className="fixed inset-0 -z-10 transition-colors duration-700"
        style={{
          background: isDark
            ? 'linear-gradient(160deg, #060d1f 0%, #0b1d3e 35%, #091733 65%, #050c1a 100%)'
            : 'linear-gradient(160deg, #f0f4fa 0%, #f8fafc 35%, #eef2f9 65%, #f0f4fa 100%)',
        }}
      />

      {/* Soft ambient glow — top left */}
      <div
        className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none -z-10 transition-opacity duration-700"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(11,29,62,0.12) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(11,29,62,0.08) 0%, transparent 70%)',
        }}
      />
      {/* Soft ambient glow — bottom right */}
      <div
        className="fixed bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none -z-10 transition-opacity duration-700"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(227,30,36,0.04) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(227,30,36,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Particles */}
      <div className="fixed inset-0 -z-10 transition-opacity duration-700">
        <ParticleBackground />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header with theme toggle */}
        <header className="flex items-center justify-between px-6 py-4 sm:px-8">
          <div className="w-10" aria-hidden="true" />
          <ThemeToggle />
        </header>

        {/* Main */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="w-full max-w-4xl">
            {/* Hero section */}
            <motion.div
              className="text-center mb-12 sm:mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              {/* Logo */}
              <motion.div
                className="mx-auto mb-6 w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.5,
                  delay: 0.1,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                <img
                  src="/logo.png"
                  alt="CLIPE CONSULT Logo"
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              </motion.div>

              {/* Organization name */}
              <motion.h1
                className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-3"
                style={{
                  color: isDark ? '#f1f5f9' : '#0f172a',
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              >
                Welcome to Our{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      'linear-gradient(135deg, #0B1D3E 0%, #1a3a6e 50%, #E31E24 100%)',
                  }}
                >
                  Digital Services
                </span>
              </motion.h1>

              {/* Tagline */}
              <motion.p
                className="text-sm sm:text-base leading-relaxed max-w-md mx-auto"
                style={{
                  color: isDark
                    ? 'rgba(148,163,184,0.85)'
                    : 'rgba(71,85,105,0.8)',
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
              >
                Select the system you want to access
              </motion.p>
            </motion.div>

            {/* Navigation cards */}
            <nav
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
              aria-label="System navigation"
            >
              {SYSTEMS.map((system, i) => (
                <NavigationCard
                  key={system.title}
                  title={system.title}
                  description={system.description}
                  icon={system.icon}
                  active={system.active}
                  href={system.route}
                  index={i}
                  onClick={() => handleCardClick(system)}
                />
              ))}
            </nav>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-auto px-6 py-6 sm:px-8">
          <motion.p
            className="text-center text-xs tracking-wide"
            style={{
              color: isDark
                ? 'rgba(100,116,139,0.6)'
                : 'rgba(100,116,139,0.5)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            &copy; {new Date().getFullYear()} CLIPE CONSULT. All rights reserved.
          </motion.p>
        </footer>
      </div>
    </div>
  );
}
