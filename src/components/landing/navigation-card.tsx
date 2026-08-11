'use client';

import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useCallback, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import type { LucideIcon } from 'lucide-react';

interface NavCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  active: boolean;
  href?: string;
  index: number;
  onClick?: () => void;
}

export function NavigationCard({
  title,
  description,
  icon: Icon,
  active,
  index,
  onClick,
}: NavCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 150, damping: 15 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 15 });
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!cardRef.current || !active) return;
      const rect = cardRef.current.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY, active]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!active || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();
      setRipples((prev) => [...prev, { x, y, id }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 800);
      onClick?.();
    },
    [active, onClick]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (active && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick?.();
      }
    },
    [active, onClick]
  );

  const cardStyle: React.CSSProperties = {
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: active
      ? '1px solid rgba(11,29,62,0.2)'
      : isDark
        ? '1px solid rgba(148,163,184,0.1)'
        : '1px solid rgba(203,213,225,0.6)',
    background: active
      ? 'linear-gradient(135deg, rgba(11,29,62,0.08) 0%, rgba(227,30,36,0.03) 100%)'
      : isDark
        ? 'rgba(30, 41, 59, 0.35)'
        : 'rgba(255, 255, 255, 0.7)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: 0.3 + index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={
          `relative overflow-hidden rounded-2xl p-6 transition-all duration-300 ` +
          (active
            ? `group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1D3E] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900`
            : 'cursor-not-allowed opacity-70')
        }
        style={cardStyle}
        whileHover={
          active
            ? {
                y: -4,
                transition: { duration: 0.25, ease: 'easeOut' },
              }
            : undefined
        }
        whileTap={active ? { scale: 0.98 } : undefined}
        role={active ? 'link' : 'button'}
        tabIndex={active ? 0 : -1}
        aria-label={
          active
            ? `Access ${title}`
            : `${title} - Coming Soon`
        }
      >
        {/* Spotlight follow cursor (active only) */}
        {active && (
          <motion.div
            className="pointer-events-none absolute w-40 h-40 rounded-full -translate-x-1/2 -translate-y-1/2"
            style={{
              background:
                'radial-gradient(circle, rgba(11,29,62,0.1) 0%, transparent 70%)',
              left: springX,
              top: springY,
            }}
          />
        )}

        {/* Ripple effects */}
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 10,
              height: 10,
              marginLeft: -5,
              marginTop: -5,
              background: 'rgba(11,29,62,0.2)',
            }}
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 25, opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        ))}

        {/* Hover glow border (active only) */}
        {active && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background:
                'linear-gradient(135deg, rgba(11,29,62,0.12) 0%, transparent 50%, rgba(227,30,36,0.06) 100%)',
              borderRadius: 'inherit',
            }}
          />
        )}

        <div className="relative z-10 flex items-start gap-4">
          {/* Icon */}
          <motion.div
            className={
              `flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 ` +
              (active
                ? 'bg-[#0B1D3E]/10 group-hover:bg-[#0B1D3E]/20'
                : 'bg-slate-200/60 dark:bg-slate-700/40')
            }
            whileHover={active ? { rotate: [0, -10, 10, 0] } : undefined}
            transition={{ duration: 0.5 }}
          >
            <Icon
              className={`w-5 h-5 transition-colors duration-300 ${
                active
                  ? 'text-[#0B1D3E] dark:text-[#4a7ab5] group-hover:text-[#E31E24]'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            />
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3
                className={`tracking-tight transition-colors duration-300 ${
                  active
                    ? 'text-slate-900 dark:text-white font-bold text-[15px]'
                    : 'text-slate-500 dark:text-slate-400 font-semibold text-sm'
                }`}
              >
                <span className={active ? 'animate-pulse' : ''}>{title}</span>
              </h3>
              {active && (
                <motion.span
                  className="flex-shrink-0 text-xs font-medium text-[#0B1D3E] dark:text-[#4a7ab5] flex items-center gap-1"
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  Access Portal
                  <motion.svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="group-hover:translate-x-1 transition-transform duration-300"
                  >
                    <path
                      d="M5 12h14m-7-7 7 7-7 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </motion.svg>
                </motion.span>
              )}
            </div>
            <p
              className={`text-xs leading-relaxed transition-colors duration-300 ${
                active
                  ? 'text-slate-500 dark:text-slate-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {description}
            </p>
            {!active && (
              <span className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Coming Soon
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}