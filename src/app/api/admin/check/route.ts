import { NextRequest, NextResponse } from 'next/server';
import { isAdminSession } from '../login/route';

// GET /api/admin/check — 检查管理员登录状态
export async function GET(req: NextRequest) {
  if (isAdminSession(req)) {
    return NextResponse.json({ authenticated: true });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}
