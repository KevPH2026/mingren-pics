import { NextRequest, NextResponse } from 'next/server';
import { getGenerations } from '@/lib/user-store';
import { isAdminSession } from '../login/route';

// GET /api/admin/archive?timestamp=xxx — 获取某次生成的存档图片
export async function GET(req: NextRequest) {
  if (!isAdminSession(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const timestamp = req.nextUrl.searchParams.get('timestamp');
  if (!timestamp) {
    return NextResponse.json({ error: 'Missing timestamp' }, { status: 400 });
  }

  try {
    const gens = await getGenerations();
    const gen = gens.find(g => g.timestamp === timestamp);
    
    if (!gen) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    return NextResponse.json({
      timestamp: gen.timestamp,
      email: gen.email || '匿名用户',
      celebId: gen.celebId,
      success: gen.success,
      // 返回存档的 base64 图片（仅管理员可见）
      archivedUserImage: gen.archivedUserImage || null,
      archivedResultImage: gen.archivedResultImage || null,
      hasUserImage: !!gen.userImageUrl,
      hasResultImage: !!gen.imageUrl,
    });
  } catch (e: any) {
    console.error('Admin archive error:', e);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
