import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

// ─── Config ───────────────────────────────────────────────────────────────

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'clipe-rms-jwt-secret-change-in-production',
);

const TOKEN_EXPIRY = '8h';

export interface JwtPayload {
  userId: string;
  username: string;
  roleId: string;
  assemblyId: string | null;
}

// ─── Password ─────────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── JWT ──────────────────────────────────────────────────────────────────

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

// ─── Extract token from request ──────────────────────────────────────────

export function extractToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);

  // Also check cookie for SSR compatibility
  const cookie = request.headers.get('cookie');
  if (cookie) {
    const match = cookie.match(/(?:^|;\s*)token=([^;]+)/);
    if (match) return match[1];
  }

  return null;
}
