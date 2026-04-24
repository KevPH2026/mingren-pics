import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { hashPassword } from '@/lib/password';
import { createUserRecord, getUserRecord, setTempToken, verifyTempToken, clearTempToken } from '@/lib/user-store';
import { hashEmail, createUser, getDisplayCodes } from '@/lib/kv';

const SECRET = process.env.SECRET || 'mingren-pics-dev-secret-2026';

function signToken(userId: string): string {
  return createHmac('sha256', SECRET).update(`token:${userId}:${Date.now().toString().slice(0, -5)}`).digest('hex').slice(0, 32);
}

function setLoginCookies(res: NextResponse, email: string, referralCode: string, childCodes: string[]) {
  const userId = hashEmail(email.toLowerCase());
  const sig = signToken(userId);

  res.cookies.set('mingren_uid', userId, {
    httpOnly: true, secure: true, maxAge: 365 * 24 * 3600, path: '/', sameSite: 'lax',
  });
  res.cookies.set('mingren_sig', sig, {
    httpOnly: true, secure: true, maxAge: 365 * 24 * 3600, path: '/', sameSite: 'lax',
  });
  res.cookies.set('mingren_email', email.toLowerCase(), {
    httpOnly: false, secure: true, maxAge: 365 * 24 * 3600, path: '/', sameSite: 'lax',
  });
  res.cookies.set('mingren_ref', referralCode, {
    httpOnly: false, secure: true, maxAge: 365 * 24 * 3600, path: '/', sameSite: 'lax',
  });
  res.cookies.set('mingren_invite_codes', JSON.stringify(childCodes), {
    httpOnly: false, secure: true, maxAge: 365 * 24 * 3600, path: '/', sameSite: 'lax',
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, tempToken } = await req.json();

    if (!email || !password || !tempToken) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 });
    }

    // 1. Verify tempToken
    const tokenEmail = verifyTempToken(tempToken);
    if (!tokenEmail || tokenEmail !== email.toLowerCase()) {
      return NextResponse.json({ error: '临时凭证无效或已过期' }, { status: 401 });
    }

    const normalizedEmail = email.toLowerCase();

    // 2. Hash password
    const { hash, salt } = hashPassword(password);

    // 3. Check if user record already exists (e.g. password reset)
    const existing = getUserRecord(normalizedEmail);
    if (existing) {
      // Update password for existing user
      existing.hash = hash;
      existing.salt = salt;

      const res = NextResponse.json({
        ok: true,
        email: normalizedEmail,
        referralCode: existing.referralCode,
        childCodes: existing.childCodes,
        childCodeDisplays: existing.childCodeDisplays,
      });

      setLoginCookies(res, normalizedEmail, existing.referralCode, existing.childCodes);
      clearTempToken(tempToken);
      return res;
    }

    // 4. Create new user with invite code logic (from kv.ts createUser)
    const { referralCode, childCodes, childCodeDisplays } = await createUser(normalizedEmail);

    // 5. Store user record in memory
    createUserRecord(normalizedEmail, hash, salt, referralCode, childCodes, childCodeDisplays);

    // 6. Set login cookies and respond
    const res = NextResponse.json({
      ok: true,
      email: normalizedEmail,
      referralCode,
      childCodes,
      childCodeDisplays,
    });

    setLoginCookies(res, normalizedEmail, referralCode, childCodes);

    // 7. Clear tempToken
    clearTempToken(tempToken);

    return res;
  } catch (e: any) {
    console.error('Set-password error:', e);
    return NextResponse.json({ error: '设置密码失败' }, { status: 500 });
  }
}
