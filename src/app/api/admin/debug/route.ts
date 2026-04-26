import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/debug — 检查环境变量（仅用于调试，后续删除）
export async function GET(req: NextRequest) {
  // 简单鉴权：只允许本地或特定 IP
  const adminKey = req.nextUrl.searchParams.get('key');
  if (adminKey !== 'mingren-admin-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  return NextResponse.json({
    adminKeyExists: !!process.env.ADMIN_KEY,
    adminKeyLength: process.env.ADMIN_KEY?.length || 0,
    adminKeyPrefix: process.env.ADMIN_KEY?.slice(0, 5) || 'none',
    adminPasswordHashExists: !!process.env.ADMIN_PASSWORD_HASH,
    nodeEnv: process.env.NODE_ENV,
  });
}
