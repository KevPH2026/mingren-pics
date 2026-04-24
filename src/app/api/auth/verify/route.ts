import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createUser, hashEmail } from '@/lib/kv';

const SECRET = process.env.JWT_SECRET || 'mingren-pics-dev-secret-2026';

function signCode(email: string, code: string): string {
  return createHmac('sha256', SECRET).update(`${email}:${code}`).digest('hex');
}

function signToken(userId: string): string {
  return createHmac('sha256', SECRET).update(`token:${userId}:${Date.now().toString().slice(0, -5)}`).digest('hex').slice(0, 32);
}

export async function POST(req: NextRequest) {
  try {
    const { email, code, referralCode: inviteCode } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 });
    }

    // 邀请码验证（如果提供了的话）
    // 注意：有邀请码才能注册，或者开放注册（取决于你的策略）
    // 这里暂时允许无码注册（免费用户），有码注册获赠更多

    const token = req.cookies.get('verify_token')?.value;
    if (!token) {
      return NextResponse.json({ error: '请先发送验证码' }, { status: 400 });
    }

    let parsed: { email: string; code: string; signature: string };
    try {
      parsed = JSON.parse(token);
    } catch {
      return NextResponse.json({ error: '验证码已过期，请重新发送' }, { status: 400 });
    }

    if (parsed.email !== email.toLowerCase()) {
      return NextResponse.json({ error: '邮箱不匹配' }, { status: 400 });
    }

    const expectedSig = signCode(parsed.email, parsed.code);
    if (expectedSig !== parsed.signature) {
      return NextResponse.json({ error: '验证失败' }, { status: 400 });
    }

    if (parsed.code !== code) {
      return NextResponse.json({ error: '验证码错误' }, { status: 400 });
    }

    // 创建/获取用户
    const userId = hashEmail(parsed.email);
    const { referralCode: myReferralCode, childCodes, bonusQuota } = await createUser(parsed.email, inviteCode);

    // 设置登录 cookie
    const sig = signToken(userId);
    const res = NextResponse.json({
      ok: true,
      email: parsed.email,
      referralCode: myReferralCode,
      childCodes,     // 返回3个子邀请码
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
    res.cookies.set('mingren_email', parsed.email, {
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
    res.cookies.set('verify_token', '', { maxAge: 0, path: '/' });
    return res;
  } catch (e: any) {
    console.error('Verify error:', e);
    return NextResponse.json({ error: '验证失败' }, { status: 500 });
  }
}
