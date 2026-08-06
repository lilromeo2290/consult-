'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useSyncedStorage - Server-first storage with localStorage cache.
 * Reads from server DB first, falls back to localStorage, then syncs both.
 * Every write saves to both localStorage AND the server API.
 * Server writes now use async/await with retry for reliability.
 */
export function useSyncedStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

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
          // Push local data to server so it's synced (with retry)
          saveToServer(key, localData);
        }
      } catch (error) {
        console.warn(`Error reading localStorage key "${localStorageKey}":`, error);
      }
      setLoading(false);
    };

    init();
  }, [key, saveToServer]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        const localStorageKey = `local-${key}`;
        // Save to localStorage immediately (sync)
        try {
          window.localStorage.setItem(localStorageKey, JSON.stringify(valueToStore));
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
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
