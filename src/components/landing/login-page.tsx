'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useAppStore, type AppUser } from '@/stores/app-store';
import { usePwaInstall } from '@/components/pwa-install-prompt';
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
  Wifi,
  Cloud,
  FileText,
  Smartphone,
  BarChart3,
  Database,
  Globe,
  Zap,
} from 'lucide-react';

const USERS_STORAGE_KEY = 'rms-users';
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

// Floating tech icons
const FLOATING_ICONS = [
  { Icon: Wifi, x: '8%', y: '15%', size: 20, delay: 0, duration: 6 },
  { Icon: Cloud, x: '88%', y: '12%', size: 22, delay: 1, duration: 7 },
  { Icon: FileText, x: '12%', y: '78%', size: 18, delay: 2, duration: 5.5 },
  { Icon: Smartphone, x: '85%', y: '80%', size: 20, delay: 0.5, duration: 6.5 },
  { Icon: BarChart3, x: '5%', y: '45%', size: 16, delay: 1.5, duration: 7.5 },
  { Icon: Database, x: '92%', y: '48%', size: 18, delay: 3, duration: 6 },
  { Icon: Globe, x: '15%', y: '30%', size: 14, delay: 2.5, duration: 5 },
  { Icon: Zap, x: '80%', y: '30%', size: 16, delay: 0.8, duration: 8 },
];

function FloatingIcon({ Icon, x, y, size, delay, duration }: { Icon: React.ElementType; x: string; y: string; size: number; delay: number; duration: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none hidden lg:flex items-center justify-center"
      style={{ left: x, top: y, width: size + 16, height: size + 16 }}
      animate={{
        y: [0, -12, 0],
        opacity: [0.3, 0.7, 0.3],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: size + 16,
          height: size + 16,
          border: '1px solid rgba(6, 182, 212, 0.3)',
          boxShadow: '0 0 12px rgba(6, 182, 212, 0.15), inset 0 0 8px rgba(6, 182, 212, 0.08)',
        }}
      >
        <Icon size={size} style={{ color: 'rgba(6, 182, 212, 0.6)' }} strokeWidth={1.5} />
      </div>
    </motion.div>
  );
}

// Connection lines canvas
function ConnectionCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    // Draw static connection lines
    const drawLines = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = h / 2;

      ctx.strokeStyle = 'rgba(6, 182, 212, 0.06)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);

      // Lines from center to corners/edges
      const points = [
        [w * 0.1, h * 0.2], [w * 0.9, h * 0.15],
        [w * 0.08, h * 0.5], [w * 0.92, h * 0.5],
        [w * 0.12, h * 0.8], [w * 0.88, h * 0.82],
        [w * 0.5, h * 0.05], [w * 0.5, h * 0.95],
      ];

      for (const [px, py] of points) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
        ctx.stroke();
      }

      // Small dots at intersections
      ctx.setLineDash([]);
      for (const [px, py] of points) {
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
        ctx.fill();
      }
    };

    drawLines();
    window.addEventListener('resize', drawLines);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('resize', drawLines);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block" />;
}

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

      try {
        const raw = localStorage.getItem(USERS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const migrated = migrateStoredUsers(parsed);
          if (migrated.length > 0) {
            setStoredUsers(migrated);
            fetch('/api/rms-data', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: USERS_STORAGE_KEY, data: migrated }),
            }).catch(() => {});
          }
        }
      } catch { /* ignore */ }

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

  const mounted = resolvedTheme !== undefined;
  if (!usersReady || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const matched = storedUsers.find(
        (u) => u.username === username.trim() && u.password === password
      );

      if (matched) {
        if (matched.status === 'Suspended') {
          setError('Your account has been suspended. Contact the administrator.');
          setLoading(false);
          return;
        }
        if (matched.status === 'Inactive') {
          setError('Your account is inactive. Contact the administrator to activate it.');
          setLoading(false);
          return;
        }

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

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Dark tech gradient background */}
      <div
        className="fixed inset-0 -z-20"
        style={{
          background: 'linear-gradient(135deg, #0a0e27 0%, #0d1b3e 30%, #0c2d48 60%, #064e6e 85%, #0891b2 100%)',
        }}
      />

      {/* Animated glow orbs */}
      <div
        className="fixed pointer-events-none -z-10"
        style={{
          top: '10%',
          left: '15%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="fixed pointer-events-none -z-10"
        style={{
          bottom: '5%',
          right: '10%',
          width: 450,
          height: 450,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />
      <div
        className="fixed pointer-events-none -z-10"
        style={{
          top: '50%',
          left: '55%',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
          filter: 'blur(45px)',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Connection lines */}
      <ConnectionCanvas />

      {/* Floating icons */}
      <div className="fixed inset-0 pointer-events-none -z-5">
        {FLOATING_ICONS.map((props, i) => (
          <FloatingIcon key={i} {...props} />
        ))}
      </div>

      {/* Grid overlay */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none hidden lg:block"
        style={{
          backgroundImage:
            'linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

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
            <div
              className="w-full h-full flex items-center justify-center rounded-2xl"
              style={{
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                boxShadow: '0 0 30px rgba(6, 182, 212, 0.15)',
              }}
            >
              <img
                src="/logo.png"
                alt="RMS Logo"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                draggable={false}
              />
            </div>
          </motion.div>

          {/* Title */}
          <div className="text-center mb-8">
            <motion.h1
              className="text-2xl sm:text-3xl font-bold tracking-wider mb-2"
              style={{ color: '#f0f9ff' }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Revenue Management System
            </motion.h1>
            <motion.p
              className="text-sm tracking-wide"
              style={{ color: 'rgba(165, 211, 233, 0.7)' }}
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
              background: 'rgba(255, 255, 255, 0.04)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 60px rgba(6, 182, 212, 0.06)',
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
                    className="flex items-start gap-2.5 p-3 rounded-xl"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    {error.includes('suspended') || error.includes('inactive') ? (
                      <UserX className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    )}
                    <p className="text-sm text-red-300">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Username */}
              <div>
                <label
                  className="block text-xs font-medium mb-2 uppercase tracking-widest"
                  style={{ color: 'rgba(165, 211, 233, 0.7)' }}
                >
                  Username
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'rgba(6, 182, 212, 0.5)' }}
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(''); }}
                    placeholder="Enter your username"
                    autoComplete="username"
                    className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 pl-11 text-sm text-white placeholder:text-slate-500 outline-none transition-all duration-300 focus:border-cyan-500/40 focus:shadow-[0_0_16px_rgba(6,182,212,0.12)]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  className="block text-xs font-medium mb-2 uppercase tracking-widest"
                  style={{ color: 'rgba(165, 211, 233, 0.7)' }}
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'rgba(6, 182, 212, 0.5)' }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 pl-11 pr-11 text-sm text-white placeholder:text-slate-500 outline-none transition-all duration-300 focus:border-cyan-500/40 focus:shadow-[0_0_16px_rgba(6,182,212,0.12)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded cursor-pointer"
                    style={{ color: 'rgba(165, 211, 233, 0.4)' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 50%, #06b6d4 100%)',
                  boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
                whileHover={!loading ? { scale: 1.01, boxShadow: '0 6px 28px rgba(6, 182, 212, 0.45), inset 0 1px 0 rgba(255,255,255,0.1)' } : undefined}
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

            {/* Install App Button */}
            {isInstallable && (
              <motion.button
                type="button"
                onClick={promptInstall}
                className="w-full mt-3 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer active:scale-[0.98]"
                style={{
                  background: 'rgba(6, 182, 212, 0.08)',
                  color: 'rgba(165, 211, 233, 0.8)',
                  border: '1px solid rgba(6, 182, 212, 0.15)',
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

          {/* Footer */}
          <motion.p
            className="text-center text-xs mt-6 tracking-wide"
            style={{ color: 'rgba(100, 150, 180, 0.4)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            Revenue Management System
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
