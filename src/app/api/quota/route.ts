import { NextRequest, NextResponse } from 'next/server';
import { getQuota, getUser } from '@/lib/kv';

// GET /api/quota — 查询用户剩余次数
export async function GET(req: NextRequest) {
  const userId = req.cookies.get('mingren_uid')?.value;
  const email = req.cookies.get('mingren_email')?.value;

  if (!userId || !email) {
    return NextResponse.json({ registered: false, dailyLimit: 1, bonusQuota: 0, inviteCount: 0 });
  }

  // 有有效 cookie 就认已注册（不依赖 KV 做注册判断）
  try {
    const quota = await getQuota(userId);
    const user = await getUser(userId);
    return NextResponse.json({
      registered: true,
      dailyLimit: 3,
      bonusQuota: quota.bonusQuota,
      inviteCount: user?.inviteCount || 0,
      referralCode: user?.referralCode || '',
      childCodes: user?.childCodes || [],
      email,
    });
  } catch {
    // KV 不可用时，仍返回已注册状态，bonus 为 0
    return NextResponse.json({ registered: true, dailyLimit: 3, bonusQuota: 0, inviteCount: 0, childCodes: [], email });
  }
}
