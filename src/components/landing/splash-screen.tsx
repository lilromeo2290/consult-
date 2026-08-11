'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const LOADING_MESSAGES = [
  { text: 'Loading your Revenue Management System....', red: true },
  { text: 'Loading your HR Management....', red: true },
  { text: 'Loading your School Management....', red: true },
  { text: 'Loading your Property Management....', red: true },
  { text: 'Loading your Inventory System....', red: true },
  { text: 'Loading your Visitor Management....', red: true },
  { text: 'Loading your Help Desk....', red: true },
  { text: 'Loading your Document Management....', red: true },
  { text: 'Loading your CMS Community Hub Files ...............', red: false },
];

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const duration = 8000; // 8 seconds
    const interval = 50; // update every 50ms for smooth percentage
    const steps = duration / interval;
    let current = 0;
    const msgInterval = duration / LOADING_MESSAGES.length; // ~6.67s per message
    let msgIndex = 0;

    const timer = setInterval(() => {
      current++;
      const eased = 1 - Math.pow(1 - current / steps, 3);
      setProgress(Math.min(eased * 100, 100));

      // Cycle to next message based on elapsed time
      const newIndex = Math.min(
      Math.floor((current * interval) / msgInterval),
      LOADING_MESSAGES.length - 1
      );
      if (newIndex !== msgIndex) {
        msgIndex = newIndex;
        setMessageIndex(msgIndex);
      }

      if (current >= steps) {
        clearInterval(timer);
        setMessageIndex(LOADING_MESSAGES.length - 1);
        setTimeout(onComplete, 300);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  const displayPercent = Math.round(progress);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #050c1a 0%, #0b1d3e 40%, #0f1c3f 100%)',
        }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        {/* Ambient glow orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(11,29,62,0.2) 0%, transparent 70%)',
              top: '10%',
              left: '20%',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(227,30,36,0.1) 0%, transparent 70%)',
              bottom: '15%',
              right: '15%',
            }}
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Logo — very bold, large */}
        <motion.div
          className="relative mb-10"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <motion.div
            className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center rounded-3xl overflow-hidden"
            style={{
              boxShadow:
                '0 0 60px rgba(11,29,62,0.35), 0 0 120px rgba(11,29,62,0.15), 0 25px 50px rgba(0,0,0,0.4)',
            }}
            animate={{
              boxShadow: [
                '0 0 60px rgba(11,29,62,0.35), 0 0 120px rgba(11,29,62,0.15), 0 25px 50px rgba(0,0,0,0.4)',
                '0 0 80px rgba(11,29,62,0.5), 0 0 160px rgba(11,29,62,0.25), 0 25px 50px rgba(0,0,0,0.4)',
                '0 0 60px rgba(11,29,62,0.35), 0 0 120px rgba(11,29,62,0.15), 0 25px 50px rgba(0,0,0,0.4)',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img
              src="/logo.png"
              alt="CLIPE CONSULT Logo"
              className="w-full h-full object-contain p-3"
              draggable={false}
            />
          </motion.div>

          {/* Rotating ring 1 */}
          <motion.div
            className="absolute inset-[-10px] rounded-3xl border-2 border-[#4a7ab5]/25"
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          />
          {/* Rotating ring 2 */}
          <motion.div
            className="absolute inset-[-22px] rounded-3xl border border-[#E31E24]/12"
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          />
          {/* Rotating ring 3 */}
          <motion.div
            className="absolute inset-[-34px] rounded-3xl border border-[#4a7ab5]/8"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>

        {/* Organization name — very bold */}
        <motion.h1
          className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-3"
          style={{ textShadow: '0 0 40px rgba(11,29,62,0.3), 0 2px 8px rgba(0,0,0,0.5)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
        >
          CLIPE CONSULT
        </motion.h1>

        <motion.p
          className="text-base sm:text-lg text-slate-300 mb-14 tracking-[0.35em] uppercase font-semibold"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: 'easeOut' }}
        >
          DIGITAL PLATFORM
        </motion.p>

        {/* Percentage display */}
        <motion.div
          className="flex flex-col items-center gap-4 w-72 sm:w-80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <motion.span
            className="text-5xl sm:text-6xl font-black tabular-nums"
            style={{
              background: 'linear-gradient(135deg, #0B1D3E 0%, #E31E24 50%, #0B1D3E 100%)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmer 2s linear infinite',
              textShadow: 'none',
              filter: 'drop-shadow(0 0 20px rgba(11,29,62,0.4))',
            }}
            key={displayPercent}
            initial={{ scale: 1.1, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            {displayPercent}%
          </motion.span>

          {/* Progress bar */}
          <div className="w-full h-[3px] bg-slate-700/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #0B1D3E, #E31E24, #0B1D3E)',
                backgroundSize: '200% 100%',
              }}
              animate={{
                width: `${progress}%`,
                backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'],
              }}
              transition={{
                width: { duration: 0.15 },
                backgroundPosition: { duration: 2, repeat: Infinity, ease: 'linear' },
              }}
            />
          </div>

          <div className="h-5 flex items-center justify-center overflow-hidden w-full">
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                className={`text-[11px] sm:text-xs tracking-wider whitespace-nowrap font-bold ${
                  LOADING_MESSAGES[messageIndex].red
                    ? 'text-red-500'
                    : 'text-slate-400'
                }`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              >
                {LOADING_MESSAGES[messageIndex].text}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
