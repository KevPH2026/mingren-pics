import { createHmac } from 'crypto';

const SECRET = process.env.AUTH_SECRET || 'mingren-pics-dev-secret-2026';

export interface UserData {
  email: string;
  referralCode: string;
  bonusQuota: number;
  inviteCount: number;
  createdAt: string;
}

export interface InvitePayload {
  code: string;
  ownerEmail: string;
  usesLeft: number;
  maxUses: number;
  level: number;
  ts: number; // creation timestamp
}

export function hashEmail(email: string): string {
  return createHmac('sha256', SECRET).update(email.toLowerCase()).digest('hex').slice(0, 12);
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// HMAC sign a payload object
function signPayload(payload: InvitePayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(data).digest('hex').slice(0, 16);
  return `${data}.${sig}`;
}

// Verify and decode a signed invite code
function verifyAndDecode(token: string): InvitePayload | null {
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return null;
    const data = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    const expectedSig = createHmac('sha256', SECRET).update(data).digest('hex').slice(0, 16);
    if (sig !== expectedSig) return null;
    return JSON.parse(Buffer.from(data, 'base64url').toString());
  } catch {
    return null;
  }
}

// Create root invite codes (admin use)
export function createRootInviteCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = generateCode();
    const payload: InvitePayload = {
      code,
      ownerEmail: 'root',
      usesLeft: 999,
      maxUses: 999,
      level: 0,
      ts: Date.now(),
    };
    codes.push(signPayload(payload));
  }
  return codes;
}

// Extract the 6-char display code from a signed token
export function extractDisplayCode(token: string): string {
  const payload = verifyAndDecode(token);
  return payload?.code || token.slice(0, 6).toUpperCase();
}

// Verify an invite code and return its payload (with usesLeft decremented)
export function verifyInviteCode(token: string): InvitePayload | null {
  const payload = verifyAndDecode(token);
  if (!payload) return null;
  if (payload.usesLeft <= 0) return null;
  // Return with decremented usesLeft (stateless — caller must issue new token if needed)
  return { ...payload, usesLeft: payload.usesLeft - 1 };
}

// Create user (no KV needed — returns user data)
export async function createUser(email: string, inviteCodeToken?: string): Promise<{
  userId: string;
  referralCode: string;
  bonusQuota: number;
  inviteReward: number;
}> {
  const userId = hashEmail(email);
  const referralCode = generateCode();
  let inviteReward = 0;

  // Verify invite code
  if (inviteCodeToken) {
    const payload = verifyInviteCode(inviteCodeToken);
    if (payload) {
      inviteReward = 3; // inviter gets 3 bonus quota (tracked client-side / in future DB)
    }
  }

  return {
    userId,
    referralCode,
    bonusQuota: 3,
    inviteReward,
  };
}

export async function getQuota(userId: string): Promise<{ dailyLimit: number; bonusQuota: number }> {
  // Without persistent storage, bonus is tracked client-side via cookies
  return { dailyLimit: 3, bonusQuota: 0 };
}

export async function getUser(userId: string): Promise<UserData | null> {
  // Without persistent storage, return null
  return null;
}

export async function useBonusQuota(userId: string): Promise<boolean> {
  // Without persistent storage, always false
  return false;
}
