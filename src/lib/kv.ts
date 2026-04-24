import { createHmac } from 'crypto';

// Conditional KV import — won't crash if KV store isn't created yet
let kv: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  kv = require('@vercel/kv').kv;
} catch {
  // KV not configured yet
}

const SECRET = process.env.JWT_SECRET || 'mingren-pics-dev-secret-2026';

export interface UserData {
  email: string;
  referralCode: string;
  childCodes: string[];
  bonusQuota: number;
  inviteCount: number;
  parentCode: string | null;
  createdAt: string;
}

export interface InviteCode {
  code: string;
  ownerUserId: string;
  createdBy: string;
  usesLeft: number;
  maxUses: number;
  level: number;
}

export function hashEmail(email: string): string {
  return createHmac('sha256', SECRET).update(email.toLowerCase()).digest('hex').slice(0, 12);
}

export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function kvGet(key: string): Promise<any> {
  if (!kv) return null;
  try { return await kv.get(key); } catch { return null; }
}

async function kvSet(key: string, value: string): Promise<void> {
  if (!kv) return;
  try { await kv.set(key, value); } catch {}
}

export async function getUser(userId: string): Promise<UserData | null> {
  try {
    const raw = await kvGet(`user:${userId}`);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

export async function createRootInviteCode(count: number = 10): Promise<string[]> {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = generateCode();
    const data: InviteCode = { code, ownerUserId: 'root', createdBy: 'root', usesLeft: 3, maxUses: 3, level: 0 };
    await kvSet(`invite:${code}`, JSON.stringify(data));
    await kvSet(`invite:${code}:user`, 'root');
    codes.push(code);
  }
  return codes;
}

async function createChildCodes(userId: string, level: number): Promise<string[]> {
  const childCodes: string[] = [];
  for (let i = 0; i < 3; i++) {
    const code = generateCode();
    const data: InviteCode = { code, ownerUserId: userId, createdBy: userId, usesLeft: 3, maxUses: 3, level };
    await kvSet(`invite:${code}`, JSON.stringify(data));
    await kvSet(`invite:${code}:user`, userId);
    childCodes.push(code);
  }
  return childCodes;
}

export async function createUser(email: string, inviteCode?: string): Promise<{
  userId: string;
  referralCode: string;
  childCodes: string[];
  bonusQuota: number;
}> {
  const userId = hashEmail(email);
  const existing = await getUser(userId);
  if (existing) {
    return { userId, referralCode: existing.referralCode, childCodes: existing.childCodes, bonusQuota: existing.bonusQuota };
  }

  const referralCode = generateCode();
  let parentCode: string | null = null;
  let childCodes: string[] = [];
  let parentLevel = 0;

  // Validate invite code
  if (inviteCode) {
    const raw = await kvGet(`invite:${inviteCode}`);
    if (raw) {
      const codeData: InviteCode = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (codeData.usesLeft > 0) {
        codeData.usesLeft -= 1;
        await kvSet(`invite:${inviteCode}`, JSON.stringify(codeData));
        parentCode = inviteCode;
        parentLevel = codeData.level + 1;

        // Reward inviter
        const inviterId = await kvGet(`invite:${inviteCode}:user`);
        if (inviterId && inviterId !== 'root') {
          const inviter = await getUser(inviterId);
          if (inviter) {
            inviter.bonusQuota += 3;
            inviter.inviteCount += 1;
            await kvSet(`user:${inviterId}`, JSON.stringify(inviter));
          }
        }
      }
    }
  }

  // Generate 3 child codes for new user
  childCodes = await createChildCodes(userId, parentLevel || 1);

  const userData: UserData = {
    email: email.toLowerCase(),
    referralCode,
    childCodes,
    bonusQuota: 3,
    inviteCount: 0,
    parentCode,
    createdAt: new Date().toISOString(),
  };

  await kvSet(`user:${userId}`, JSON.stringify(userData));
  await kvSet(`ref:${referralCode}:user`, userId);

  return { userId, referralCode, childCodes, bonusQuota: 3 };
}

export async function getQuota(userId: string): Promise<{ dailyLimit: number; bonusQuota: number }> {
  const data = await getUser(userId);
  return { dailyLimit: 3, bonusQuota: data?.bonusQuota || 0 };
}

export async function useBonusQuota(userId: string): Promise<boolean> {
  const data = await getUser(userId);
  if (!data || data.bonusQuota <= 0) return false;
  data.bonusQuota -= 1;
  await kvSet(`user:${userId}`, JSON.stringify(data));
  return true;
}

export async function getUserCodes(userId: string): Promise<string[]> {
  const user = await getUser(userId);
  if (!user) return [];
  return [user.referralCode, ...user.childCodes];
}
