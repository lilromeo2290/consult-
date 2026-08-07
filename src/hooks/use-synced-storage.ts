'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useSyncedStorage - Server-first storage with localStorage cache.
 * Reads from server DB first, falls back to localStorage, then syncs both.
 * Every write saves to both localStorage AND the server API.
 * Auto-refreshes from server every 30 seconds so changes made on
 * another computer appear automatically without re-logging in.
 */
export function useSyncedStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  const lastServerData = useRef<string | null>(null);

  // Helper: save to server with retry
  const saveToServer = useCallback(async (k: string, data: unknown, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch('/api/rms-data', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: k, data }),
        });
        if (res.ok) return true;
        console.warn(`Server sync attempt ${attempt + 1} failed for "${k}": ${res.status}`);
      } catch (err) {
        console.warn(`Server sync attempt ${attempt + 1} error for "${k}":`, err);
      }
      if (attempt < retries) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
    return false;
  }, []);

  // Fetch data from server and update state if changed
  const fetchFromServer = useCallback(async (k: string, isInit: boolean) => {
    try {
      const res = await fetch(`/api/rms-data?key=${encodeURIComponent(k)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data !== null && json.data !== undefined) {
          const serialized = JSON.stringify(json.data);
          // Only update state if data actually changed (avoids unnecessary re-renders)
          if (lastServerData.current !== serialized) {
            lastServerData.current = serialized;
            const localStorageKey = `local-${k}`;
            window.localStorage.setItem(localStorageKey, serialized);
            window.localStorage.setItem(k, serialized);
            setStoredValue(json.data);
          }
          return true;
        }
      }
    } catch (err) {
      if (isInit) console.warn(`Server fetch failed for "${k}", using localStorage:`, err);
    }
    return false;
  }, []);

  // On mount: fetch from server, fall back to localStorage
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const localStorageKey = `local-${key}`;

    const init = async () => {
      const found = await fetchFromServer(key, true);

      if (!found) {
        // Fallback: read from localStorage
        try {
          const item = window.localStorage.getItem(localStorageKey);
          if (item) {
            const localData = JSON.parse(item);
            lastServerData.current = item;
            setStoredValue(localData);
            // Push local data to server so it's synced
            saveToServer(key, localData);
          }
        } catch (error) {
          console.warn(`Error reading localStorage key "${localStorageKey}":`, error);
        }
      }
      setLoading(false);
    };

    init();
  }, [key, saveToServer, fetchFromServer]);

  // Auto-refresh from server every 30 seconds
  useEffect(() => {
    if (!initialized.current) return;
    const interval = setInterval(() => {
      fetchFromServer(key, false);
    }, 30_000);
    return () => clearInterval(interval);
  }, [key, fetchFromServer]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        const serialized = JSON.stringify(valueToStore);
        lastServerData.current = serialized;
        const localStorageKey = `local-${key}`;
        // Save to localStorage immediately (sync)
        try {
          window.localStorage.setItem(localStorageKey, serialized);
          window.localStorage.setItem(key, serialized);
        } catch (e) {
          console.warn(`Failed to save "${key}" to localStorage:`, e);
        }
        // Save to server with retry (async, non-blocking)
        saveToServer(key, valueToStore);
        return valueToStore;
      });
    },
    [key, saveToServer],
  );

  return [storedValue, setValue, loading];
}
