import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createUser, hashEmail } from '@/lib/kv';

const SECRET = process.env.AUTH_SECRET || 'mingren-pics-dev-secret-2026';

function signCode(email: string, code: string): string {
  return createHmac('sha256', SECRET).update(`${email}:${code}`).digest('hex');
}

function signToken(userId: string): string {
  return createHmac('sha256', SECRET).update(`token:${userId}:${Date.now().toString().slice(0, -5)}`).digest('hex').slice(0, 32);
}

export async function POST(req: NextRequest) {
  try {
    const { email, code, signature, referralCode: inviteCode } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 });
    }

    // 验证签名（从 send-code 返回的 signature）
    if (!signature) {
      return NextResponse.json({ error: '请先发送验证码' }, { status: 400 });
    }

    const expectedSig = signCode(email.toLowerCase(), code);
    if (expectedSig !== signature) {
      return NextResponse.json({ error: '验证失败' }, { status: 400 });
    }

    // 创建/获取用户
    const userId = hashEmail(email.toLowerCase());
    const { referralCode: myReferralCode, childCodes, bonusQuota } = await createUser(email.toLowerCase(), inviteCode);

    // 设置登录 cookie
    const sig = signToken(userId);
    const res = NextResponse.json({
      ok: true,
      email: email.toLowerCase(),
      referralCode: myReferralCode,
      childCodes,
      bonusQuota,
    });

    res.cookies.set('mingren_uid', userId, {
      httpOnly: true,
      secure: true,
      maxAge: 365 * 24 * 3600,
      path: '/',
      sameSite: 'lax',
    });
    res.cookies.set('mingren_sig', sig, {
      httpOnly: true,
      secure: true,
      maxAge: 365 * 24 * 3600,
      path: '/',
      sameSite: 'lax',
    });
    res.cookies.set('mingren_email', email.toLowerCase(), {
      httpOnly: false,
      secure: true,
      maxAge: 365 * 24 * 3600,
      path: '/',
      sameSite: 'lax',
    });
    res.cookies.set('mingren_ref', myReferralCode, {
      httpOnly: false,
      secure: true,
      maxAge: 365 * 24 * 3600,
      path: '/',
      sameSite: 'lax',
    });
    return res;
  } catch (e: any) {
    console.error('Verify error:', e);
    return NextResponse.json({ error: '验证失败' }, { status: 500 });
  }
}
