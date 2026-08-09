// Rent Class Code mapping
// Maps Code ↔ Rent Class ↔ Category

// Code → Rent Class name
export const RENT_CODE_TO_CLASS: Record<string, string> = {
  // 5001 - Bill Boards
  '50010001': 'Bill Boards',
  '50010002': 'Bill Boards',
  '50010003': 'Bill Boards',

  // 5002 - Assembly Halls & Facilities
  '50020101': 'Assembly Hall',
  '50020102': 'Assembly Hall',
  '50020103': 'Assembly Hall',
  '50020201': 'Assembly Conference Room',
  '50020301': 'Community Centres',
  '50020401': 'Sub-district/Metro Halls',
  '50020501': 'Assembly Forecourt',
  '50020601': 'Others',

  // 5003 - Markets (Stores, Stalls, Sheds)
  '50030101': 'Stores',
  '50030102': 'Stores',
  '50030103': 'Stores',
  '50030104': 'Stores',
  '50030201': 'Stalls',
  '50030202': 'Stalls',
  '50030203': 'Stalls',
  '50030204': 'Stalls',
  '50030301': 'Sheds',
  '50030302': 'Sheds',
  '50030303': 'Sheds',
  '50030304': 'Sheds',
  '50030401': 'Rent of Undeveloped Lands',

  // 5004 - Hiring of Parks
  '50040001': 'Hiring of Parks',
  '50040002': 'Hiring of Parks',
  '50040003': 'Hiring of Parks',
  '50040004': 'Hiring of Parks',

  // 5005 - Rent on Leased Buildings
  '50050001': 'Rent on Leased Buildings',

  // 5006 - Rent for Vendor Stands
  '50060001': 'Rent for Vendor Stands',

  // 5007 - Facilities (Guest House, Restaurant, Club House, Stadium, Official Residence)
  '50070001': 'Guest House',
  '50070002': 'Restaurant/Canteen',
  '50070003': 'Club House',
  '50070004': 'Stadium',
  '50070005': 'Official Residence',
  '50070006': 'Official Residence',
  '50070007': 'Official Residence',
};

// Code → Category (description)
export const RENT_CODE_TO_CATEGORY: Record<string, string> = {
  // Bill Boards
  '50010001': 'CAT A',
  '50010002': 'CAT B',
  '50010003': 'CAT C',

  // Assembly Hall
  '50020101': 'CAT A - Large',
  '50020102': 'CAT B - Medium',
  '50020103': 'CAT C - Small',

  // Assembly Conference Room
  '50020201': 'Assembly Conference Room',

  // Community Centres
  '50020301': 'Community Centres',

  // Sub-district/Metro Halls
  '50020401': 'Sub-district/Metro Halls',

  // Assembly Forecourt
  '50020501': 'Assembly Forecourt',

  // Others
  '50020601': 'Others',

  // Stores
  '50030101': 'CAT A - In CBD (Central Business District)',
  '50030102': 'CAT B - Satellite Markets',
  '50030103': 'CAT C - Outside CBD',
  '50030104': 'CAT D - Sub District Store',

  // Stalls
  '50030201': 'CAT A - In CBD',
  '50030202': 'CAT B - Satellite Market',
  '50030203': 'CAT C - Outside CBD',
  '50030204': 'CAT D - Sub District Store',

  // Sheds
  '50030301': 'CAT A - In CBD',
  '50030302': 'CAT B - Satellite Markets',
  '50030303': 'CAT C - Outside CBD',
  '50030304': 'CAT D - Sub District Store',

  // Rent of Undeveloped Lands
  '50030401': 'Rent of Undeveloped Lands',

  // Hiring of Parks
  '50040001': 'CAT A - Government Recreational Park',
  '50040002': 'CAT B - Lorry Park (Space Rental)',
  '50040003': 'CAT C - Parade Grounds (Jubilee Parks)',
  '50040004': 'CAT D - School Compound (Social Functions)',

  // Rent on Leased Buildings
  '50050001': 'Rent on Leased Buildings',

  // Rent for Vendor Stands
  '50060001': 'Rent for Vendor Stands',

  // Facilities
  '50070001': 'Guest House',
  '50070002': 'Restaurant/Canteen',
  '50070003': 'Club House',
  '50070004': 'Stadium',
  '50070005': 'Management Staff Quarters (3 Bedroom & Above)',
  '50070006': 'Senior Staff Quarters (2 Bedroom & Above)',
  '50070007': 'Junior Staff Quarters (Single Room Self-Contained)',
};

// Rent Class → first code (for Combobox ordering)
export const RENT_CLASS_TO_FIRST_CODE: Record<string, string> = {
  'Bill Boards': '50010001',
  'Assembly Hall': '50020101',
  'Assembly Conference Room': '50020201',
  'Community Centres': '50020301',
  'Sub-district/Metro Halls': '50020401',
  'Assembly Forecourt': '50020501',
  'Others': '50020601',
  'Stores': '50030101',
  'Stalls': '50030201',
  'Sheds': '50030301',
  'Rent of Undeveloped Lands': '50030401',
  'Hiring of Parks': '50040001',
  'Rent on Leased Buildings': '50050001',
  'Rent for Vendor Stands': '50060001',
  'Guest House': '50070001',
  'Restaurant/Canteen': '50070002',
  'Club House': '50070003',
  'Stadium': '50070004',
  'Official Residence': '50070005',
};

// Rent Class → all codes in that class
export const RENT_CLASS_TO_CODES: Record<string, string[]> = {
  'Bill Boards': ['50010001', '50010002', '50010003'],
  'Assembly Hall': ['50020101', '50020102', '50020103'],
  'Assembly Conference Room': ['50020201'],
  'Community Centres': ['50020301'],
  'Sub-district/Metro Halls': ['50020401'],
  'Assembly Forecourt': ['50020501'],
  'Others': ['50020601'],
  'Stores': ['50030101', '50030102', '50030103', '50030104'],
  'Stalls': ['50030201', '50030202', '50030203', '50030204'],
  'Sheds': ['50030301', '50030302', '50030303', '50030304'],
  'Rent of Undeveloped Lands': ['50030401'],
  'Hiring of Parks': ['50040001', '50040002', '50040003', '50040004'],
  'Rent on Leased Buildings': ['50050001'],
  'Rent for Vendor Stands': ['50060001'],
  'Guest House': ['50070001'],
  'Restaurant/Canteen': ['50070002'],
  'Club House': ['50070003'],
  'Stadium': ['50070004'],
  'Official Residence': ['50070005', '50070006', '50070007'],
};

// All rent codes flat list (sorted)
export const RENT_CLASS_CODES = Object.keys(RENT_CODE_TO_CLASS).sort();

// All rent class names (ordered by first code)
export const RENT_CLASS_NAMES = Object.keys(RENT_CLASS_TO_FIRST_CODE);
