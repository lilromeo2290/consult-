// ─── Business Registration Certificate PDF Generator ────────────────────────
import PDFDocument from 'pdfkit';

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

export function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
      info: {
        Title: `Business Registration Certificate - ${data.businessName}`,
        Author: data.assemblyName || 'Kpando Municipal Assembly',
        Subject: 'Business Operating Permit Registration Certificate',
      },
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const pageW = doc.page.width - 100;
    const assemblyName = data.assemblyName || 'Kpando Municipal Assembly';
    const assemblyAddr = data.assemblyAddress || 'P.O. Box 21, Kpando, Volta Region, Ghana';

    doc.roundedRect(30, 25, doc.page.width - 60, doc.page.height - 50, 8).lineWidth(3).strokeColor('#1B5E20').stroke();
    doc.roundedRect(35, 30, doc.page.width - 70, doc.page.height - 60, 6).lineWidth(1).strokeColor('#4CAF50').stroke();

    doc.roundedRect(40, 35, doc.page.width - 80, 70, 4).fill('#F9A825');
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#1B5E20');
    doc.text(assemblyName.toUpperCase(), 50, 48, { width: pageW, align: 'center' });
    doc.font('Helvetica').fontSize(10).fillColor('#333333');
    doc.text(assemblyAddr, 50, 70, { width: pageW, align: 'center' });

    doc.moveDown(1.5);
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#1B5E20');
    doc.text('BUSINESS REGISTRATION CERTIFICATE', 50, doc.y, { width: pageW, align: 'center' });

    const lineY = doc.y + 8;
    doc.moveTo(150, lineY).lineTo(doc.page.width - 200, lineY).lineWidth(2).strokeColor('#F9A825').stroke();
    doc.moveDown(1);

    doc.font('Helvetica').fontSize(11).fillColor('#555555');
    doc.text('This is to certify that', 50, doc.y, { width: pageW, align: 'center' });
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#1B5E20');
    doc.text(data.businessName, 50, doc.y, { width: pageW, align: 'center' });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(11).fillColor('#555555');
    doc.text('owned by', 50, doc.y, { width: pageW, align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#333333');
    doc.text(data.ownerName, 50, doc.y, { width: pageW, align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(11).fillColor('#555555');
    doc.text('has been duly registered to operate within the jurisdiction of the Kpando Municipal Assembly under the following details:', 50, doc.y, { width: pageW, align: 'center' });
    doc.moveDown(1);

    const tableX = 120;
    const colLabelW = 160;
    const colValueW = 250;
    const rowH = 28;
    let tableY = doc.y;

    const rows: [string, string][] = [
      ['Registration Number:', data.regNumber],
      ['Business Type:', data.businessType || 'N/A'],
      ['Category:', data.category || 'N/A'],
      ['Business Address:', data.businessAddress || 'N/A'],
      ['Date of Registration:', data.dateRegistered || 'N/A'],
      ['Certificate Expiry:', data.expiryDate || 'N/A'],
    ];

    doc.rect(tableX, tableY, colLabelW + colValueW, rowH).fill('#E8F5E9');
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1B5E20');
    doc.text('Field', tableX + 8, tableY + 8, { width: colLabelW - 16 });
    doc.text('Details', tableX + colLabelW + 8, tableY + 8, { width: colValueW - 16 });
    tableY += rowH;

    rows.forEach(([label, value], i) => {
      const bg = i % 2 === 0 ? '#FAFAFA' : '#FFFFFF';
      doc.rect(tableX, tableY, colLabelW + colValueW, rowH).fill(bg);
      doc.rect(tableX, tableY, colLabelW + colValueW, rowH).lineWidth(0.5).strokeColor('#CCCCCC').stroke();
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333');
      doc.text(label, tableX + 8, tableY + 8, { width: colLabelW - 16 });
      doc.font('Helvetica').fontSize(10).fillColor('#333333');
      doc.text(value, tableX + colLabelW + 8, tableY + 8, { width: colValueW - 16 });
      tableY += rowH;
    });

    const totalTableH = rows.length * rowH + rowH;
    doc.rect(tableX, tableY - totalTableH, colLabelW + colValueW, totalTableH).lineWidth(1.5).strokeColor('#1B5E20').stroke();

    doc.y = tableY + 15;
    doc.moveDown(0.5);
    doc.font('Helvetica-Oblique').fontSize(10).fillColor('#777777');
    doc.text('This certificate is issued by the Kpando Municipal Assembly and is valid until the expiry date shown above.', 50, doc.y, { width: pageW, align: 'center' });
    doc.moveDown(3);

    const sigY = doc.y;
    doc.font('Helvetica').fontSize(10).fillColor('#555555');
    doc.text('_________________________', 120, sigY);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333');
    doc.text('Revenue Officer', 120, sigY + 8);
    doc.font('Helvetica').fontSize(8).fillColor('#777777');
    doc.text('Kpando Municipal Assembly', 120, sigY + 20);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 120, sigY + 32);

    doc.font('Helvetica').fontSize(10).fillColor('#555555');
    doc.text('_________________________', 350, sigY);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333');
    doc.text('Municipal Coordinating Director', 350, sigY + 8);
    doc.font('Helvetica').fontSize(8).fillColor('#777777');
    doc.text('Kpando Municipal Assembly', 350, sigY + 20);

    const footerY = doc.page.height - 75;
    doc.roundedRect(40, footerY, doc.page.width - 80, 25, 3).fill('#E65100');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
    doc.text('Kpando Municipal Assembly  \u2022  P.O. Box 21, Kpando  \u2022  Tel: 036-229-5812  \u2022  Email: info@kpandoma.gov.gh', 50, footerY + 8, { width: pageW, align: 'center' });

    doc.end();
  });
}
