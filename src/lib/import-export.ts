import * as XLSX from 'xlsx';

// ─── Field label mappings (display names for Excel headers) ──────────────────

export const BUSINESS_FIELDS: { key: string; label: string }[] = [
  { key: 'regNumber', label: 'Registration Number' },
  // A. Business Location
  { key: 'locality', label: 'Locality' },
  { key: 'areaCode', label: 'Area Code' },
  { key: 'streetName', label: 'Street Name' },
  { key: 'houseNo', label: 'House Number' },
  { key: 'ghanaPostGPS', label: 'Ghana Post GPS Address' },
  { key: 'latitude', label: 'Latitude' },
  { key: 'longitude', label: 'Longitude' },
  { key: 'landmark', label: 'Exact Location Description (Landmark)' },
  // B. Business Information
  { key: 'daAssignmentNo', label: 'DA Assessment Number' },
  { key: 'businessUniqueNumber', label: 'Business Unique Number' },
  { key: 'businessCertNo', label: 'Business Certificate Number (GCR)' },
  { key: 'name', label: 'Business Name' },
  { key: 'revenueCode', label: 'Business Revenue Code' },
  { key: 'revenueDescription', label: 'Business Revenue Description' },
  { key: 'businessClassCode', label: 'Business Class Code' },
  { key: 'businessClassDesc', label: 'Business Class Description' },
  { key: 'category', label: 'Business Class Category' },
  { key: 'amount', label: 'Amount' },
  { key: 'employees', label: 'Number of Employees' },
  { key: 'dateRegistered', label: 'Date Registered' },
  { key: 'status', label: 'Status' },
  { key: 'yearEstablished', label: 'Year Established' },
  // C. Owner Information
  { key: 'owner', label: "Business Owner's Name" },
  { key: 'ghanaCard', label: 'National ID (Ghana Card Number)' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'email', label: 'Email Address' },
  { key: 'ownerTin', label: 'Owner TIN' },
  { key: 'comments', label: 'Comments' },
];

export const PROPERTY_FIELDS: { key: string; label: string }[] = [
  { key: 'propNumber', label: 'Property Number' },
  // Property Information
  { key: 'daAssignmentNo', label: 'DA Assessment Number' },
  { key: 'propertyUniqueNumber', label: 'Property Unique Number' },
  { key: 'permitNumber', label: 'Property Permit Number' },
  { key: 'revenueCode', label: 'Property Revenue Code' },
  { key: 'revenueDescription', label: 'Property Revenue Description' },
  { key: 'businessClassCode', label: 'Property Class Code' },
  { key: 'type', label: 'Property Class Description' },
  { key: 'category', label: 'Property Category' },
  { key: 'value', label: 'Value/Amount (GHS)' },
  { key: 'rooms', label: 'Number of Rooms' },
  // Property Location
  { key: 'streetName', label: 'Street Name' },
  { key: 'houseNo', label: 'House No' },
  { key: 'streetCode', label: 'Street Code' },
  { key: 'ghanaPostGPS', label: 'Ghana Post GPS' },
  { key: 'latitude', label: 'Latitude' },
  { key: 'longitude', label: 'Longitude' },
  { key: 'locality', label: 'Locality' },
  { key: 'areaCode', label: 'Area Code' },
  // Owner Information
  { key: 'ownerName', label: 'Owner Name' },
  { key: 'ownerAddress', label: 'Owner Address' },
  { key: 'ownerLatitude', label: 'Owner Latitude' },
  { key: 'ownerLongitude', label: 'Owner Longitude' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'tin', label: 'TIN' },
  { key: 'nationalId', label: 'National ID' },
  { key: 'ownerTin', label: 'Owner TIN' },
  { key: 'ownershipType', label: 'Ownership Type' },
  { key: 'comments', label: 'Comments' },
];

export const RENT_FIELDS: { key: string; label: string }[] = [
  // Rent Property Information
  { key: 'rentPropertyNumber', label: 'Rent Property Number' },
  { key: 'rentPropertyUniqueNumber', label: 'Rent Property Unique Number' },
  { key: 'tenancyAgreementNumber', label: 'Tenancy Agreement Number' },
  { key: 'rentRevenueCode', label: 'Rent Revenue Code' },
  { key: 'rentRevenueDescription', label: 'Rent Revenue Description' },
  { key: 'rentPropertyTypeCode', label: 'Rent Class Code' },
  { key: 'rentPropertyType', label: 'Rent Class Description' },
  { key: 'rentPropertyTypeCategory', label: 'Category' },
  { key: 'amount', label: 'Amount' },
  { key: 'vacant', label: 'Vacant Status' },
  // Location Information
  { key: 'rentPropertyLocation', label: 'Rent Property Location' },
  { key: 'locationCode', label: 'Location Code' },
  { key: 'exactLocation', label: 'Exact Location' },
  { key: 'propertyGhanaPostGPS', label: 'Ghana Post GPS Address' },
  { key: 'propertyLatitude', label: 'Property Latitude' },
  { key: 'propertyLongitude', label: 'Property Longitude' },
  // Contract
  { key: 'startDate', label: 'Start Date' },
  { key: 'endDate', label: 'End Date' },
  { key: 'contractId', label: 'Contract ID' },
  { key: 'contractValue', label: 'Contract Value' },
  { key: 'area', label: 'Area' },
  // Occupant's Information
  { key: 'occupantName', label: "Occupant's Name" },
  { key: 'occupantAddress', label: 'Occupant Address' },
  { key: 'occupantPhone', label: 'Phone' },
  { key: 'occupantEmail', label: 'Email' },
  { key: 'occupantNationalId', label: 'National ID' },
  { key: 'occupantUniqueId', label: 'Occupant Unique ID' },
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
