import { NextRequest, NextResponse } from 'next/server';
import { getQuota, getReferralInfo, getUser } from '@/lib/kv';

// GET /api/quota — 查询用户剩余次数
export async function GET(req: NextRequest) {
  const userId = req.cookies.get('mingren_uid')?.value;

  if (!userId) {
    return NextResponse.json({ registered: false, dailyLimit: 1, bonusQuota: 0, inviteCount: 0 });
  }

  try {
    const quota = await getQuota(userId);
    const user = await getUser(userId);
    return NextResponse.json({
      registered: true,
      dailyLimit: 3,
      bonusQuota: quota.bonusQuota,
      inviteCount: user?.inviteCount || 0,
      referralCode: user?.referralCode || '',
    });
  } catch {
    return NextResponse.json({ registered: true, dailyLimit: 3, bonusQuota: 0, inviteCount: 0 });
  }
}
