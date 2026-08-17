'use client';

import { useEffect } from 'react';
import { PwaInstallProvider } from './pwa-install-prompt';

export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('SW registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('SW registration failed:', err);
        });
    }
  }, []);

  return null;
}
