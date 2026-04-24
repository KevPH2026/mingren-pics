export interface UserRecord {
  hash: string;
  salt: string;
  email: string;
  referralCode: string;
  inviteCount: number;
  createdAt: string;
}

interface TempTokenEntry {
  email: string;
  expires: number; // Date.now() + 10 * 60 * 1000
}

// In-memory stores (MVP — resets on server restart)
const userMap = new Map<string, UserRecord>();
const tempTokens = new Map<string, TempTokenEntry>();

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
  return record;
}

export function getUserRecord(email: string): UserRecord | undefined {
  return userMap.get(email);
}

export function updateUserPassword(email: string, hash: string, salt: string): UserRecord | undefined {
  const record = userMap.get(email);
  if (!record) return undefined;
  record.hash = hash;
  record.salt = salt;
  return record;
}

export function setTempToken(email: string): string {
  const token = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  tempTokens.set(token, {
    email,
    expires: Date.now() + 10 * 60 * 1000, // 10 minutes
  });
  return token;
}

export function verifyTempToken(token: string): string | null {
  const entry = tempTokens.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    tempTokens.delete(token);
    return null;
  }
  return entry.email;
}

export function clearTempToken(token: string): void {
  tempTokens.delete(token);
}
