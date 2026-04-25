import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/password';
import { getUserRecord, getReferralOwner, registerReferralCode } from '@/lib/user-store';
import { hashEmail } from '@/lib/kv';
import { signToken, authCookieOpts, publicCookieOpts } from '@/lib/auth';

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
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const record = getUserRecord(normalizedEmail);

    if (!record) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }

    const valid = verifyPassword(password, record.hash, record.salt);
    if (!valid) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    // Ensure referral code is registered in lookup
    if (record.referralCode) {
      const existing = getReferralOwner(record.referralCode);
      if (!existing) {
        // Re-register after server restart
        registerReferralCode(record.referralCode, normalizedEmail);
      }
    }

    const res = NextResponse.json({
      ok: true,
      email: normalizedEmail,
      referralCode: record.referralCode,
      inviteCount: record.inviteCount,
    });

    setLoginCookies(res, normalizedEmail, record.referralCode);

    return res;
  } catch (e: any) {
    console.error('Login error:', e);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
