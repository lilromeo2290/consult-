import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  if (!user || !pass) {
    console.warn('[EMAIL] SMTP credentials not set. Emails will be logged only.');
    return null;
  }
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

export interface EmailResult {
  success: boolean;
  channel: 'email';
  emailAddress: string;
  messageId?: string;
  error?: string;
}

export async function sendEmail({ to, subject, html, pdfBuffer, pdfFilename }: { to: string; subject: string; html: string; pdfBuffer?: Buffer; pdfFilename?: string; }): Promise<EmailResult> {
  const transporter = getTransporter();
  const fromAddress = process.env.SMTP_FROM || 'noreply@kpandoma.gov.gh';
  const fromName = process.env.SMTP_FROM_NAME || 'Kpando Municipal Assembly';
  const attachments: nodemailer.Attachment[] = [];
  if (pdfBuffer && pdfFilename) {
    attachments.push({ filename: pdfFilename, content: pdfBuffer, contentType: 'application/pdf' });
  }
  if (!transporter) {
    console.log(`[EMAIL LOG] To: ${to}\nSubject: ${subject}\nAttachment: ${pdfFilename || 'none'}`);
    return { success: true, channel: 'email', emailAddress: to };
  }
  try {
    const info = await transporter.sendMail({ from: `"${fromName}" <${fromAddress}>`, to, subject, html, attachments });
    return { success: true, channel: 'email', emailAddress: to, messageId: info.messageId };
  } catch (err: any) {
    console.error('[EMAIL] Send failed:', err.message);
    return { success: false, channel: 'email', emailAddress: to, error: err.message };
  }
}
