// Revenue Codes and Descriptions for Property Register
// Source: Official assembly revenue code list

export const PROPERTY_REVENUE_CODES: { code: string; description: string }[] = [
  { code: '1413001', description: 'Property Rate' },
];

export const PROP_CODE_TO_DESC: Record<string, string> = Object.fromEntries(
  PROPERTY_REVENUE_CODES.map((item) => [item.code, item.description])
);

export const PROP_DESC_TO_CODE: Record<string, string> = Object.fromEntries(
  PROPERTY_REVENUE_CODES.map((item) => [item.description, item.code])
);
