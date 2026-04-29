import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { signToken, getSessionCookieOptions } from '@/lib/auth';

const PENDING_SECRET = new TextEncoder().encode(
  (process.env.JWT_SECRET ?? '') + '-pending-signup'
);

export async function POST(req: NextRequest) {
  try {
    const { pendingToken, otp } = await req.json();

    if (!pendingToken || !otp) {
      return NextResponse.json({ error: 'Missing verification data' }, { status: 400 });
    }

    // Verify and decode the pending signup token
    let payload: { name: string; email: string; hashedPassword: string; otp: string };
    try {
      const result = await jwtVerify(pendingToken, PENDING_SECRET);
      payload = result.payload as typeof payload;
    } catch {
      return NextResponse.json({ error: 'Verification code expired. Please sign up again.' }, { status: 400 });
    }

    // Check OTP matches
    if (otp.trim() !== payload.otp) {
      return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 });
    }

    // Final duplicate check before creating account
    const existing = await db.user.findUnique({ where: { email: payload.email } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    // Create the verified account
    const user = await db.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        password: payload.hashedPassword,
      },
    });

    const token = await signToken({ userId: user.id, email: user.email, name: user.name || '' });
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
    }, { status: 201 });

    response.cookies.set(getSessionCookieOptions(token));
    return response;
  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 });
  }
}
