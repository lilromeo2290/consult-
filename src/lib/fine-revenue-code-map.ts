export const FINE_REVENUE_CODES: { code: string; description: string }[] = [
  { code: '1430001', description: 'Court Fines' },
  { code: '1430005', description: 'Miscellaneous Fines, Penalties' },
  { code: '1430006', description: 'Slaughter Fines' },
  { code: '1430007', description: 'Lorry Park Fines' },
  { code: '1430008', description: 'Auction Sales' },
  { code: '1430010', description: 'Penalty' },
  { code: '1430015', description: 'Fines' },
  { code: '1430016', description: 'Spot fine' },
  { code: '1430017', description: 'Confiscated Assets' },
  { code: '1430021', description: 'Seizures' },
  { code: '1430022', description: 'Traffic Offences' },
  { code: '1430023', description: 'Impounding Fines' },
  { code: '1430024', description: 'Building Offences' },
  { code: '1430025', description: 'Unauthorised Diversion' },
  { code: '1430026', description: 'Retrieval of Seized Tools' },
  { code: '1430027', description: 'Environmental Health/Safety/Sanitation Offences' },
  { code: '1430028', description: 'Building Without Permit Fines' },
  { code: '1430029', description: 'Illegal/Un-Licensed Activities' },
  { code: '1430030', description: 'Unauthorised Structures Fines' },
  { code: '1430031', description: 'Refurbishment/ Renovation without Permit Fines' },
  { code: '1430032', description: 'Environmental Abuse Offences Fines' },
  { code: '1430033', description: 'Stray Animals Fines' },
  { code: '1430034', description: 'General Negligence Related Fines' },
];

export const FINE_REVENUE_CODE_TO_DESC: Record<string, string> = Object.fromEntries(
  FINE_REVENUE_CODES.map((item) => [item.code, item.description]),
);

export const FINE_REVENUE_DESC_TO_CODE: Record<string, string> = Object.fromEntries(
  FINE_REVENUE_CODES.map((item) => [item.description, item.code]),
);
