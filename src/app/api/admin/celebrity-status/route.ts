import { NextRequest, NextResponse } from 'next/server';
import { getAllCelebrityStatus, getEvolutionLogs, setCelebrityStatus } from '@/lib/self-evolution';
import { celebrities } from '@/lib/celebrities';

export const dynamic = 'force-dynamic';

const ADMIN_KEY = process.env.ADMIN_SECRET || 'mingren-admin-2026';

function isAdmin(req: NextRequest): boolean {
  const key = req.nextUrl.searchParams.get('key');
  return key === ADMIN_KEY;
}

// GET /api/admin/celebrity-status?key=xxx
// 获取所有名人状态 + 进化日志
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [statusMap, logs] = await Promise.all([
      getAllCelebrityStatus(),
      getEvolutionLogs(100),
    ]);

    // 合并状态与名人信息
    const celebrityStatus = celebrities.map(celeb => {
      const status = statusMap[celeb.id];
      return {
        id: celeb.id,
        name: celeb.name,
        nameEn: celeb.nameEn,
        category: celeb.category,
        hotness: celeb.hotness,
        hasVariants: (celeb.promptVariants?.length || 0) > 0,
        variantCount: celeb.promptVariants?.length || 0,
        status: status || { disabled: false, failCount: 0 },
      };
    });

    // 统计
    const total = celebrities.length;
    const disabled = celebrityStatus.filter(c => c.status.disabled).length;
    const online = total - disabled;
    const withVariants = celebrityStatus.filter(c => c.hasVariants).length;

    return NextResponse.json({
      summary: {
        total,
        online,
        disabled,
        withVariants,
        healthRate: `${Math.round((online / total) * 100)}%`,
      },
      celebrities: celebrityStatus,
      recentLogs: logs.slice(0, 20),
    });

  } catch (e: any) {
    console.error('Admin celebrity-status error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/admin/celebrity-status?key=xxx
// Body: { celebrityId: string, action: 'enable' | 'disable', reason?: string }
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { celebrityId, action, reason } = body;

    if (!celebrityId || !action) {
      return NextResponse.json({ error: 'Missing celebrityId or action' }, { status: 400 });
    }

    if (!['enable', 'disable'].includes(action)) {
      return NextResponse.json({ error: 'Action must be enable or disable' }, { status: 400 });
    }

    const celeb = celebrities.find(c => c.id === celebrityId);
    if (!celeb) {
      return NextResponse.json({ error: 'Celebrity not found' }, { status: 404 });
    }

    await setCelebrityStatus(celebrityId, action === 'disable', reason);

    return NextResponse.json({
      success: true,
      celebrityId,
      action,
      name: celeb.name,
      message: `名人 ${celeb.name} 已${action === 'disable' ? '下线' : '上线'}`,
    });

  } catch (e: any) {
    console.error('Admin celebrity-status POST error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
