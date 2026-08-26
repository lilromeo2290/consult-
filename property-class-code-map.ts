// Property Class Code mapping based on Kpando Municipal Assembly rate schedule
// Maps Code ↔ Property Class ↔ Category

// Code → Property Class name
export const PROP_CODE_TO_CLASS: Record<string, string> = {
  '10101': 'Residential',
  '10111': 'Residential',
  '10121': 'Residential',
  '10131': 'Residential',
  '10141': 'Residential',
  '20201': 'Commercial',
  '20211': 'Commercial',
  '20221': 'Commercial',
  '20231': 'Commercial',
  '20241': 'Commercial',
  '20301': 'Mixed Use',
  '20311': 'Mixed Use',
  '20321': 'Mixed Use',
  '20331': 'Mixed Use',
  '20341': 'Mixed Use',
  '20401': 'Industrial Area',
  '20402': 'Industrial Area',
  '20411': 'Industrial Area',
  '20421': 'Industrial Area',
  '20431': 'Industrial Area',
  '20500': 'Civic & Culture',
  '20601': 'Educational',
  '20701': 'Recreational',
  '20801': 'Parastatals',
  '20811': 'Parastatals',
  '20999': 'Other',
  '21101': 'Temporary Structure',
  '21102': 'Temporary Structure',
};

// Property Class → default first code
export const PROP_CLASS_TO_FIRST_CODE: Record<string, string> = {
  'Residential': '10101',
  'Commercial': '20201',
  'Mixed Use': '20301',
  'Industrial Area': '20401',
  'Civic & Culture': '20500',
  'Educational': '20601',
  'Recreational': '20701',
  'Parastatals': '20801',
  'Other': '20999',
  'Temporary Structure': '21101',
};

// Property Class → array of codes
export const PROP_CLASS_TO_CODES: Record<string, string[]> = {
  'Residential': ['10101', '10111', '10121', '10131', '10141'],
  'Commercial': ['20201', '20211', '20221', '20231', '20241'],
  'Mixed Use': ['20301', '20311', '20321', '20331', '20341'],
  'Industrial Area': ['20401', '20402', '20411', '20421', '20431'],
  'Civic & Culture': ['20500'],
  'Educational': ['20601'],
  'Recreational': ['20701'],
  'Parastatals': ['20801', '20811'],
  'Other': ['20999'],
  'Temporary Structure': ['21101', '21102'],
};

// Code → Category
export const PROP_CODE_TO_CATEGORY: Record<string, string> = {
  '10101': '1st Class Residential',
  '10111': '2nd Class Residential',
  '10121': '3rd Class Residential',
  '10131': '4th Class Residential',
  '10141': '5th Class Residential',
  '20201': '1st Class Commercial Area',
  '20211': '2nd Class Commercial Area',
  '20221': '3rd Class Commercial Area',
  '20231': '4th Class Commercial Area',
  '20241': '5th Class Commercial Area',
  '20301': '1st Class Mixed Development',
  '20311': '2nd Class Mixed Development',
  '20321': '3rd Class Mixed Development',
  '20331': '4th Class Mixed Development',
  '20341': '5th Class Mixed Development',
  '20401': 'Light Industrial',
  '20402': 'Heavy Industrial',
  '20411': '3rd Class Industrial',
  '20421': '4th Class Industrial',
  '20431': '5th Class Industrial',
  '20500': 'Civic & Culture',
  '20601': 'Educational',
  '20701': 'Recreational',
  '20801': '1st Class',
  '20811': '2nd Class',
  '20999': 'NA',
  '21101': 'Container',
  '21102': 'Wooden Kiosks/Sheds',
};

// Default Unassessed Rates per code (from official rate schedule)
export const PROP_DEFAULT_RATES: Record<string, number> = {
  '10101': 70,
  '10111': 50,
  '10121': 20,
  '10131': 20,
  '10141': 20,
  '20201': 1000,
  '20211': 1000,
  '20221': 1000,
  '20231': 1000,
  '20241': 1000,
  '20301': 1800,
  '20311': 1800,
  '20321': 1800,
  '20331': 1800,
  '20341': 1800,
  '20401': 2800,
  '20402': 2650,
  '20411': 2800,
  '20421': 2800,
  '20431': 2650,
  '20500': 0,
  '20601': 0,
  '20701': 0,
  '20801': 0,
  '20811': 0,
  '20999': 0,
  '21101': 0,
  '21102': 0,
};

// All property class codes flat list
export const PROPERTY_CLASS_CODES = Object.keys(PROP_CODE_TO_CLASS);

// All property class names
export const PROPERTY_CLASS_NAMES = Object.keys(PROP_CLASS_TO_FIRST_CODE);
