import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOtpEmail(to: string, otp: string, name: string): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: 'Ilmexa AI <onboarding@resend.dev>',
      to,
      subject: `${otp} — Your Ilmexa AI verification code`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 22px; font-weight: 700; color: #111827; margin: 0;">Ilmexa AI</h1>
            <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">AI-Powered Education Platform</p>
          </div>

          <p style="color: #374151; font-size: 15px; margin: 0 0 8px;">Hi ${name},</p>
          <p style="color: #374151; font-size: 15px; margin: 0 0 28px;">Use this code to verify your email address. It expires in <strong>10 minutes</strong>.</p>

          <div style="background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
            <p style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Verification Code</p>
            <p style="color: #059669; font-size: 40px; font-weight: 800; letter-spacing: 12px; margin: 0; font-family: 'Courier New', monospace;">${otp}</p>
          </div>

          <p style="color: #9ca3af; font-size: 13px; margin: 0;">If you didn't create an Ilmexa AI account, you can safely ignore this email.</p>
        </div>
      `,
    });
    return !error;
  } catch {
    return false;
  }
}
