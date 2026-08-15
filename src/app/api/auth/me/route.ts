import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { ok, unauthorized } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const payload = await requireAuth(request);
    if (!payload) return unauthorized();

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        staffId: true,
        active: true,
        role: { select: { name: true } },
        assembly: { select: { id: true, code: true, name: true } },
      },
    });

    if (!user) return unauthorized();

    return ok(user);
  } catch (err) {
    console.error('Auth me error:', err);
    return unauthorized();
  }
}
