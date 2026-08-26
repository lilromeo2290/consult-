// ─── Barcode Data Encoding / Decoding ───────────────────────────────────
// Encodes receipt/invoice summary into a compact string for barcode,
// and provides a URL for the verification landing page.

export interface BarcodePayload {
  type: 'RECEIPT' | 'INVOICE' | 'PAYMENT';
  refNo: string;        // Receipt No or Bill No
  issuedTo: string;     // Entity name
  entityType: string;   // Business / Property
  amount: number;       // Total paid or total due
  date: string;         // Date issued
  revenueItem: string;  // Revenue item
  method?: string;      // Payment method (receipts only)
  status: string;       // Status
  assemblyName: string; // Dynamic assembly name from settings
  // Internal verification fields
  checksum: string;     // Simple checksum for integrity
}

/**
 * Encode a BarcodePayload into a compact base64 string suitable for barcode scanning.
 * Format: TYPE|REF|NAME|ENTITY_TYPE|AMOUNT|DATE|REVENUE|METHOD|STATUS|ASSEMBLY|CHECKSUM
 * Then base64-encoded for compactness.
 */
export function encodeBarcodeData(payload: Omit<BarcodePayload, 'checksum'>): string {
  const parts = [
    payload.type,
    payload.refNo,
    payload.issuedTo,
    payload.entityType,
    String(payload.amount),
    payload.date,
    payload.revenueItem,
    payload.method || '',
    payload.status,
    payload.assemblyName || 'Clipe Revenue Management System',
  ];

  // Generate simple checksum from all parts
  const checkStr = parts.join('|');
  let checksum = 0;
  for (let i = 0; i < checkStr.length; i++) {
    checksum = ((checksum << 5) - checksum + checkStr.charCodeAt(i)) | 0;
  }
  const checksumHex = Math.abs(checksum).toString(16).toUpperCase().padStart(4, '0');

  parts.push(checksumHex);
  const raw = parts.join('|');

  // Base64 encode for compact barcode-friendly string
  if (typeof window !== 'undefined') {
    return btoa(unescape(encodeURIComponent(raw)));
  }
  // Node.js fallback
  return Buffer.from(raw, 'utf-8').toString('base64');
}

/**
 * Decode a barcode string back into a BarcodePayload.
 * Returns null if checksum validation fails.
 */
export function decodeBarcodeData(encoded: string): BarcodePayload | null {
  try {
    let raw: string;
    if (typeof window !== 'undefined') {
      raw = decodeURIComponent(escape(atob(encoded)));
    } else {
      raw = Buffer.from(encoded, 'base64').toString('utf-8');
    }

    const parts = raw.split('|');
    // Support both old 10-part format and new 11-part format
    if (parts.length === 10) {
      // Legacy format: no assemblyName field
      const [type, refNo, issuedTo, entityType, amountStr, date, revenueItem, method, status, checksumHex] = parts;
      const checkParts = parts.slice(0, 9);
      const checkStr = checkParts.join('|');
      let checksum = 0;
      for (let i = 0; i < checkStr.length; i++) {
        checksum = ((checksum << 5) - checksum + checkStr.charCodeAt(i)) | 0;
      }
      const expectedChecksum = Math.abs(checksum).toString(16).toUpperCase().padStart(4, '0');
      if (checksumHex !== expectedChecksum) return null;
      return {
        type: type as 'RECEIPT' | 'INVOICE' | 'PAYMENT',
        refNo,
        issuedTo,
        entityType,
        amount: parseFloat(amountStr),
        date,
        revenueItem,
        method: method || undefined,
        status,
        assemblyName: 'Clipe Revenue Management System',
        checksum: checksumHex,
      };
    }

    if (parts.length !== 11) return null;

    const [type, refNo, issuedTo, entityType, amountStr, date, revenueItem, method, status, assemblyName, checksumHex] = parts;

    // Verify checksum
    const checkParts = parts.slice(0, 10);
    const checkStr = checkParts.join('|');
    let checksum = 0;
    for (let i = 0; i < checkStr.length; i++) {
      checksum = ((checksum << 5) - checksum + checkStr.charCodeAt(i)) | 0;
    }
    const expectedChecksum = Math.abs(checksum).toString(16).toUpperCase().padStart(4, '0');

    if (checksumHex !== expectedChecksum) return null;

    return {
      type: type as 'RECEIPT' | 'INVOICE' | 'PAYMENT',
      refNo,
      issuedTo,
      entityType,
      amount: parseFloat(amountStr),
      date,
      revenueItem,
      method: method || undefined,
      status,
      assemblyName,
      checksum: checksumHex,
    };
  } catch {
    return null;
  }
}

/**
 * Generate the verification URL from encoded barcode data.
 * This is the URL embedded conceptually — when scanned, user goes to verify page.
 */
export function getVerificationUrl(encoded: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/verify?d=${encodeURIComponent(encoded)}`;
  }
  return `https://rms.kma.gov.gh/verify?d=${encodeURIComponent(encoded)}`;
}

/**
 * Format currency for display
 */
export function fmtGhc(n: number): string {
  return `GH\u20b5 ${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
