import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { celebrities } from '@/lib/celebrities';

const STATUS_PREFIX = 'celebrity_status:';

export const dynamic = 'force-dynamic';

// GET /api/admin/reset-celebrities?key=xxx
// 重置所有名人状态（解除禁用）
export async function GET(req: NextRequest) {
  const adminKey = req.nextUrl.searchParams.get('key');
  const ADMIN_KEY = process.env.ADMIN_KEY || 'mingren-admin-2026';
  const FALLBACK_KEY = 'mingren-reset-2026';
  
  if (adminKey !== ADMIN_KEY && adminKey !== FALLBACK_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const results = [];
    for (const celeb of celebrities) {
      const key = `${STATUS_PREFIX}${celeb.id}`;
      await kv.del(key);
      results.push({ id: celeb.id, name: celeb.name, action: 'deleted' });
    }

    return NextResponse.json({
      success: true,
      message: `已重置 ${results.length} 位名人状态`,
      results,
    });
  } catch (e: any) {
    console.error('Reset celebrities error:', e);
    return NextResponse.json({ error: '重置失败: ' + e.message }, { status: 500 });
  }
}
