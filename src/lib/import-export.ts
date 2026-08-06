import * as XLSX from 'xlsx';

// ─── Field label mappings (display names for Excel headers) ──────────────────

export const BUSINESS_FIELDS: { key: string; label: string }[] = [
  { key: 'regNumber', label: 'Registration Number' },
  { key: 'name', label: 'Business Name' },
  { key: 'owner', label: 'Owner Name' },
  { key: 'type', label: 'Business Type (Class)' },
  { key: 'category', label: 'Category' },
  { key: 'subCategory', label: 'Sub Category' },
  { key: 'tin', label: 'TIN' },
  { key: 'licenseNumber', label: 'License Number' },
  { key: 'status', label: 'Status' },
  { key: 'dateRegistered', label: 'Date Registered' },
  { key: 'ghanaCard', label: 'Ghana Card' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'ghanaPostGPS', label: 'Ghana Post GPS' },
  { key: 'latitude', label: 'Latitude' },
  { key: 'longitude', label: 'Longitude' },
  { key: 'digitalAddress', label: 'Digital Address' },
  { key: 'residentialAddress', label: 'Residential Address' },
  { key: 'businessAddress', label: 'Business Address' },
  { key: 'ward', label: 'Ward' },
  { key: 'electoralArea', label: 'Electoral Area' },
  { key: 'zone', label: 'Zone' },
  { key: 'revenueArea', label: 'Revenue Area' },
  { key: 'streetName', label: 'Street Name' },
  { key: 'houseNo', label: 'House No' },
  { key: 'streetCode', label: 'Street Code' },
  { key: 'locality', label: 'Locality' },
  { key: 'areaCode', label: 'Area Code' },
  { key: 'code', label: 'Revenue Code' },
  { key: 'daAssignmentNo', label: 'DA Assignment No' },
  { key: 'businessCertNo', label: 'Business Cert No' },
  { key: 'businessUniqueNumber', label: 'Business Unique Number' },
  { key: 'revenueDescription', label: 'Revenue Description' },
  { key: 'revenueDescription2', label: 'Revenue Description 2' },
  { key: 'revenueCode', label: 'Revenue Code' },
  { key: 'businessClassCode', label: 'Business Class Code' },
  { key: 'employees', label: 'Employees' },
  { key: 'yearEstablished', label: 'Year Established' },
  { key: 'excludedFromFees', label: 'Excluded From Fees' },
  { key: 'ownerAddress', label: 'Owner Address' },
  { key: 'ownerLatitude', label: 'Owner Latitude' },
  { key: 'ownerLongitude', label: 'Owner Longitude' },
  { key: 'ownerTin', label: 'Owner TIN' },
  { key: 'comments', label: 'Comments' },
];

export const PROPERTY_FIELDS: { key: string; label: string }[] = [
  { key: 'propNumber', label: 'Property Number' },
  { key: 'streetName', label: 'Street Name' },
  { key: 'houseNo', label: 'House No' },
  { key: 'streetCode', label: 'Street Code' },
  { key: 'ghanaPostGPS', label: 'Ghana Post GPS' },
  { key: 'latitude', label: 'Latitude' },
  { key: 'longitude', label: 'Longitude' },
  { key: 'locality', label: 'Locality' },
  { key: 'code', label: 'Revenue Code' },
  { key: 'ownerName', label: 'Owner Name' },
  { key: 'ownerAddress', label: 'Owner Address' },
  { key: 'ownerLatitude', label: 'Owner Latitude' },
  { key: 'ownerLongitude', label: 'Owner Longitude' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'tin', label: 'TIN' },
  { key: 'nationalId', label: 'National ID' },
  { key: 'ownershipType', label: 'Ownership Type' },
  { key: 'propertyUseType', label: 'Property Use Type (Class)' },
  { key: 'category', label: 'Category' },
  { key: 'value', label: 'Value' },
  { key: 'rooms', label: 'Rooms' },
  { key: 'hasBuildingPermit', label: 'Has Building Permit' },
  { key: 'permitNumber', label: 'Permit Number' },
  { key: 'excludedFromRating', label: 'Excluded From Rating' },
  { key: 'comments', label: 'Comments' },
];

export const RENT_FIELDS: { key: string; label: string }[] = [
  { key: 'upn', label: 'UPN' },
  { key: 'rentPropertyLocation', label: 'Rent Property Location' },
  { key: 'locationCode', label: 'Location Code' },
  { key: 'exactLocation', label: 'Exact Location' },
  { key: 'propertyGhanaPostGPS', label: 'Ghana Post GPS / Digital Address' },
  { key: 'propertyLatitude', label: 'Property Latitude' },
  { key: 'propertyLongitude', label: 'Property Longitude' },
  { key: 'rentObjectName', label: 'Rent Object Name' },
  { key: 'rentRevenueCode', label: 'Rent Revenue Code' },
  { key: 'rentRevenueDescription', label: 'Rent Revenue Description' },
  { key: 'rentCode', label: 'Rent Code' },
  { key: 'rentClass', label: 'Rent Class' },
  { key: 'rentCategory', label: 'Rent Category' },
  { key: 'rentUnit', label: 'Rent Unit' },
  { key: 'rentValue', label: 'Rent Value' },
  { key: 'vacant', label: 'Vacant' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'endDate', label: 'End Date' },
  { key: 'contractId', label: 'Contract ID' },
  { key: 'contractValue', label: 'Contract Value' },
  { key: 'area', label: 'Area' },
  { key: 'renterName', label: 'Renter Name' },
  { key: 'renterAddress', label: 'Renter Address' },
  { key: 'renterGhanaPostGPS', label: 'Renter Ghana Post GPS' },
  { key: 'renterLatitude', label: 'Renter Latitude' },
  { key: 'renterLongitude', label: 'Renter Longitude' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'tin', label: 'TIN' },
  { key: 'nationalId', label: 'National ID' },
  { key: 'excludedFromRenting', label: 'Excluded From Renting' },
  { key: 'comments', label: 'Comments' },
];

// ─── Export ──────────────────────────────────────────────────────────────────

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  fields: { key: string; label: string }[],
  filename: string,
) {
  const headers = fields.map((f) => f.label);
  const rows = data.map((item) =>
    fields.map((f) => {
      const val = item[f.key];
      if (val === true) return 'Yes';
      if (val === false) return 'No';
      return val ?? '';
    }),
  );

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
 
  // Auto-size columns
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 14) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── Import ──────────────────────────────────────────────────────────────────

export function importFromExcel<T extends Record<string, unknown>>(
  file: File,
  fields: { key: string; label: string }[],
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });

        if (rows.length === 0) {
          resolve([]);
          return;
        }

        // Build label -> key map
        const labelToKey = new Map(fields.map((f) => [f.label, f.key]));

        const results: T[] = rows.map((row) => {
          const item: Record<string, unknown> = {};
          for (const [label, value] of Object.entries(row)) {
            const key = labelToKey.get(label);
            if (key) {
              // Convert boolean strings
              if (value === 'Yes') item[key] = true;
              else if (value === 'No') item[key] = false;
              else item[key] = value;
            }
          }
          return item as T;
        });

        resolve(results);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
