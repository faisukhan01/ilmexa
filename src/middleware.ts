import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const ADMIN_COOKIE = 'ilmexa-admin';
const LOGIN_PATH = '/admin/login';

function getAdminSecret() {
  return new TextEncoder().encode((process.env.JWT_SECRET ?? '') + '-superadmin');
}

async function isValidAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getAdminSecret());
    return payload.role === 'superadmin';
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only guard /admin routes (but not /admin/login itself)
  if (!pathname.startsWith('/admin') || pathname === LOGIN_PATH) {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (token && (await isValidAdminToken(token))) {
    return NextResponse.next();
  }

  // Not authenticated — redirect to login
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = LOGIN_PATH;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
