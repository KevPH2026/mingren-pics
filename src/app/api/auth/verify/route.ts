import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { hashEmail } from '@/lib/kv';
import { setTempToken, getTempTokenEntry, getUserRecord } from '@/lib/user-store';

const SECRET = process.env.AUTH_SECRET || 'mingren-pics-dev-secret-2026';

function signCode(email: string, code: string): string {
  return createHmac('sha256', SECRET).update(`${email}:${code}`).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { email, code, signature, referralCode } = await req.json();

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

    const normalizedEmail = email.toLowerCase();
    const existingUser = getUserRecord(normalizedEmail);

    // Store referralCode in tempToken for set-password to use later
    const tempToken = setTempToken(normalizedEmail, referralCode || undefined);

    if (existingUser) {
      return NextResponse.json({
        ok: true,
        isNewUser: false,
        email: normalizedEmail,
        tempToken,
      });
    }

    return NextResponse.json({
      ok: true,
      isNewUser: true,
      email: normalizedEmail,
      tempToken,
    });
  } catch (e: any) {
    console.error('Verify error:', e);
    return NextResponse.json({ error: '验证失败' }, { status: 500 });
  }
}
