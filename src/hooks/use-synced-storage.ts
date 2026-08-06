'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useSyncedStorage - Replaces useLocalStorage.
 * Reads from server DB first, falls back to localStorage, then syncs both.
 * Every write saves to both localStorage AND the server API.
 */
export function useSyncedStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  // On mount: fetch from server, merge with localStorage
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const localStorageKey = `local-${key}`;

    const init = async () => {
      try {
        // Try server first
        const res = await fetch(`/api/rms-data?key=${encodeURIComponent(key)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data !== null && json.data !== undefined) {
            // Also save to both localStorage keys as cache
            window.localStorage.setItem(localStorageKey, JSON.stringify(json.data));
            window.localStorage.setItem(key, JSON.stringify(json.data));
            setStoredValue(json.data);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn(`Server fetch failed for "${key}", using localStorage:`, err);
      }

      // Fallback: read from localStorage
      try {
        const item = window.localStorage.getItem(localStorageKey);
        if (item) {
          const localData = JSON.parse(item);
          setStoredValue(localData);
          // Push local data to server so it's synced
          fetch('/api/rms-data', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, data: localData }),
          }).catch(() => {});
        }
      } catch (error) {
        console.warn(`Error reading localStorage key "${localStorageKey}":`, error);
      }
      setLoading(false);
    };

    init();
  }, [key]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      // Compute the new value first (pure)
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        // Schedule side effects outside the updater using microtask
        const localStorageKey = `local-${key}`;
        queueMicrotask(() => {
          try {
            window.localStorage.setItem(localStorageKey, JSON.stringify(valueToStore));
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          } catch (e) {
            console.warn(`Failed to save "${key}" to localStorage:`, e);
          }
          // Save to server (fire-and-forget)
          fetch('/api/rms-data', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, data: valueToStore }),
          }).catch((err) => {
            console.warn(`Failed to sync "${key}" to server:`, err);
          });
        });
        return valueToStore;
      });
    },
    [key],
  );

  return [storedValue, setValue, loading];
}
