import { NextRequest, NextResponse } from 'next/server';
import { signAdminToken, adminCookieOptions } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD || 'faisalkhan0297';

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
