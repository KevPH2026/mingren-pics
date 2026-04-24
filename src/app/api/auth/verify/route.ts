import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { hashEmail } from '@/lib/kv';
import { getUserRecord, setTempToken } from '@/lib/user-store';

const SECRET = process.env.SECRET || 'mingren-pics-dev-secret-2026';

function signCode(email: string, code: string): string {
  return createHmac('sha256', SECRET).update(`${email}:${code}`).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { email, code, signature } = await req.json();

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

    if (existingUser) {
      // Returning user — already has password
      return NextResponse.json({
        ok: true,
        isNewUser: false,
        email: normalizedEmail,
      });
    }

    // New user — issue a temp token so they can set a password
    const tempToken = setTempToken(normalizedEmail);

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
