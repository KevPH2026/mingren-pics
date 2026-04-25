export interface UserRecord {
  hash: string;
  salt: string;
  email: string;
  referralCode: string;
  inviteCount: number;
  createdAt: string;
}

export interface TempTokenEntry {
  email: string;
  expires: number; // Date.now() + 10 * 60 * 1000
  referralCode?: string; // invite code from ?ref= parameter
}

// In-memory stores (MVP — resets on server restart)
const userMap = new Map<string, UserRecord>();
const tempTokens = new Map<string, TempTokenEntry>();
const referralLookup = new Map<string, string>(); // displayCode → ownerEmail

export function createUserRecord(
  email: string,
  hash: string,
  salt: string,
  referralCode: string,
): UserRecord {
  const record: UserRecord = {
    hash,
    salt,
    email,
    referralCode,
    inviteCount: 0,
    createdAt: new Date().toISOString(),
  };
  userMap.set(email, record);
  // Register referral code for lookup
  referralLookup.set(referralCode, email);
  return record;
}

export function getUserRecord(email: string): UserRecord | undefined {
  return userMap.get(email);
}

export function getReferralOwner(displayCode: string): string | undefined {
  return referralLookup.get(displayCode);
}

export function incrementInviteCount(email: string): number {
  const record = userMap.get(email);
  if (!record) return 0;
  record.inviteCount++;
  return record.inviteCount;
}

export function registerReferralCode(referralCode: string, email: string): void {
  referralLookup.set(referralCode, email);
}

export function setTempToken(email: string, referralCode?: string): string {
  const token = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  tempTokens.set(token, {
    email,
    expires: Date.now() + 10 * 60 * 1000,
    referralCode,
  });
  return token;
}

export function getTempTokenEntry(token: string): TempTokenEntry | undefined {
  const entry = tempTokens.get(token);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    tempTokens.delete(token);
    return undefined;
  }
  return entry;
}

export function verifyTempToken(token: string): string | null {
  const entry = getTempTokenEntry(token);
  return entry?.email || null;
}

export function clearTempToken(token: string): void {
  tempTokens.delete(token);
}
