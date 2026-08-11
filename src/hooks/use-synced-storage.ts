'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useSyncedStorage - Server-first storage with localStorage cache.
 * Reads from server DB first, falls back to localStorage, then syncs both.
 * Every write saves to both localStorage AND the server API.
 * 
 * Auto-refresh mechanisms:
 * 1. BroadcastChannel - instant cross-tab sync when data changes
 * 2. Storage event listener - fallback for cross-tab sync
 * 3. Server polling every 10 seconds - catches changes from other devices
 */

// Singleton BroadcastChannel instance shared across all hook instances
let broadcastChannel: BroadcastChannel | null = null;
function getBroadcastChannel(): BroadcastChannel | null {
  try {
    if (!broadcastChannel && typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel('rms-sync');
    }
    return broadcastChannel;
  } catch {
    return null;
  }
}

// Track which keys each component instance is listening to
// so we can re-fetch the right data when a broadcast comes in
const listenerRegistry = new Map<string, Set<(key: string) => void>>();

function registerListener(key: string, callback: (key: string) => void) {
  if (!listenerRegistry.has(key)) {
    listenerRegistry.set(key, new Set());
  }
  listenerRegistry.get(key)!.add(callback);
}

function unregisterListener(key: string, callback: (key: string) => void) {
  const set = listenerRegistry.get(key);
  if (set) {
    set.delete(callback);
    if (set.size === 0) listenerRegistry.delete(key);
  }
}

// Initialize global broadcast listener once
if (typeof window !== 'undefined') {
  const channel = getBroadcastChannel();
  if (channel) {
    channel.onmessage = (event) => {
      const changedKey: string = event.data?.key;
      if (changedKey) {
        // Notify all listeners for this key
        const callbacks = listenerRegistry.get(changedKey);
        if (callbacks) {
          callbacks.forEach(cb => cb(changedKey));
        }
      }
    };
  }

  // Also listen for storage events (fallback for browsers without BroadcastChannel)
  window.addEventListener('storage', (event) => {
    if (event.key && event.newValue) {
      const changedKey = event.key;
      const callbacks = listenerRegistry.get(changedKey);
      if (callbacks) {
        callbacks.forEach(cb => cb(changedKey));
      }
    }
  });
}

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

  // Stable callback for broadcast-triggered refresh
  const onBroadcastRefresh = useCallback((changedKey: string) => {
    if (changedKey === key) {
      fetchFromServer(key, false);
    }
  }, [key, fetchFromServer]);

  // On mount: fetch from server, fall back to localStorage
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const localStorageKey = `local-${key}`;

    // Register for broadcast notifications
    registerListener(key, onBroadcastRefresh);

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

    // Cleanup: unregister broadcast listener
    return () => {
      unregisterListener(key, onBroadcastRefresh);
    };
  }, [key, saveToServer, fetchFromServer, onBroadcastRefresh]);

  // Auto-refresh from server every 10 seconds
  useEffect(() => {
    if (!initialized.current) return;
    const interval = setInterval(() => {
      fetchFromServer(key, false);
    }, 10_000);
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
        // Broadcast to other tabs so they refresh immediately
        try {
          const channel = getBroadcastChannel();
          if (channel) {
            channel.postMessage({ key });
          }
        } catch {
          // BroadcastChannel not available, storage event listener will handle it
        }
        return valueToStore;
      });
    },
    [key, saveToServer],
  );

  return [storedValue, setValue, loading];
}
