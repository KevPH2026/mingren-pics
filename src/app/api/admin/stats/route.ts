import { NextRequest, NextResponse } from 'next/server';
import { getAllUserRecords } from '@/lib/user-store';

const ADMIN_KEY = process.env.ADMIN_KEY || 'mingren-admin-2026';

// GET /api/admin/stats — Return registration stats
export async function GET(req: NextRequest) {
  const adminKey = req.nextUrl.searchParams.get('key') || req.headers.get('x-admin-key');
  if (adminKey !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const users = getAllUserRecords();

    // Filter out placeholder users (admin_ generated invite codes)
    const realUsers = users.filter(u => !u.email.startsWith('admin_'));

    // Today's registrations
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCount = realUsers.filter(u => u.createdAt.slice(0, 10) === todayStr).length;

    // Recent registrations (last 10)
    const recent = realUsers
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10)
      .map(u => ({
        email: u.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
        referralCode: u.referralCode,
        inviteCount: u.inviteCount,
        createdAt: u.createdAt,
      }));

    return NextResponse.json({
      totalUsers: realUsers.length,
      todayNewUsers: todayCount,
      recent,
    });
  } catch (e: any) {
    console.error('Admin stats error:', e);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
