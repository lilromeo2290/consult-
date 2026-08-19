'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Chrome } from 'lucide-react';

// ---------- Context to share install capability ----------

interface PwaInstallContextValue {
  isInstallable: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<void>;
}

const PwaInstallContext = createContext<PwaInstallContextValue>({
  isInstallable: false,
  isInstalled: false,
  promptInstall: async () => {},
});

export function usePwaInstall() {
  return useContext(PwaInstallContext);
}

// ---------- BeforeInstallPrompt event type ----------

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

// ---------- Provider Component ----------

const DISMISSED_KEY = 'pwa-install-dismissed';
const INSTALLED_KEY = 'pwa-installed';

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Check if previously installed (standalone mode)
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }
    if (localStorage.getItem(INSTALLED_KEY) === 'true') {
      setIsInstalled(true);
      return;
    }
  }, []);

  // Capture the beforeinstallprompt event
  useEffect(() => {
    if (isInstalled) return;

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Auto-show banner after a short delay, unless recently dismissed
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (!dismissed || Date.now() - parseInt(dismissed, 10) > 86400000) { // 24h cooldown
        setTimeout(() => setShowBanner(true), 2000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    const installedHandler = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
      localStorage.setItem(INSTALLED_KEY, 'true');
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [isInstalled]);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  }, []);

  return (
    <PwaInstallContext.Provider value={{ isInstallable: !!deferredPrompt, isInstalled, promptInstall }}>
      {children}
      <AnimatePresence>
        {showBanner && !isInstalled && (
          <PwaInstallBanner onInstall={promptInstall} onDismiss={dismiss} />
        )}
      </AnimatePresence>
    </PwaInstallContext.Provider>
  );
}

// ---------- Banner UI ----------

function PwaInstallBanner({
  onInstall,
  onDismiss,
}: {
  onInstall: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-3 sm:p-4"
      initial={{ y: 300, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 300, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      <div
        className="relative mx-auto max-w-lg rounded-2xl p-4 shadow-2xl border"
        style={{
          background: 'linear-gradient(135deg, #123B5D 0%, #0B2940 100%)',
          borderColor: 'rgba(255,255,255,0.1)',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.3), 0 0 60px rgba(18,59,93,0.2)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Dismiss install prompt"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-4">
          {/* App Icon */}
          <div className="shrink-0 w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
            <img
              src="/pwa/icon-192x192.png"
              alt="Kpando MA RMS"
              className="w-10 h-10 rounded-lg"
            />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-[15px] leading-tight">
              Install Kpando MA RMS
            </h3>
            <p className="text-white/60 text-xs mt-0.5 leading-relaxed">
              Add to your home screen for quick access, works offline
            </p>
          </div>

          {/* Install Button */}
          <button
            onClick={onInstall}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #1F7A8C 0%, #16a085 100%)',
              boxShadow: '0 2px 12px rgba(31,122,140,0.4)',
            }}
          >
            <Download size={16} />
            <span className="hidden sm:inline">Install</span>
          </button>
        </div>

        {/* Trust indicators */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-white/40 text-[11px]">
            <Smartphone size={12} />
            <span>Works on Android</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/40 text-[11px]">
            <Chrome size={12} />
            <span>Free &amp; Secure</span>
          </div>
          <div className="ml-auto text-white/30 text-[11px]">
            No app store needed
          </div>
        </div>
      </div>
    </motion.div>
  );
}
