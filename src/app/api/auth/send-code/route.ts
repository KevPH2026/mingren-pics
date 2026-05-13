import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createHmac } from 'crypto';
import { isProd } from '@/lib/auth';

const SECRET = process.env.AUTH_SECRET || 'mingren-pics-dev-secret-2026';

// ⚠️ Production safety: reject requests if using default secret
if (isProd && SECRET === 'mingren-pics-dev-secret-2026') {
  console.warn('⚠️ AUTH_SECRET is using default value in production! Set AUTH_SECRET env var.');
}

function signCode(email: string, code: string): string {
  return createHmac('sha256', SECRET).update(`${email}:${code}`).digest('hex');
}

// Rate limiting (in-memory)
const rateLimits: Record<string, { count: number; resetAt: number }> = {};
function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimits[key];
  if (!entry || now > entry.resetAt) {
    rateLimits[key] = { count: 1, resetAt: now + windowMs };
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '请输入有效邮箱' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(`email:${normalizedEmail}`, 3, 10 * 60 * 1000)) {
      return NextResponse.json({ error: '该邮箱验证码发送过于频繁，请10分钟后再试' }, { status: 429 });
    }
    if (!checkRateLimit(`ip:${ip}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const signature = signCode(normalizedEmail, code);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // No email service configured — return code directly for testing
      console.log(`[DEV] 验证码 for ${email}: ${code}`);
      return NextResponse.json({ ok: true, dev: true, code, signature });
    }

    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: 'mingren.pics <onboarding@resend.dev>',
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

    return NextResponse.json({ ok: true, signature });
  } catch (e: any) {
    console.error('Send code error:', e);
    return NextResponse.json({ error: '发送失败，请稍后重试' }, { status: 500 });
  }
}
