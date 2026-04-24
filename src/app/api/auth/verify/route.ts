import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.AUTH_SECRET || 'mingren-pics-dev-secret-2026';

function signCode(email: string, code: string): string {
  return createHmac('sha256', SECRET).update(`${email}:${code}`).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 });
    }

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

    // 验证邮箱匹配
    if (parsed.email !== email.toLowerCase()) {
      return NextResponse.json({ error: '邮箱不匹配' }, { status: 400 });
    }

    // 验证签名防篡改
    const expectedSig = signCode(parsed.email, parsed.code);
    if (expectedSig !== parsed.signature) {
      return NextResponse.json({ error: '验证失败' }, { status: 400 });
    }

    // 验证码比对
    if (parsed.code !== code) {
      return NextResponse.json({ error: '验证码错误' }, { status: 400 });
    }

    // 验证通过 — 清除cookie，返回注册成功
    const res = NextResponse.json({ ok: true, email: parsed.email });
    res.cookies.set('verify_token', '', { maxAge: 0, path: '/' });
    return res;
  } catch (e: any) {
    console.error('Verify error:', e);
    return NextResponse.json({ error: '验证失败' }, { status: 500 });
  }
}
