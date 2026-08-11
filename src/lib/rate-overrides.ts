// Shared mutable rate override store (client-side only)
// Rate Configuration writes here; Business Information reads from here.
// Persistence is handled by rate-config.tsx via /api/rms-data.

export interface RateEntry {
  amount: number;
  ceiling: number;
  permit?: number;
}

const overrides: Record<string, RateEntry> = {};

/** Bulk-load overrides from a saved JSON object (called on app mount). */
export function loadOverrides(data: Record<string, RateEntry>): void {
  for (const [code, entry] of Object.entries(data)) {
    if (entry && typeof entry.amount === 'number' && typeof entry.ceiling === 'number') {
      overrides[code] = entry;
    }
  }
}

export function getRateOverride(code: string): number | undefined {
  return overrides[code]?.amount;
}

export function getRateCeiling(code: string): number | undefined {
  return overrides[code]?.ceiling;
}

export function setRateOverride(code: string, amount: number): void {
  const existing = overrides[code];
  overrides[code] = { amount, ceiling: existing?.ceiling || 0, permit: existing?.permit || 0 };
}

export function setRateCeiling(code: string, ceiling: number): void {
  const existing = overrides[code];
  overrides[code] = { amount: existing?.amount || 0, ceiling, permit: existing?.permit || 0 };
}

export function setRateEntry(code: string, amount: number, ceiling: number, permit?: number): void {
  overrides[code] = { amount, ceiling, permit: permit ?? 0 };
}

export function deleteRateOverride(code: string): void {
  delete overrides[code];
}

export function getAllOverrides(): Record<string, RateEntry> {
  return { ...overrides };
}

export function hasAnyOverride(): boolean {
  return Object.keys(overrides).length > 0;
}
