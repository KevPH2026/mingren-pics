import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createUser, hashEmail, getDisplayCodes } from '@/lib/kv';

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

    if (!signature) {
      return NextResponse.json({ error: '请先发送验证码' }, { status: 400 });
    }

    const expectedSig = signCode(email.toLowerCase(), code);
    if (expectedSig !== signature) {
      return NextResponse.json({ error: '验证失败' }, { status: 400 });
    }

    // Create user (stateless — no KV needed)
    const { referralCode: myReferralCode, childCodes, childCodeDisplays, bonusQuota } =
      await createUser(email.toLowerCase(), inviteCode);

    // Set login cookies
    const userId = hashEmail(email.toLowerCase());
    const sig = signToken(userId);
    const res = NextResponse.json({
      ok: true,
      email: email.toLowerCase(),
      referralCode: myReferralCode,
      childCodes,
      childCodeDisplays,
      bonusQuota,
    });

    res.cookies.set('mingren_uid', userId, {
      httpOnly: true, secure: true, maxAge: 365 * 24 * 3600, path: '/', sameSite: 'lax',
    });
    res.cookies.set('mingren_sig', sig, {
      httpOnly: true, secure: true, maxAge: 365 * 24 * 3600, path: '/', sameSite: 'lax',
    });
    res.cookies.set('mingren_email', email.toLowerCase(), {
      httpOnly: false, secure: true, maxAge: 365 * 24 * 3600, path: '/', sameSite: 'lax',
    });
    res.cookies.set('mingren_ref', myReferralCode, {
      httpOnly: false, secure: true, maxAge: 365 * 24 * 3600, path: '/', sameSite: 'lax',
    });

    // Store child invite codes in a non-httpOnly cookie so frontend can display them
    res.cookies.set('mingren_invite_codes', JSON.stringify(childCodes), {
      httpOnly: false, secure: true, maxAge: 365 * 24 * 3600, path: '/', sameSite: 'lax',
    });

    return res;
  } catch (e: any) {
    console.error('Verify error:', e);
    return NextResponse.json({ error: '验证失败' }, { status: 500 });
  }
}
