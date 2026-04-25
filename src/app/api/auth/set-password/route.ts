import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/password';
import { createUserRecord, getUserRecord, getTempTokenEntry, clearTempToken, getReferralOwner, incrementInviteCount } from '@/lib/user-store';
import { hashEmail, generateReferralCode } from '@/lib/kv';
import { signToken, authCookieOpts, publicCookieOpts } from '@/lib/auth';
import { notifyNewRegistration } from '@/lib/notify';

function setLoginCookies(res: NextResponse, email: string, referralCode: string) {
  const userId = hashEmail(email.toLowerCase());
  const sig = signToken(userId);

  res.cookies.set('mingren_uid', userId, authCookieOpts());
  res.cookies.set('mingren_sig', sig, authCookieOpts());
  res.cookies.set('mingren_email', email.toLowerCase(), publicCookieOpts());
  res.cookies.set('mingren_ref', referralCode, publicCookieOpts());
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, tempToken } = await req.json();

    if (!email || !password || !tempToken) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 });
    }

    // 1. Verify tempToken and get full entry (includes referralCode)
    const tokenEntry = getTempTokenEntry(tempToken);
    if (!tokenEntry || tokenEntry.email !== email.toLowerCase()) {
      return NextResponse.json({ error: '临时凭证无效或已过期' }, { status: 401 });
    }

    const normalizedEmail = email.toLowerCase();
    const inviteCode = tokenEntry.referralCode; // from ?ref= parameter

    // 2. Hash password
    const { hash, salt } = hashPassword(password);

    // 3. Check if user record already exists (e.g. password reset)
    const existing = getUserRecord(normalizedEmail);
    if (existing) {
      existing.hash = hash;
      existing.salt = salt;

      const res = NextResponse.json({
        ok: true,
        email: normalizedEmail,
        referralCode: existing.referralCode,
      });

      setLoginCookies(res, normalizedEmail, existing.referralCode);
      clearTempToken(tempToken);
      return res;
    }

    // 4. Create new user
    const referralCode = generateReferralCode();
    createUserRecord(normalizedEmail, hash, salt, referralCode);

    // 5. Award inviter if invite code was used
    if (inviteCode) {
      const inviterEmail = getReferralOwner(inviteCode);
      if (inviterEmail && inviterEmail !== normalizedEmail) {
        incrementInviteCount(inviterEmail);
      }
    }

    // 6. Set login cookies and respond
    const res = NextResponse.json({
      ok: true,
      email: normalizedEmail,
      referralCode,
    });

  setLoginCookies(res, normalizedEmail, referralCode);
  clearTempToken(tempToken);

  // Fire-and-forget: notify Telegram (don't block response)
  notifyNewRegistration(normalizedEmail, referralCode, !!inviteCode);

  return res;
  } catch (e: any) {
    console.error('Set-password error:', e);
    return NextResponse.json({ error: '设置密码失败' }, { status: 500 });
  }
}
