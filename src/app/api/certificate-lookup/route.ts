import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/certificate-lookup?cert=CRT-0001
export async function GET(request: NextRequest) {
  try {
    const certNumber = request.nextUrl.searchParams.get('cert');
    if (!certNumber) {
      return NextResponse.json({ error: 'Missing cert parameter' }, { status: 400 });
    }

    // Look up certificate from stored data
    const record = await db.rmsData.findUnique({ where: { key: 'rms-business-certs' } });
    if (!record) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    const certs: any[] = JSON.parse(record.data);
    const cert = certs.find((c: any) => c.certNumber === certNumber);

    if (!cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    // Also fetch assembly settings for dynamic display
    const assemblyRecord = await db.rmsData.findUnique({ where: { key: 'rms-settings-assembly' } });
    const assemblySettings = assemblyRecord ? JSON.parse(assemblyRecord.data) : {};

    // Fetch financial year settings
    const finRecord = await db.rmsData.findUnique({ where: { key: 'rms-settings-financial' } });
    const finSettings = finRecord ? JSON.parse(finRecord.data) : {};

    return NextResponse.json({
      cert,
      assemblySettings,
      financialYear: finSettings.currentFinancialYear || String(new Date().getFullYear()),
    });
  } catch (error) {
    console.error('GET /api/certificate-lookup error:', error);
    return NextResponse.json({ error: 'Failed to lookup certificate' }, { status: 500 });
  }
}
