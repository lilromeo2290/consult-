import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { BusinessService } from '@/services';
import { requireAuth, getClientIp } from '@/lib/api-auth';

/**
 * GET /api/rms-data?key=rms-businesses
 *
 * Phase 1: Dual-read. For keys with service-layer support (e.g. rms-businesses),
 * the service layer handles the read (falling back to RmsData if tables are empty).
 * All other keys read directly from RmsData as before.
 */
export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    // Advisory auth — payload may be null if not logged in (Phase 1 compat)
    const payload = await requireAuth(request);

    // ── Service-layer keys (dual-read from relational + fallback) ──
    if (key === 'rms-businesses') {
      // Use default assembly until multi-assembly is wired to frontend
      const assembly = await db.assembly.findFirst();
      const assemblyId = assembly?.id || 'default';
      const data = await BusinessService.getAll(assemblyId);
      return NextResponse.json({ key, data });
    }

    // ── Default: read from RmsData (unchanged behavior) ──
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

/**
 * PUT /api/rms-data  body: { key: string, data: unknown }
 *
 * Phase 1: Dual-write. For keys with service-layer support,
 * writes go to both RmsData and the relational tables.
 * All other keys write to RmsData only (unchanged behavior).
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, data } = body;
    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }

    const payload = await requireAuth(request);

    // ── Service-layer keys (dual-write) ──
    if (key === 'rms-businesses' && Array.isArray(data)) {
      const assembly = await db.assembly.findFirst();
      const assemblyId = assembly?.id || 'default';
      await BusinessService.saveAll(data, assemblyId, {
        userId: payload?.userId,
        ipAddress: getClientIp(request),
      });
      return NextResponse.json({ success: true, key });
    }

    // ── Default: write to RmsData (unchanged behavior) ──
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
