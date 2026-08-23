import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, getClientIp } from '@/lib/api-auth';

// ── BP Official → Building Permit status mapping ──
const ROUTING_TO_PERMIT_STATUS: Record<string, string> = {
  'Approved': 'Approved',
  'Approved with Conditions': 'Approved',
  'Rejected': 'Rejected',
  'Deferred': 'Deferred',
  'Requires Resubmission': 'Pending Review',
  'Submitted to Physical Planning': 'Under Review',
  'Under Review - Physical Planning': 'Under Review',
  'Under Review - EPA': 'Under Review',
  'Under Review - GNFS': 'Under Review',
  'All Reviews Complete': 'Under Review',
};

/**
 * Sync building permit statuses from BP official review records.
 * Returns true if any permits were updated.
 */
async function syncPermitStatusesFromReviews(): Promise<boolean> {
  try {
    const [bpOfficialRow, bpPermitsRow] = await Promise.all([
      db.rmsData.findUnique({ where: { key: 'rms-bp-official' } }),
      db.rmsData.findUnique({ where: { key: 'rms-building-permits' } }),
    ]);
    if (!bpOfficialRow || !bpPermitsRow) return false;

    const reviews: Record<string, unknown>[] = JSON.parse(bpOfficialRow.data);
    const permits: Record<string, unknown>[] = JSON.parse(bpPermitsRow.data);
    let changed = false;

    for (const review of reviews) {
      const appNum = review.applicationNumber as string;
      const routing = review.routingStatus as string;
      const status = review.status as string;
      let newStatus: string | undefined;
      if (routing && routing !== 'Pending Submission' && routing !== 'In Progress') {
        newStatus = ROUTING_TO_PERMIT_STATUS[routing] || ROUTING_TO_PERMIT_STATUS[status || ''];
      } else if (status && status !== 'In Progress') {
        newStatus = ROUTING_TO_PERMIT_STATUS[status];
      }
      if (!newStatus || !appNum) continue;

      for (const permit of permits) {
        if (permit.permitNumber === appNum && permit.permitStatus !== newStatus) {
          permit.permitStatus = newStatus;
          changed = true;
        }
      }
    }

    if (changed) {
      await db.rmsData.upsert({
        where: { key: 'rms-building-permits' },
        update: { data: JSON.stringify(permits) },
        create: { key: 'rms-building-permits', data: JSON.stringify(permits) },
      });
      console.log('[bp-sync] Auto-synced permit statuses from BP official reviews');
    }
    return changed;
  } catch (err) {
    console.error('[bp-sync] Error:', err);
    return false;
  }
}

/**
 * GET /api/rms-data?key=rms-businesses
 *
 * Phase 1: Service-layer keys are only used when the new tables exist.
 * If the Assembly table is missing (schema not yet migrated), fall back
 * to the original RmsData JSON-blob behaviour transparently.
 */
export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    // Advisory auth — payload may be null if not logged in (Phase 1 compat)
    await requireAuth(request);

    // ── Service-layer keys (dual-read) — only when tables exist ──
    if (key === 'rms-businesses') {
      try {
        const { BusinessService } = await import('@/services');
        const assembly = await db.assembly.findFirst();
        const assemblyId = assembly?.id || 'default';
        const data = await BusinessService.getAll(assemblyId);
        return NextResponse.json({ key, data });
      } catch {
        // Assembly table doesn't exist yet → fall through to RmsData
      }
    }

    // ── Auto-sync: when reading building permits, ensure statuses match reviews ──
    if (key === 'rms-building-permits') {
      await syncPermitStatusesFromReviews();
    }

    // ── Default: read from RmsData (unchanged behaviour) ──
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
 * Phase 1: Service-layer keys only used when new tables exist.
 * Otherwise writes go to RmsData only (original behaviour).
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, data } = body;
    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }

    const payload = await requireAuth(request);

    // ── Service-layer keys (dual-write) — only when tables exist ──
    if (key === 'rms-businesses' && Array.isArray(data)) {
      try {
        const { BusinessService } = await import('@/services');
        const assembly = await db.assembly.findFirst();
        const assemblyId = assembly?.id || 'default';
        await BusinessService.saveAll(data, assemblyId, {
          userId: payload?.userId,
          ipAddress: getClientIp(request),
        });
        return NextResponse.json({ success: true, key });
      } catch {
        // Assembly table doesn't exist yet → fall through to RmsData write
      }
    }

    // ── Default: write to RmsData (unchanged behaviour) ──
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

    // ── Sync: when saving BP official reviews, update building permit statuses ──
    if (key === 'rms-bp-official' && Array.isArray(data)) {
      await syncPermitStatusesFromReviews();
    }

    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error('PUT /api/rms-data error:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
