import { kv } from '@vercel/kv';
import { createHmac } from 'crypto';

const SECRET = process.env.AUTH_SECRET || 'mingren-pics-dev-secret-2026';

export interface UserData {
  email: string;
  referralCode: string;
  bonusQuota: number;   // 邀请奖励次数（永久有效）
  inviteCount: number;  // 已邀请人数
  createdAt: string;
}

export function hashEmail(email: string): string {
  return createHmac('sha256', SECRET).update(email.toLowerCase()).digest('hex').slice(0, 12);
}

export function generateReferralCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function getUser(userId: string): Promise<UserData | null> {
  try {
    const data = await kv.get<UserData>(`user:${userId}`);
    return data;
  } catch {
    // KV not available yet
    return null;
  }
}

export async function createUser(email: string, referredBy?: string): Promise<{ userId: string; referralCode: string; bonusQuota: number }> {
  const userId = hashEmail(email);
  const referralCode = generateReferralCode();

  // Check if user already exists
  const existing = await getUser(userId);
  if (existing) {
    return { userId, referralCode: existing.referralCode, bonusQuota: existing.bonusQuota };
  }

  const userData: UserData = {
    email: email.toLowerCase(),
    referralCode,
    bonusQuota: 0,
    inviteCount: 0,
    createdAt: new Date().toISOString(),
  };

  try {
    await kv.set(`user:${userId}`, JSON.stringify(userData));

    // Handle referral: give bonus to referrer
    if (referredBy) {
      const referrerData = await kv.get<UserData>(`ref:${referredBy}`);
      if (referrerData) {
        // Find the referrer's user record and update bonus
        // We store ref -> userId mapping
        const referrerUserId = await kv.get<string>(`ref:${referredBy}:user`);
        if (referrerUserId) {
          const referrer = await kv.get<UserData>(`user:${referrerUserId}`);
          if (referrer) {
            referrer.bonusQuota += 3;
            referrer.inviteCount += 1;
            await kv.set(`user:${referrerUserId}`, JSON.stringify(referrer));
          }
        }
      }
    }
  } catch {
    // KV not available — fallback to no-op
  }

  return { userId, referralCode, bonusQuota: 0 };
}

export async function getQuota(userId: string): Promise<{ dailyLimit: number; bonusQuota: number }> {
  try {
    const data = await getUser(userId);
    return {
      dailyLimit: 3,
      bonusQuota: data?.bonusQuota || 0,
    };
  } catch {
    return { dailyLimit: 3, bonusQuota: 0 };
  }
}

export async function getReferralInfo(referralCode: string): Promise<{ bonusQuota: number; inviteCount: number } | null> {
  try {
    // Find userId by referral code
    const userId = await kv.get<string>(`ref:${referralCode}:user`);
    if (!userId) return null;
    const data = await getUser(userId);
    return data ? { bonusQuota: data.bonusQuota, inviteCount: data.inviteCount } : null;
  } catch {
    return null;
  }
}

export async function useBonusQuota(userId: string): Promise<boolean> {
  try {
    const data = await getUser(userId);
    if (!data || data.bonusQuota <= 0) return false;
    data.bonusQuota -= 1;
    await kv.set(`user:${userId}`, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
