// Revenue Codes and Descriptions for Rent Management
// Source: Official assembly revenue code list

export const RENT_REVENUE_CODES: { code: string; description: string }[] = [
  { code: '1415001', description: 'Concession Rent' },
  { code: '1415002', description: 'Ground Rent' },
  { code: '1415003', description: 'Petroleum Surface Rentals' },
  { code: '1415004', description: 'Rent, Oil Concessions' },
  { code: '1415005', description: 'Investment Income from Petroleum Funds' },
  { code: '1415007', description: 'Other Receipts from petroleum Operations' },
  { code: '1415008', description: 'Investment Income' },
  { code: '1415009', description: 'Dividend (Oil & Other Properties)' },
  { code: '1415010', description: 'Interest on Loans' },
  { code: '1415011', description: 'Other Investment Income' },
  { code: '1415012', description: 'Rent on Assembly Building' },
  { code: '1415013', description: 'Junior Staff Quarters' },
  { code: '1415017', description: 'Parks' },
  { code: '1415018', description: 'Club Houses' },
  { code: '1415019', description: 'Transit Quarters' },
  { code: '1415020', description: 'Educational Hall' },
  { code: '1415022', description: 'Farms Rents' },
  { code: '1415023', description: 'Free Zones Board Rent on Leased land' },
  { code: '1415031', description: 'Hiring of Facilities' },
  { code: '1415036', description: 'Mining Concession Rent' },
  { code: '1415038', description: 'Rental of Facilities' },
  { code: '1415041', description: 'Housing Rent' },
  { code: '1415052', description: 'Market and Stores Rental' },
  { code: '1415053', description: 'Craft shop' },
  { code: '1415058', description: 'Rent of Properties[Leasing]' },
  { code: '1415063', description: 'Housing Rent' },
  { code: '1415064', description: 'Leased Building' },
];

export const RENT_CODE_TO_DESC: Record<string, string> = Object.fromEntries(
  RENT_REVENUE_CODES.map((item) => [item.code, item.description])
);

export const RENT_DESC_TO_CODE: Record<string, string> = Object.fromEntries(
  RENT_REVENUE_CODES.map((item) => [item.description, item.code])
);
