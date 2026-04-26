import { NextRequest, NextResponse } from 'next/server';
import { trackVisit } from '@/lib/user-store';

// POST /api/track-visit — 记录页面访问
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown';
    const ua = req.headers.get('user-agent') || undefined;
    const referer = req.headers.get('referer') || undefined;
    
    await trackVisit({
      timestamp: new Date().toISOString(),
      ip,
      path: body.path || '/',
      ua,
      referer,
    });
    
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
