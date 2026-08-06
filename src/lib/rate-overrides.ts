// Shared mutable rate override store (client-side only)
// Rate Configuration writes here; Business Information reads from here.

interface RateEntry {
  amount: number;
  ceiling: number;
}

const overrides: Record<string, RateEntry> = {};

export function getRateOverride(code: string): number | undefined {
  return overrides[code]?.amount;
}

export function getRateCeiling(code: string): number | undefined {
  return overrides[code]?.ceiling;
}

export function setRateOverride(code: string, amount: number): void {
  const existing = overrides[code];
  overrides[code] = { amount, ceiling: existing?.ceiling || 0 };
}

export function setRateCeiling(code: string, ceiling: number): void {
  const existing = overrides[code];
  overrides[code] = { amount: existing?.amount || 0, ceiling };
}

export function setRateEntry(code: string, amount: number, ceiling: number): void {
  overrides[code] = { amount, ceiling };
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
