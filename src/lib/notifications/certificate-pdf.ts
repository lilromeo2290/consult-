// ─── Business Operating Permit Certificate PDF Generator ────────────────────────
// Matches the Clipe Revenue Management System permit design template
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

export interface CertificateData {
  businessName: string;
  ownerName: string;
  regNumber: string;
  businessType: string;
  category: string;
  businessAddress: string;
  dateRegistered: string;
  expiryDate: string;
  assemblyName?: string;
  assemblyAddress?: string;
}

// Helper: draw a dotted leader line
function dottedLine(doc: PDFKit.PDFDocument, x: number, y: number, width: number, color: string = '#000000') {
  doc.save();
  doc.strokeColor(color).lineWidth(0.8);
  doc.dash(2, { space: 3 });
  doc.moveTo(x, y).lineTo(x + width, y).stroke();
  doc.restore();
}

// Helper: draw ornate corner bracket
function drawCorner(doc: PDFKit.PDFDocument, x: number, y: number, size: number, flipX: boolean, flipY: boolean, color: string) {
  const dx = flipX ? -1 : 1;
  const dy = flipY ? -1 : 1;
  doc.save();
  doc.strokeColor(color).lineWidth(2.5);
  // Main L-shape
  doc.moveTo(x, y + dy * size * 0.6)
     .lineTo(x, y)
     .lineTo(x + dx * size * 0.6, y)
     .stroke();
  // Inner decorative line
  doc.strokeColor(color).lineWidth(1);
  const inset = 5;
  doc.moveTo(x + dx * inset, y + dy * (size * 0.5))
     .lineTo(x + dx * inset, y + dy * inset)
     .lineTo(x + dx * (size * 0.5), y + dy * inset)
     .stroke();
  // Small decorative swirl at corner
  doc.strokeColor(color).lineWidth(1.2);
  const swirl = 12;
  doc.moveTo(x + dx * 2, y + dy * 2)
     .bezierCurveTo(
       x + dx * swirl, y + dy * swirl * 0.3,
       x + dx * swirl * 0.3, y + dy * swirl,
       x + dx * 2, y + dy * swirl * 0.6
     )
     .stroke();
  doc.restore();
}

// Helper: draw the full ornate border
function drawBorder(doc: PDFKit.PDFDocument, pageW: number, pageH: number) {
  const m = 20; // margin from page edge
  const color = '#8B6914'; // bronze/gold
  // Outer rectangle
  doc.save();
  doc.roundedRect(m, m, pageW - 2 * m, pageH - 2 * m, 4)
     .lineWidth(2.5).strokeColor(color).stroke();
  // Inner rectangle
  doc.roundedRect(m + 6, m + 6, pageW - 2 * m - 12, pageH - 2 * m - 12, 2)
     .lineWidth(0.8).strokeColor(color).stroke();
  doc.restore();
  // Four ornate corners
  const cs = 40; // corner size
  drawCorner(doc, m + 3, m + 3, cs, false, false, color);
  drawCorner(doc, pageW - m - 3, m + 3, cs, true, false, color);
  drawCorner(doc, m + 3, pageH - m - 3, cs, false, true, color);
  drawCorner(doc, pageW - m - 3, pageH - m - 3, cs, true, true, color);
}

// Helper: draw ornate divider with center diamond
function drawDivider(doc: PDFKit.PDFDocument, y: number, centerX: number, halfW: number) {
  const color = '#B8860B';
  doc.save();
  doc.strokeColor(color).lineWidth(1.5);
  // Left line
  doc.moveTo(centerX - halfW, y).lineTo(centerX - 10, y).stroke();
  // Right line
  doc.moveTo(centerX + 10, y).lineTo(centerX + halfW, y).stroke();
  // Center diamond
  doc.fillColor(color);
  doc.moveTo(centerX, y - 5).lineTo(centerX + 8, y).lineTo(centerX, y + 5).lineTo(centerX - 8, y).closePath().fill();
  // Small dots at line ends
  doc.circle(centerX - halfW, y, 2).fill();
  doc.circle(centerX + halfW, y, 2).fill();
  doc.restore();
}

// Helper: format date string to "28TH APRIL, 2025" style
function formatDateString(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const monthNames = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    const suffix = (n: number) => {
      const s = ['TH','ST','ND','RD'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    return `${suffix(day)} ${month}, ${year}`;
  } catch {
    return dateStr;
  }
}

export function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      info: {
        Title: `Business Operating Permit - ${data.businessName}`,
        Author: data.assemblyName || 'Clipe Revenue Management System',
        Subject: 'Business Operating Permit Certificate',
      },
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const assemblyName = data.assemblyName || 'Clipe Revenue Management System';

    // ─── Background watermark seal ───────────────────────────
    doc.save();
    doc.opacity(0.04);
    try {
      const sealPath = path.join(process.cwd(), 'public/logos/assembly-seal.jpg');
      if (fs.existsSync(sealPath)) {
        doc.image(sealPath, pageW / 2 - 180, pageH / 2 - 180, { width: 360, height: 360 });
      }
    } catch { /* skip */ }
    doc.restore();

    // ─── Ornate border ────────────────────────────────────────
    drawBorder(doc, pageW, pageH);

    // ─── Header: Logo (left) + Assembly Name (right) ──────────
    const headerY = 45;
    const logoSize = 90;
    const logoX = 60;
    try {
      const sealPath = path.join(process.cwd(), 'public/logos/assembly-seal.jpg');
      if (fs.existsSync(sealPath)) {
        doc.image(sealPath, logoX, headerY, { width: logoSize, height: logoSize });
      }
    } catch { /* skip */ }

    // Vertical separator line between logo and text
    doc.save();
    doc.strokeColor('#333333').lineWidth(0.8);
    doc.moveTo(logoX + logoSize + 15, headerY + 5)
       .lineTo(logoX + logoSize + 15, headerY + logoSize - 5)
       .stroke();
    doc.restore();

    // Assembly name text (right of logo)
    const textX = logoX + logoSize + 30;
    const textW = pageW - textX - 60;
    doc.font('Helvetica-Bold').fontSize(26).fillColor('#000000');
    doc.text('KPANDO', textX, headerY + 8, { width: textW, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(26).fillColor('#000000');
    doc.text('MUNICIPAL', textX, headerY + 35, { width: textW, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(26).fillColor('#000000');
    doc.text('ASSEMBLY', textX, headerY + 62, { width: textW, align: 'center' });

    // ─── BUSINESS OPERATING PERMIT title ───────────────────────
    let curY = headerY + logoSize + 25;
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#000000');
    doc.text('BUSINESS OPERATING PERMIT', 50, curY, { width: pageW - 100, align: 'center' });
    curY = doc.y + 10;

    // ─── Ornate divider ────────────────────────────────────────
    drawDivider(doc, curY, pageW / 2, 170);
    curY += 18;

    // ─── BUSINESS NAME label ────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000');
    doc.text('BUSINESS NAME', 50, curY, { width: pageW - 100, align: 'center' });
    curY += 20;

    // ─── Permit Number (large, red) ────────────────────────────
    const permitNum = data.regNumber || 'N/A';
    doc.font('Helvetica-Bold').fontSize(36).fillColor('#CC0000');
    doc.text(permitNum, 50, curY, { width: pageW - 100, align: 'center' });
    curY += 44;

    // ─── Business Name (actual name, bold) ─────────────────────
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000');
    doc.text(data.businessName.toUpperCase(), 50, curY, { width: pageW - 100, align: 'center' });
    curY += 28;

    // ─── Legal text ─────────────────────────────────────────────
    doc.font('Helvetica').fontSize(11).fillColor('#000000');
    doc.text('Issued under the Local Governance Act, 2016 (Act 936)', 80, curY, { width: pageW - 160, align: 'center' });
    curY += 16;
    doc.text('Section 87(1) to operate a business within the', 80, curY, { width: pageW - 160, align: 'center' });
    curY += 16;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
    doc.text(assemblyName.toUpperCase(), 80, curY, { width: pageW - 160, align: 'center' });
    curY += 16;
    doc.font('Helvetica').fontSize(11).fillColor('#000000');
    const year = data.dateRegistered ? new Date(data.dateRegistered).getFullYear() : new Date().getFullYear();
    doc.text(`Jurisdiction for the year ${year}.`, 80, curY, { width: pageW - 160, align: 'center' });
    curY += 28;

    // ─── Data fields with dotted lines ─────────────────────────
    const fieldX = 80;
    const dotStartX = 280;
    const dotEndX = pageW - 80;
    const dotW = dotEndX - dotStartX;

    const fields: [string, string][] = [
      ['1. BUSINESS NUMBER', data.regNumber || ''],
      ['2. BUSINESS LOCATION', data.businessAddress || ''],
      ['3. BUSINESS CLASS', data.businessType || ''],
      ['4. BUSINESS CATEGORY', data.category || ''],
    ];

    fields.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
      doc.text(label, fieldX, curY, { continued: false });
      // Draw dotted line
      dottedLine(doc, dotStartX, curY + 8, dotW);
      // Write value on top of dots if present
      if (value) {
        doc.font('Helvetica').fontSize(11).fillColor('#000000');
        doc.text(value, dotStartX + 5, curY);
      }
      curY += 28;
    });

    curY += 8;

    // ─── Dates ──────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
    doc.text('DATE OF ISSUE:', fieldX, curY);
    const issueDateStr = data.dateRegistered ? formatDateString(data.dateRegistered) : 'N/A';
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
    doc.text(issueDateStr, dotStartX, curY);
    dottedLine(doc, dotStartX + 80, curY + 8, dotW - 80);
    curY += 26;

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
    doc.text('EXPIRY DATE:', fieldX, curY);
    const expiryDateStr = data.expiryDate ? formatDateString(data.expiryDate) : 'N/A';
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
    doc.text(expiryDateStr, dotStartX, curY);
    dottedLine(doc, dotStartX + 80, curY + 8, dotW - 80);
    curY += 36;

    // ─── Bottom section: NOTE (left) + SIGNATURE (right) ───────
    const noteX = 80;
    const sigX = pageW / 2 + 30;
    const sigW = pageW / 2 - 110;

    // NOTE section
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#CC0000');
    doc.text('NOTE:', noteX, curY);
    curY += 16;
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    doc.text('This Permit is not transferable.', noteX, curY);
    curY += 14;
    doc.text('Display this Permit at a conspicuous place', noteX, curY);
    curY += 14;
    doc.text('at the business premises.', noteX, curY);

    // Signature section (right column, aligned with note)
    const sigStartY = curY - 30;
    dottedLine(doc, sigX, sigStartY, sigW);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
    doc.text('SIGNATURE', sigX, sigStartY + 6, { width: sigW, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#CC0000');
    doc.text('MUNICIPAL CO-ORDINATING DIRECTOR', sigX, sigStartY + 20, { width: sigW, align: 'center' });

    doc.end();
  });
}
