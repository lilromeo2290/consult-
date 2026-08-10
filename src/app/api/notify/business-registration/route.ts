import { NextRequest, NextResponse } from 'next/server';
import { sendRegistrationNotification, type BusinessRegistrationPayload } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const required = ['businessName', 'ownerName', 'regNumber', 'dateRegistered'];
    const missing = required.filter((f) => !body[f]?.trim());
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }
    const payload: BusinessRegistrationPayload = { businessName: body.businessName, ownerName: body.ownerName, regNumber: body.regNumber, businessType: body.businessType || '', category: body.category || '', businessAddress: body.businessAddress || '', dateRegistered: body.dateRegistered, expiryDate: body.expiryDate || '', phone: body.phone || '', email: body.email || '' };
    const results = await sendRegistrationNotification(payload);
    const summary: Record<string, string> = {};
    if (results.sms) summary.sms = results.sms.success ? `Sent to ${results.sms.phoneNumber}` : `Failed: ${results.sms.error}`;
    if (results.whatsapp) summary.whatsapp = results.whatsapp.success ? `Sent to ${results.whatsapp.phoneNumber}` : `Failed: ${results.whatsapp.error}`;
    if (results.email) summary.email = results.email.success ? `Sent to ${results.email.emailAddress}` : `Failed: ${results.email.error}`;
    summary.certificateGenerated = results.certificateGenerated ? 'Yes' : 'No';
    return NextResponse.json({ success: true, results: summary });
  } catch (err: any) {
    console.error('[API /notify/business-registration]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
