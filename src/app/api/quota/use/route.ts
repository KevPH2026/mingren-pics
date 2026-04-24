import { NextRequest, NextResponse } from 'next/server';
import { useBonusQuota, getUser } from '@/lib/kv';

// POST /api/quota/use — 消耗一次配额（优先bonus）
export async function POST(req: NextRequest) {
  const userId = req.cookies.get('mingren_uid')?.value;

  if (!userId) {
    return NextResponse.json({ used: false, reason: 'not_registered' });
  }

  try {
    // 先尝试扣 bonus
    const usedBonus = await useBonusQuota(userId);
    if (usedBonus) {
      return NextResponse.json({ used: true, from: 'bonus' });
    }

    // bonus 不够，扣 daily（由前端 localStorage 管理）
    return NextResponse.json({ used: true, from: 'daily' });
  } catch {
    // KV 不可用，让前端用 localStorage
    return NextResponse.json({ used: true, from: 'daily' });
  }
}
