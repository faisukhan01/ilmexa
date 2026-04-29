import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dns from 'dns/promises';
import { SignJWT } from 'jose';
import { db } from '@/lib/db';
import { sendOtpEmail } from '@/lib/email';

// ── Known disposable / temporary email domains ────────────────────────────────

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'mailinator2.com', 'guerrillamail.com', 'guerrillamail.info',
  'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.net', 'guerrillamail.org',
  'guerrillamailblock.com', 'yopmail.com', 'yopmail.fr', 'yopmail.net',
  'tempmail.com', 'temp-mail.org', 'temp-mail.ru', 'temp.email',
  'throwaway.email', 'sharklasers.com', 'spam4.me', 'trashmail.com',
  'trashmail.me', 'trashmail.net', 'trashmail.io', 'trashmail.at',
  'trashmail.org', 'trashmailer.com', 'trashinbox.com', 'trashimail.de',
  'trashemail.de', 'trashdevil.com', 'dispostable.com', 'maildrop.cc',
  'mailnull.com', 'fakeinbox.com', 'getnada.com', 'nada.email',
  'mailtemp.net', 'tempinbox.com', 'tempr.email', 'spambox.us',
  'mailnesia.com', '10minutemail.com', '10minutemail.net', '20minutemail.com',
  'getairmail.com', 'mohmal.com', 'discard.email', 'tempemail.com',
  'spamgourmet.com', 'mailexpire.com', 'selfdestructingmail.com',
  'throwam.com', 'throwam.net', 'mintemail.com', 'meltmail.com',
  'jetable.fr.nf', 'jetable.com', 'jetable.net', 'jetable.org',
  'filzmail.com', 'dayrep.com', 'fleckens.hu', 'rhyta.com',
  'gustr.com', 'emz.net', 'binkmail.com', 'bobmail.info',
  'dodgit.com', 'notsharingmy.info', 'objectmail.com', 'obobbo.com',
  'safetymail.info', 'spamfree24.org', 'supergreatmail.com', 'sweetxxx.de',
  'tempemail.net', 'temporaryemail.net', 'temporaryemail.us',
  'twinmail.de', 'uggsrock.com', 'wegwerfmail.de', 'zoemail.com',
  'zoemail.net', 'mailmoat.com', 'spamex.com', 'breakthru.com',
  'despam.it', 'discardmail.com', 'discardmail.de', 'fakemailgenerator.com',
  'fakemail.fr', 'fast-email.com', 'frapmail.com', 'getonemail.com',
  'getonemail.net', 'haltospam.com', 'inoutmail.de', 'inoutmail.eu',
  'instant-mail.de', 'kasmail.com', 'keepmymail.com', 'killmail.com',
  'killmail.net', 'kurzepost.de', 'mailcat.biz', 'mailcatch.com',
  'mailde.de', 'mailde.info', 'mailguard.me', 'mailin8r.com',
  'mailismagic.com', 'mailme.ir', 'mailme24.com', 'mailmetrash.com',
  'mailslite.com', 'mailtothis.com', 'mailzilla.com', 'mailzilla.org',
  'mbx.cc', 'myfastmail.com', 'mytrashmail.com', 'nabuma.com',
  'neverbox.com', 'nobulk.com', 'nospam.ze.tc', 'nospam4.us',
  'nospamfor.us', 'nospammail.net', 'nowmymail.com', 'odnorazovoe.ru',
  'oneoffemail.com', 'oneoffmail.com', 'outlawspam.com', 'pancakemail.com',
  'pingir.com', 'pookmail.com', 'postacin.com', 'proxymail.eu',
  'rcpt.at', 'regbypass.com', 'rejectmail.com', 'rppkn.com',
  'safetypost.de', 'saynotospams.com', 'sendspamhere.com',
  'shiftmail.com', 'shitmail.me', 'shitmail.org', 'sibmail.com',
  'slopsbox.com', 'smellfear.com', 'smashmail.de', 'snakemail.com',
  'sneakemail.com', 'sofimail.com', 'sogetthis.com', 'spamavert.com',
  'spambob.com', 'spambob.net', 'spambob.org', 'spambog.com',
  'spambog.de', 'spambog.ru', 'spamcannon.com', 'spamcero.com',
  'spamday.com', 'spamfree.eu', 'spamfree24.de', 'spamfree24.eu',
  'spamfree24.info', 'spamfree24.net', 'spamgoes.in', 'spamhere.net',
  'spamhole.com', 'spamify.com', 'spaminator.de', 'spamkill.info',
  'spaml.com', 'spaml.de', 'spammotel.com', 'spamoff.de',
  'spamstack.net', 'spamthisplease.com', 'spamtroll.net',
  'tempalias.com', 'tempe-mail.com', 'tempemail.biz', 'tempemail.org',
  'tempmail.eu', 'tempmailer.com', 'tempmailer.de', 'tempomail.fr',
  'temporarily.de', 'temporaryforwarding.com', 'temporaryinbox.com',
  'tempthe.net', 'tempymail.com', 'tilien.com', 'tmail.ws',
  'toomail.biz', 'trash-mail.at', 'trash-mail.com', 'trash-mail.de',
  'trash2009.com', 'trash2010.com', 'trash2011.com', 'turual.com',
  'uroid.com', 'veryrealemail.com', 'vmailing.info', 'weg-werf-email.de',
  'wegwerf-emails.de', 'wegwerfadresse.de', 'wegwerfemail.com',
  'wegwerfemail.de', 'wegwerfmail.net', 'wegwerfmail.org',
  'whyspam.me', 'willselfdestruct.com', 'wuzupmail.net',
  'xagloo.com', 'xents.com', 'xmaily.com', 'xoxy.net',
  'yapped.net', 'z1p.biz', 'zehnminuten.de', 'zehnminutenmail.de',
  'zippymail.info', 'zoemail.org', 'zomg.info', 'disposableemailaddresses.com',
  'spamgourmet.net', 'spamgourmet.org', 'mailinator.net', 'mailinator.org',
]);

const TRUSTED_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in',
  'yahoo.com.pk', 'yahoo.fr', 'yahoo.de', 'yahoo.es', 'yahoo.it',
  'outlook.com', 'outlook.co.uk', 'hotmail.com', 'hotmail.co.uk', 'live.com',
  'live.co.uk', 'msn.com', 'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me', 'pm.me', 'tutanota.com', 'tutamail.com',
  'zoho.com', 'aol.com', 'yandex.com', 'yandex.ru', 'mail.com',
  'gmx.com', 'gmx.net', 'gmx.de', 'web.de', 'fastmail.com',
  'edu.pk', 'gov.pk', 'org.pk', 'net.pk', 'com.pk',
]);

async function domainHasMx(domain: string): Promise<boolean> {
  try {
    const records = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('dns_timeout')), 2000)
      ),
    ]);
    return (records as dns.MxRecord[]).length > 0;
  } catch {
    return false;
  }
}

async function isRealEmailDomain(email: string): Promise<boolean> {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  if (DISPOSABLE_DOMAINS.has(domain)) return false;
  if (TRUSTED_DOMAINS.has(domain)) return true;
  return domainHasMx(domain);
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const PENDING_SECRET = new TextEncoder().encode(
  (process.env.JWT_SECRET ?? '') + '-pending-signup'
);

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check domain validity
    const realDomain = await isRealEmailDomain(normalizedEmail);
    if (!realDomain) {
      return NextResponse.json({
        error: 'This email address doesn\'t appear to be real. Please use your actual email or continue with Google instead.',
      }, { status: 400 });
    }

    // Check if already registered
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    // Hash password and generate OTP
    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = generateOtp();

    // Send OTP email
    const sent = await sendOtpEmail(normalizedEmail, otp, name.trim());
    if (!sent) {
      return NextResponse.json({ error: 'Could not send verification email. Please continue with Google instead.' }, { status: 500 });
    }

    // Create a short-lived signed token containing the pending signup data
    const pendingToken = await new SignJWT({ name: name.trim(), email: normalizedEmail, hashedPassword, otp })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(PENDING_SECRET);

    return NextResponse.json({ pendingToken, email: normalizedEmail });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 });
  }
}
