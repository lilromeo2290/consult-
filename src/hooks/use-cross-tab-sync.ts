'use client';

import { useEffect, useState } from 'react';

/**
 * Custom hook that reads from localStorage AND re-reads when another
 * tab/component writes to the same key (via the `storage` event).
 * 
 * Use this in read-only components like Dashboard and PaymentHistory
 * that need to reflect data written by other components.
 */
export function useCrossTabSync<T>(key: string, fallback: T): T {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          const next = e.newValue ? (JSON.parse(e.newValue) as T) : fallback;
          setValue(next);
        } catch {
          setValue(fallback);
        }
      }
    };

    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key, fallback]);

  // Also poll periodically (every 1s) to catch same-tab updates
  // from components using useLocalStorage in the same browser tab.
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const raw = window.localStorage.getItem(key);
        const next = raw ? (JSON.parse(raw) as T) : fallback;
        setValue((prev) => {
          // Only update if the serialized form actually changed
          if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
          return next;
        });
      } catch {
        // ignore
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [key, fallback]);

  return value;
}
