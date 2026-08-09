// Valued Property Class Code mapping
// Reuses property codes but with rate factor defaults for valued/assessed properties

import {
  PROP_CODE_TO_CLASS,
  PROP_CODE_TO_CATEGORY,
  PROPERTY_CLASS_CODES,
  PROP_CLASS_TO_FIRST_CODE,
  PROP_CLASS_TO_CODES,
  PROPERTY_CLASS_NAMES,
} from './property-class-code-map';

// Re-export everything so rate-config can use the same codes/classes
export { PROP_CODE_TO_CLASS as VALUED_CODE_TO_CLASS };
export { PROP_CODE_TO_CATEGORY as VALUED_CODE_TO_CATEGORY };
export { PROPERTY_CLASS_CODES as VALUED_PROPERTY_CODES };
export { PROP_CLASS_TO_FIRST_CODE as VALUED_CLASS_TO_FIRST_CODE };
export { PROP_CLASS_TO_CODES as VALUED_CLASS_TO_CODES };
export { PROPERTY_CLASS_NAMES as VALUED_CLASS_NAMES };

// Default Rate Factor per code (from official rate schedule for valued properties)
export const VALUED_DEFAULT_RATES: Record<string, number> = {
  // Residential
  '10101': 0.50,
  '10111': 0.40,
  '10121': 0.30,
  '10131': 0.20,
  '10141': 0.10,
  // Commercial
  '20201': 1.00,
  '20211': 0.90,
  '20221': 0.80,
  '20231': 0.70,
  '20241': 0.60,
  // Mixed Use
  '20301': 1.20,
  '20311': 1.10,
  '20321': 1.00,
  '20331': 0.90,
  '20341': 0.80,
  // Industrial
  '20401': 0.80,
  '20402': 1.00,
  '20411': 0.70,
  '20421': 0.60,
  '20431': 0.50,
  // Civic & Culture
  '20500': 0.40,
  // Educational
  '20601': 0.30,
  // Recreational
  '20701': 0.40,
  // Parastatals
  '20801': 0.50,
  '20811': 0.40,
  // Other
  '20999': 0.10,
  // Temporary Structure
  '21101': 2.00,
  '21102': 3.00,
};
