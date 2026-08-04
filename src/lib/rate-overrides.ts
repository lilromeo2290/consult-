// Shared mutable rate override store (client-side only)
// Rate Configuration writes here; Business Information reads from here.

const overrides: Record<string, number> = {};

export function getRateOverride(code: string): number | undefined {
  return overrides[code];
}

export function setRateOverride(code: string, amount: number): void {
  overrides[code] = amount;
}

export function deleteRateOverride(code: string): void {
  delete overrides[code];
}

export function getAllOverrides(): Record<string, number> {
  return { ...overrides };
}

export function hasAnyOverride(): boolean {
  return Object.keys(overrides).length > 0;
}
