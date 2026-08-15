import { NextRequest } from 'next/server';
import { AuthService } from '@/services';
import { ok, unauthorized, error } from '@/lib/api-response';
import { getClientIp } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return error('Username and password are required');
    }

    const result = await AuthService.login(username, password, getClientIp(request));
    if (!result) {
      return unauthorized('Invalid username or password');
    }

    return ok(result);
  } catch (err) {
    console.error('Login error:', err);
    return error('Login failed');
  }
}
