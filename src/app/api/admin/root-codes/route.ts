import { NextRequest, NextResponse } from 'next/server';
import { createRootInviteCodes, extractDisplayCode } from '@/lib/kv';

const ADMIN_KEY = process.env.ADMIN_KEY || 'mingren-admin-2026';

// POST /api/admin/root-codes — Generate root invite codes
export async function POST(req: NextRequest) {
  try {
    const { adminKey, count = 10 } = await req.json();

    if (adminKey !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tokens = createRootInviteCodes(count);
    const displays = tokens.map(extractDisplayCode);

    return NextResponse.json({ ok: true, tokens, displays, count: tokens.length });
  } catch (e: any) {
    console.error('Admin root-codes error:', e);
    return NextResponse.json({ error: '生成失败' }, { status: 500 });
  }
}
