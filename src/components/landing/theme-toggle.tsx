'use client';

import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';

  return (
    <motion.button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1D3E] focus-visible:ring-offset-2"
      style={{
        background: isDark
          ? 'rgba(30,41,59,0.6)'
          : 'rgba(241,245,249,0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: isDark
          ? '1px solid rgba(148,163,184,0.15)'
          : '1px solid rgba(203,213,225,0.5)',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 0 : 180, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      >
        {isDark ? (
          <Moon className="w-[18px] h-[18px] text-slate-300" />
        ) : (
          <Sun className="w-[18px] h-[18px] text-amber-500" />
        )}
      </motion.div>
    </motion.button>
  );
}