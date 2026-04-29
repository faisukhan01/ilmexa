import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_COOKIE = 'ilmexa-admin';
const ADMIN_SECRET = new TextEncoder().encode(
  (process.env.JWT_SECRET ?? '') + '-superadmin'
);

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: 'superadmin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(ADMIN_SECRET);
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, ADMIN_SECRET);
    return payload.role === 'superadmin';
  } catch {
    return false;
  }
}

export async function verifyAdminRequest(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

export async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

export function adminCookieOptions(token: string) {
  return {
    name: ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 12, // 12 hours
    path: '/',
  };
}

export function clearAdminCookieOptions() {
  return {
    name: ADMIN_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
    path: '/',
  };
}
