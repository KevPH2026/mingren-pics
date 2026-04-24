import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const res = NextResponse.json({ ok: true });

    // Clear all mingren_ prefixed cookies
    const cookieNames = ['mingren_uid', 'mingren_sig', 'mingren_email', 'mingren_ref', 'mingren_invite_codes'];

    for (const name of cookieNames) {
      res.cookies.set(name, '', {
        httpOnly: name !== 'mingren_email' && name !== 'mingren_ref' && name !== 'mingren_invite_codes',
        secure: true,
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
