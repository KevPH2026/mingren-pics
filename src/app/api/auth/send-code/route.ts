import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.AUTH_SECRET || 'mingren-pics-dev-secret-2026';

function signCode(email: string, code: string): string {
  return createHmac('sha256', SECRET).update(`${email}:${code}`).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '请输入有效邮箱' }, { status: 400 });
    }

    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const signature = signCode(email.toLowerCase(), code);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // 无API key时，开发模式直接返回验证码（不验证）
      console.log(`[DEV] 验证码 for ${email}: ${code}`);
      const res = NextResponse.json({ ok: true, dev: true });
      res.cookies.set('verify_token', JSON.stringify({ email: email.toLowerCase(), code, signature }), {
        httpOnly: true,
        secure: true,
        maxAge: 600, // 10分钟有效
        path: '/',
        sameSite: 'lax',
      });
      return res;
    }

    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: 'mingren.pics <noreply@mingren.pics>',
      to: email,
      subject: `你的验证码: ${code}`,
      html: `
        <div style="max-width:400px;margin:0 auto;font-family:sans-serif;text-align:center;padding:40px 20px;">
          <h1 style="font-size:24px;margin-bottom:8px;">📸 mingren.pics</h1>
          <p style="color:#666;margin-bottom:24px;">你的邮箱验证码</p>
          <div style="font-size:48px;font-weight:900;letter-spacing:8px;color:#e00;padding:16px;background:#fff5f5;border-radius:12px;border:2px dashed #e00;">
            ${code}
          </div>
          <p style="color:#999;font-size:12px;margin-top:24px;">10分钟内有效 · 如非本人操作请忽略</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: '邮件发送失败，请重试' }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set('verify_token', JSON.stringify({ email: email.toLowerCase(), code, signature }), {
      httpOnly: true,
      secure: true,
      maxAge: 600,
      path: '/',
      sameSite: 'lax',
    });
    return res;
  } catch (e: any) {
    console.error('Send code error:', e);
    return NextResponse.json({ error: '发送失败' }, { status: 500 });
  }
}
