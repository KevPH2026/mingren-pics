import { NextRequest, NextResponse } from 'next/server';
import { getAllCelebrityStatus } from '@/lib/self-evolution';
import { celebrities } from '@/lib/celebrities';

export const dynamic = 'force-dynamic';

// GET /api/celebrities/status
// 公开API：获取名人状态（用于前端显示下线标记）
export async function GET(req: NextRequest) {
  try {
    const statusMap = await getAllCelebrityStatus();

    // 只返回必要信息，不暴露详细错误
    const celebrityStatus = celebrities.map(celeb => ({
      id: celeb.id,
      name: celeb.name,
      status: {
        disabled: statusMap[celeb.id]?.disabled || false,
        // 不返回具体failCount，只返回是否可用
      },
    }));

    return NextResponse.json({
      celebrities: celebrityStatus,
      updatedAt: new Date().toISOString(),
    });

  } catch (e: any) {
    console.error('Celebrity status error:', e);
    // 失败时返回全部可用（不阻断用户体验）
    return NextResponse.json({
      celebrities: celebrities.map(c => ({
        id: c.id,
        name: c.name,
        status: { disabled: false },
      })),
      updatedAt: new Date().toISOString(),
    });
  }
}
