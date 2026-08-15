import { verifyToken, extractToken, type JwtPayload } from './auth';
import { unauthorized } from './api-response';
import { db } from './db';

/**
 * Require authentication. Returns the JWT payload or null.
 * For Phase 1, this is advisory — the frontend still works without it.
 * Enforce strictly once the login flow is wired up.
 */
export async function requireAuth(request: Request): Promise<JwtPayload | null> {
  const token = extractToken(request);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  // Verify user still exists and is active
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, active: true },
  });
  if (!user || !user.active) return null;

  return payload;
}

/**
 * Get client IP from request headers.
 */
export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
}

/**
 * Get user agent from request headers.
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}