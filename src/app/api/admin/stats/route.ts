import { NextRequest, NextResponse } from 'next/server';
import { getAllUserRecords, getGenerations, trackGeneration } from '@/lib/user-store';

const ADMIN_KEY = process.env.ADMIN_KEY || 'mingren-admin-2026';

interface GenRecord {
  timestamp: string;
  email?: string;
  celebId?: string;
  scenarioId?: string;
  success: boolean;
}

// Re-export for generate/start to call (now async)
export async function trackGen(record: GenRecord) {
  await trackGeneration(record);
}

// GET /api/admin/stats — Return registration + usage stats
export async function GET(req: NextRequest) {
  const adminKey = req.nextUrl.searchParams.get('key') || req.headers.get('x-admin-key');
  if (adminKey !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const users = await getAllUserRecords();
    const realUsers = users.filter(u => !u.email.startsWith('admin_'));
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayUsers = realUsers.filter(u => u.createdAt.slice(0, 10) === todayStr).length;

    const recent = realUsers
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10)
      .map(u => ({
        email: u.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
        referralCode: u.referralCode,
        inviteCount: u.inviteCount,
        createdAt: u.createdAt,
      }));

    // Generation stats
    const gens = await getGenerations();
    const todayGens = gens.filter(g => g.timestamp.slice(0, 10) === todayStr);
    const todaySuccess = todayGens.filter(g => g.success).length;
    const todayFailed = todayGens.filter(g => !g.success).length;
    const totalGens = gens.filter(g => g.success).length;

    // Recent generations
    const recentGens = gens
      .slice(-10)
      .reverse()
      .map(g => ({
        time: g.timestamp,
        user: g.email ? g.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '匿名用户',
        celeb: g.celebId || '-',
        success: g.success,
      }));

    return NextResponse.json({
      // Users
      totalUsers: realUsers.length,
      todayNewUsers: todayUsers,
      recentUsers: recent,
      // Generations
      totalGenerations: totalGens,
      todayGenerations: todaySuccess,
      todayFailed,
      recentGenerations: recentGens,
    });
  } catch (e: any) {
    console.error('Admin stats error:', e);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
