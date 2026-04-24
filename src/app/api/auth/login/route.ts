import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { verifyPassword } from '@/lib/password';
import { getUserRecord } from '@/lib/user-store';
import { hashEmail } from '@/lib/kv';

const SECRET=process.env.NEXTAUTH_SECRET || 'mingren-pics-dev-secret-2026';

function signToken(userId: string): string {
  return createHmac('sha256', SECRET).update(`token:${userId}:${Date.now().toString().slice(0, -5)}`).digest('hex').slice(0, 32);
}

function setLoginCookies(res: NextResponse, email: string, referralCode: string) {
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

    const res = NextResponse.json({
      ok: true,
      email: normalizedEmail,
      referralCode: record.referralCode,
    });

    setLoginCookies(res, normalizedEmail, record.referralCode);

    return res;
  } catch (e: any) {
    console.error('Login error:', e);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
