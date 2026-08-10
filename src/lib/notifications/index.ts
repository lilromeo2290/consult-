import { sendSMS, sendWhatsApp, type SMSResult, type WhatsAppResult } from './sms';
import { sendEmail, type EmailResult } from './email';
import { generateCertificatePDF, type CertificateData } from './certificate-pdf';

export interface BusinessRegistrationPayload {
  businessName: string;
  ownerName: string;
  regNumber: string;
  businessType: string;
  category: string;
  businessAddress: string;
  dateRegistered: string;
  expiryDate: string;
  phone: string;
  email: string;
}

export interface NotificationResults {
  sms?: SMSResult;
  whatsapp?: WhatsAppResult;
  email?: EmailResult;
  certificateGenerated: boolean;
}

function buildSMSMessage(b: BusinessRegistrationPayload): string {
  return `Kpando Municipal Assembly\nBusiness Registration Confirmation\n----------------------------\nName: ${b.businessName}\nReg No: ${b.regNumber}\nType: ${b.businessType}\nDate: ${b.dateRegistered}\n----------------------------\nYour registration certificate will be sent to your email.\nFor enquiries call 036-229-5812.\nKpando Municipal Assembly`;
}

function buildWhatsAppMessage(b: BusinessRegistrationPayload): string {
  return `*BUSINESS REGISTRATION CONFIRMATION*\n\n*Business Name:* ${b.businessName}\n*Owner:* ${b.ownerName}\n*Reg Number:* ${b.regNumber}\n*Type:* ${b.businessType}\n*Category:* ${b.category}\n*Address:* ${b.businessAddress}\n*Date Registered:* ${b.dateRegistered}\n*Expires:* ${b.expiryDate}\n\nYour registration certificate (PDF) has been sent to your email.\n\nFor enquiries: *036-229-5812*\n*Kpando Municipal Assembly*`;
}

function buildEmailHTML(b: BusinessRegistrationPayload): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);"><tr><td style="background:#1B5E20;padding:24px 32px;text-align:center;"><h1 style="margin:0;color:#fff;font-size:20px;letter-spacing:1px;">KPANDO MUNICIPAL ASSEMBLY</h1><p style="margin:6px 0 0;color:#A5D6A7;font-size:12px;">Revenue Management System</p></td></tr><tr><td style="height:4px;background:#F9A825;"></td></tr><tr><td style="padding:32px;"><h2 style="margin:0 0 8px;color:#1B5E20;font-size:18px;">Business Registration Confirmation</h2><p style="margin:0 0 20px;color:#666;font-size:14px;line-height:1.5;">Your business has been successfully registered. Find the summary below:</p><table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;"><tr style="background:#E8F5E9;"><td style="font-size:12px;font-weight:bold;color:#1B5E20;padding:10px 14px;">Field</td><td style="font-size:12px;font-weight:bold;color:#1B5E20;padding:10px 14px;">Details</td></tr><tr style="background:#FAFAFA;"><td style="font-size:13px;color:#555;padding:8px 14px;">Business Name</td><td style="font-size:13px;color:#333;padding:8px 14px;font-weight:bold;">${b.businessName}</td></tr><tr><td style="font-size:13px;color:#555;padding:8px 14px;">Owner</td><td style="font-size:13px;color:#333;padding:8px 14px;">${b.ownerName}</td></tr><tr style="background:#FAFAFA;"><td style="font-size:13px;color:#555;padding:8px 14px;">Registration Number</td><td style="font-size:13px;color:#333;padding:8px 14px;font-weight:bold;font-family:monospace;">${b.regNumber}</td></tr><tr><td style="font-size:13px;color:#555;padding:8px 14px;">Business Type</td><td style="font-size:13px;color:#333;padding:8px 14px;">${b.businessType}</td></tr><tr style="background:#FAFAFA;"><td style="font-size:13px;color:#555;padding:8px 14px;">Category</td><td style="font-size:13px;color:#333;padding:8px 14px;">${b.category}</td></tr><tr><td style="font-size:13px;color:#555;padding:8px 14px;">Address</td><td style="font-size:13px;color:#333;padding:8px 14px;">${b.businessAddress}</td></tr><tr style="background:#FAFAFA;"><td style="font-size:13px;color:#555;padding:8px 14px;">Date Registered</td><td style="font-size:13px;color:#333;padding:8px 14px;">${b.dateRegistered}</td></tr><tr><td style="font-size:13px;color:#555;padding:8px 14px;">Expiry Date</td><td style="font-size:13px;color:#333;padding:8px 14px;">${b.expiryDate}</td></tr></table><p style="margin:20px 0 8px;color:#666;font-size:14px;line-height:1.5;">Your <strong>Business Registration Certificate</strong> is attached to this email as a PDF.</p><div style="margin:20px 0;padding:16px;background:#FFF8E1;border-left:4px solid #F9A825;border-radius:4px;"><p style="margin:0;color:#F57F17;font-size:13px;font-weight:bold;">For any enquiries, contact the Revenue Office:</p><p style="margin:4px 0 0;color:#666;font-size:13px;">036-229-5812 | info@kpandoma.gov.gh</p></div></td></tr><tr><td style="background:#E65100;padding:16px 32px;text-align:center;"><p style="margin:0;color:#fff;font-size:11px;">Kpando Municipal Assembly | P.O. Box 21, Kpando | Volta Region, Ghana</p></td></tr></table></td></tr></table></body></html>`;
}

export async function sendRegistrationNotification(payload: BusinessRegistrationPayload): Promise<NotificationResults> {
  const results: NotificationResults = { certificateGenerated: false };
  let pdfBuffer: Buffer | undefined;
  try {
    pdfBuffer = await generateCertificatePDF({ businessName: payload.businessName, ownerName: payload.ownerName, regNumber: payload.regNumber, businessType: payload.businessType, category: payload.category, businessAddress: payload.businessAddress, dateRegistered: payload.dateRegistered, expiryDate: payload.expiryDate });
    results.certificateGenerated = true;
  } catch (err: any) { console.error('[NOTIFY] Certificate PDF generation failed:', err.message); }
  const pdfFilename = `Registration_Certificate_${payload.regNumber.replace(/\//g, '-')}.pdf`;
  const [smsResult, whatsappResult, emailResult] = await Promise.all([
    payload.phone ? sendSMS(payload.phone, buildSMSMessage(payload)).catch((e) => ({ success: false, channel: 'sms' as const, phoneNumber: payload.phone, error: e.message })) : Promise.resolve(undefined),
    payload.phone ? sendWhatsApp(payload.phone, buildWhatsAppMessage(payload), pdfBuffer).catch((e) => ({ success: false, channel: 'whatsapp' as const, phoneNumber: payload.phone, error: e.message })) : Promise.resolve(undefined),
    payload.email ? sendEmail({ to: payload.email, subject: `Business Registration Confirmed - ${payload.regNumber} - ${payload.businessName}`, html: buildEmailHTML(payload), pdfBuffer, pdfFilename }).catch((e) => ({ success: false, channel: 'email' as const, emailAddress: payload.email, error: e.message })) : Promise.resolve(undefined),
  ]);
  if (smsResult) results.sms = smsResult;
  if (whatsappResult) results.whatsapp = whatsappResult;
  if (emailResult) results.email = emailResult;
  return results;
}
