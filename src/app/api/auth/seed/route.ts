import { NextRequest } from 'next/server';
import { AuthService } from '@/services';
import { ok, error } from '@/lib/api-response';
import { getClientIp } from '@/lib/api-auth';

/**
 * POST /api/auth/seed
 * Initialize roles, permissions, default assembly, and admin user.
 * Run once after deployment. Safe to run multiple times (upserts).
 */
export async function POST(request: NextRequest) {
  try {
    const result = await AuthService.seed(getClientIp(request));
    return ok({ message: 'Seed complete', assemblyId: result.assemblyId });
  } catch (err) {
    console.error('Seed error:', err);
    return error('Seed failed');
  }
}
