import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/rms-data?key=businesses
export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    const record = await db.rmsData.findUnique({ where: { key } });

    if (!record) {
      return NextResponse.json({ key, data: null });
    }

    return NextResponse.json({ key, data: JSON.parse(record.data) });
  } catch (error) {
    console.error('GET /api/rms-data error:', error);
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

// PUT /api/rms-data  body: { key: string, data: unknown }
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, data } = body;

    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }

    const jsonData = JSON.stringify(data);

    await db.rmsData.upsert({
      where: { key },
      update: { data: jsonData },
      create: { key, data: jsonData },
    });

    if (key === 'rms-rate-overrides') {
      const entryCount = data && typeof data === 'object' ? Object.keys(data).length : 0;
      console.log(`[rate-overrides] SAVED ${entryCount} entries`);
    }

    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error('PUT /api/rms-data error:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
