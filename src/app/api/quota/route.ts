import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, verifyQuota, getTodayStr } from '@/lib/auth';
import { getUserRecord } from '@/lib/user-store';

// GET /api/quota — query user quota from signed cookie + user record
export async function GET(req: NextRequest) {
  const auth = isAuthenticated(req);

  // Read quota from signed cookie
  const usageCookie = req.cookies.get('mingren_usage')?.value;
  const quota = usageCookie ? verifyQuota(usageCookie) : null;
  const today = getTodayStr();
  const count = quota?.d === today ? quota.c : 0;
  const bonus = quota?.b || 0;

  const dailyLimit = auth.ok ? 3 : 1;
  const remaining = Math.max(0, dailyLimit + bonus - count);

  // Get invite count from user record (in-memory)
  let inviteCount = 0;
  if (auth.ok && auth.email) {
    const user = getUserRecord(auth.email);
    if (user) inviteCount = user.inviteCount;
  }

  return NextResponse.json({
    registered: auth.ok,
    email: auth.email || undefined,
    dailyLimit,
    usedToday: count,
    bonusQuota: bonus,
    remaining,
    referralCode: auth.referralCode || undefined,
    inviteCount,
  });
}

// POST /api/quota/use — manually consume one quota (kept for compatibility)
export async function POST(req: NextRequest) {
  const auth = isAuthenticated(req);
  const dailyLimit = auth.ok ? 3 : 1;

  const usageCookie = req.cookies.get('mingren_usage')?.value;
  const quota = usageCookie ? verifyQuota(usageCookie) : null;
  const today = getTodayStr();
  const count = quota?.d === today ? quota.c : 0;
  const bonus = quota?.b || 0;

  if (dailyLimit + bonus - count <= 0) {
    return NextResponse.json({ used: false, reason: 'quota_exceeded' });
  }

  // Note: actual quota is now decremented in /api/generate/start
  // This endpoint is a no-op kept for backward compatibility
  return NextResponse.json({ used: true, from: 'daily' });
}
