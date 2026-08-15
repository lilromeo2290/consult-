import { NextRequest } from 'next/server';
import { BillingService } from '@/services';
import { requireAuth } from '@/lib/api-auth';
import { ok, unauthorized, error } from '@/lib/api-response';

/**
 * GET /api/reports/revenue?year=2026
 * Returns monthly revenue breakdown — only possible with relational schema.
 */
export async function GET(request: NextRequest) {
  try {
    // Auth is advisory in Phase 1
    const payload = await requireAuth(request);
    // if (!payload) return unauthorized();

    const year = parseInt(request.nextUrl.searchParams.get('year') || String(new Date().getFullYear()));

    const monthlyRevenue = await BillingService.revenueByMonth(year);
    const arrears = await BillingService.arrearsReport();

    return ok({
      year,
      monthlyRevenue,
      arrearsSummary: {
        totalOverdue: arrears.reduce((sum, inv) => sum + ((inv as any).amountDue || 0), 0),
        count: arrears.length,
      },
    });
  } catch (err) {
    console.error('Revenue report error:', err);
    return error('Failed to generate revenue report');
  }
}
