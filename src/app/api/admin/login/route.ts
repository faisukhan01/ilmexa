import { NextRequest, NextResponse } from 'next/server';
import { signAdminToken, adminCookieOptions } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });
    }

    if (!password || password !== adminPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = await signAdminToken();
    const response = NextResponse.json({ success: true });
    response.cookies.set(adminCookieOptions(token));
    return response;
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
