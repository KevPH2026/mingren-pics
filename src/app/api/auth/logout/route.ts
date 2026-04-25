import { NextRequest, NextResponse } from 'next/server';
import { isProd } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const res = NextResponse.json({ ok: true });

    const cookieNames = ['mingren_uid', 'mingren_sig', 'mingren_email', 'mingren_ref', 'mingren_usage'];

    for (const name of cookieNames) {
      const isPublic = name === 'mingren_email' || name === 'mingren_ref';
      res.cookies.set(name, '', {
        httpOnly: !isPublic,
        secure: isProd,
        maxAge: 0,
        path: '/',
        sameSite: 'lax',
      });
    }

    return res;
  } catch (e: any) {
    console.error('Logout error:', e);
    return NextResponse.json({ error: '退出失败' }, { status: 500 });
  }
}
