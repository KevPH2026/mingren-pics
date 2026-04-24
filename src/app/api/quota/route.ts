import { NextRequest, NextResponse } from 'next/server';

// GET /api/quota — 查询用户剩余次数和邀请码
export async function GET(req: NextRequest) {
  const userId = req.cookies.get('mingren_uid')?.value;
  const email = req.cookies.get('mingren_email')?.value;
  const referralCode = req.cookies.get('mingren_ref')?.value || '';

  if (!userId || !email) {
    return NextResponse.json({ registered: false, dailyLimit: 1, bonusQuota: 0, inviteCount: 0 });
  }

  return NextResponse.json({
    registered: true,
    dailyLimit: 3,
    bonusQuota: 0,
    inviteCount: 0,
    referralCode,
    email,
  });
}
