'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useAppStore, type AppUser } from '@/stores/app-store';
import { ParticleBackground } from './particle-background';
import { ThemeToggle } from './theme-toggle';
import {
  Eye,
  EyeOff,
  Lock,
  User,
  Loader2,
  AlertCircle,
  Shield,
  UserX,
  Download,
} from 'lucide-react';
import { usePwaInstall } from '@/components/pwa-install-prompt';

const USERS_STORAGE_KEY = 'rms-users';

// Must match ALL_RMS_PAGES in app-store.ts exactly
const ALL_PAGES = ['dashboard','businesses','rates','billing','payments','payment-history','receipts','reports','users','settings','search','audit-trail'];

interface StoredUser {
  id: string;
  staffId: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  accessiblePages: string[];
}

function migrateStoredUsers(raw: unknown): StoredUser[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((u: Partial<StoredUser>) => {
    const base: StoredUser = {
      id: u.id || 'USR-001',
      staffId: u.staffId || 'STF-001',
      username: u.username || '',
      password: u.password || '',
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      role: u.role || 'Revenue Officer',
      status: u.status || 'Active',
      accessiblePages: u.accessiblePages || [],
    };
    // Only auto-add new pages for Administrators
    if (base.role === 'Administrator') {
      const missing = ALL_PAGES.filter((p) => !base.accessiblePages.includes(p));
      if (missing.length > 0) {
      base.accessiblePages = [...base.accessiblePages, ...missing];
      }
    }
    return base;
  });
}

const defaultAdmin: StoredUser = {
  id: 'USR-001',
  staffId: 'STF-001',
  username: 'admin',
  password: 'admin123',
  firstName: 'System',
  lastName: 'Administrator',
  role: 'Administrator',
  status: 'Active',
  accessiblePages: ALL_PAGES,
};

export function LoginPage() {
  const { resolvedTheme } = useTheme();
  const loginSuccess = useAppStore((s) => s.loginSuccess);
  const { isInstallable, promptInstall } = usePwaInstall();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [storedUsers, setStoredUsers] = useState<StoredUser[]>([]);
  const [usersReady, setUsersReady] = useState(false);

  // Load users from server first, then localStorage fallback
  useEffect(() => {
    const initUsers = async () => {
      try {
        const res = await fetch(`/api/rms-data?key=${encodeURIComponent(USERS_STORAGE_KEY)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data !== null && json.data !== undefined) {
            const migrated = migrateStoredUsers(json.data);
            if (migrated.length > 0) {
              setStoredUsers(migrated);
              setUsersReady(true);
              return;
            }
          }
        }
      } catch { /* fallback to localStorage */ }

      // Fallback: localStorage
      try {
        const raw = localStorage.getItem(USERS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const migrated = migrateStoredUsers(parsed);
          if (migrated.length > 0) {
            setStoredUsers(migrated);
            // Sync to server
            fetch('/api/rms-data', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: USERS_STORAGE_KEY, data: migrated }),
            }).catch(() => {});
          }
        }
      } catch { /* ignore */ }

      // If still no users, seed default admin
      if (storedUsers.length === 0) {
        const seed = [defaultAdmin];
        setStoredUsers(seed);
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(seed));
        fetch('/api/rms-data', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: USERS_STORAGE_KEY, data: seed }),
        }).catch(() => {});
      }
      setUsersReady(true);
    };
    initUsers();
  }, []);

  const isDark = resolvedTheme === 'dark';
  const mounted = resolvedTheme !== undefined;
  // Don't render login form until users are loaded from server
  if (!usersReady || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);

    // Simulate authentication delay
    setTimeout(() => {
      // Try to find the user in stored users
      const matched = storedUsers.find(
        (u) => u.username === username.trim() && u.password === password
      );

      if (matched) {
        // Check if user is suspended
        if (matched.status === 'Suspended') {
          setError('Your account has been suspended. Contact the administrator.');
          setLoading(false);
          return;
        }
        // Check if user is inactive
        if (matched.status === 'Inactive') {
          setError('Your account is inactive. Contact the administrator to activate it.');
          setLoading(false);
          return;
        }

        // Login with the user's stored permissions
        const appUser: AppUser = {
          id: matched.id,
          staffId: matched.staffId,
          firstName: matched.firstName,
          lastName: matched.lastName,
          role: matched.role,
          accessiblePages: (matched.accessiblePages || []) as AppUser['accessiblePages'],
        };
        loginSuccess(appUser);
      } else {
        setError('Invalid username or password. Please try again.');
        setLoading(false);
      }
    }, 800);
  };

  const inputCls = (hasError: boolean) =>
    `w-full rounded-xl border ${hasError ? 'border-red-400 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#0B1D3E] focus:border-[#0B1D3E] outline-none transition-all duration-200`;

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 -z-10 transition-colors duration-700"
        style={{
          background: isDark
            ? 'linear-gradient(160deg, #060d1f 0%, #0b1d3e 35%, #091733 65%, #050c1a 100%)'
            : 'linear-gradient(160deg, #f0f4fa 0%, #f8fafc 35%, #eef2f9 65%, #f0f4fa 100%)',
        }}
      />

      {/* Ambient glow */}
      <div
        className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none -z-10"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(11,29,62,0.12) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(11,29,62,0.08) 0%, transparent 70%)',
        }}
      />
      <div
        className="fixed bottom-[-15%] right-[-10%] w-[400px] h-[400px] rounded-full pointer-events-none -z-10"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(227,30,36,0.04) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(227,30,36,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Particles */}
      <div className="fixed inset-0 -z-10">
        <ParticleBackground />
      </div>

      {/* Header */}
      <header className="flex items-center justify-end px-6 py-4 sm:px-8 relative z-10">
        <ThemeToggle />
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 relative z-10">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Logo */}
          <motion.div
            className="mx-auto mb-8 w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <img
              src="/logo.png"
              alt="CLIPE CONSULT Logo"
              className="w-full h-full object-contain"
              draggable={false}
            />
          </motion.div>

          {/* Title */}
          <div className="text-center mb-8">
            <motion.h1
              className="text-2xl sm:text-3xl font-bold tracking-tight mb-2"
              style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Revenue Management System
            </motion.h1>
            <motion.p
              className="text-sm"
              style={{ color: isDark ? 'rgba(148,163,184,0.85)' : 'rgba(71,85,105,0.8)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Sign in to access the RMS portal
            </motion.p>
          </div>

          {/* Glass Card */}
          <motion.div
            className="rounded-2xl p-6 sm:p-8"
            style={{
              background: isDark
                ? 'rgba(15,23,42,0.6)'
                : 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(20px)',
              border: isDark
                ? '1px solid rgba(51,65,85,0.5)'
                : '1px solid rgba(226,232,240,0.8)',
              boxShadow: isDark
                ? '0 25px 50px rgba(0,0,0,0.3)'
                : '0 25px 50px rgba(0,0,0,0.08)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40"
                  >
                    {error.includes('suspended') || error.includes('inactive') ? (
                      <UserX className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
                    )}
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>
                  Username
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'rgba(148,163,184,0.6)' }}
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(''); }}
                    placeholder="Enter your username"
                    autoComplete="username"
                    className={`${inputCls(!!error && !username)} pl-11`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'rgba(148,163,184,0.6)' }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className={`${inputCls(!!error && !password)} pl-11 pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded cursor-pointer"
                    style={{ color: 'rgba(148,163,184,0.6)' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #0B1D3E 0%, #E31E24 100%)',
                  boxShadow: '0 4px 14px rgba(11,29,62,0.35)',
                }}
                whileHover={!loading ? { scale: 1.01, boxShadow: '0 6px 20px rgba(11,29,62,0.45)' } : undefined}
                whileTap={!loading ? { scale: 0.99 } : undefined}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </motion.button>
            </form>

            {/* Install App Button (Android) */}
            {isInstallable && (
              <motion.button
                type="button"
                onClick={promptInstall}
                className="w-full mt-3 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer active:scale-[0.98]"
                style={{
                  background: isDark
                    ? 'rgba(31,122,140,0.15)'
                    : 'rgba(31,122,140,0.08)',
                  color: '#1F7A8C',
                  border: '1px solid rgba(31,122,140,0.25)',
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <Download size={15} />
                Install App on Your Phone
              </motion.button>
            )}

          </motion.div>

          {/* Footer text */}
          <motion.p
            className="text-center text-xs mt-6"
            style={{ color: isDark ? 'rgba(100,116,139,0.5)' : 'rgba(100,116,139,0.4)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            CLIPE CONSULT Revenue Management System
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
