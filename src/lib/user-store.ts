import { kv } from '@vercel/kv';
import { createHmac } from 'crypto';

const SECRET = process.env.AUTH_SECRET || 'mingren-pics-dev-secret-2026';

export function hashEmail(email: string): string {
  return createHmac('sha256', SECRET).update(email.toLowerCase()).digest('hex').slice(0, 12);
}

export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const KEYS = {
  users: 'users_v1',
  generations: 'generations_v1',
  visits: 'visits_v1',
} as const;

interface UserRecord {
  hash: string;
  salt: string;
  email: string;
  referralCode: string;
  inviteCount: number;
  createdAt: string;
}

interface GenRecord {
  timestamp: string;
  email?: string;
  celebId?: string;
  scenarioId?: string;
  success: boolean;
  imageUrl?: string;
  userImageUrl?: string;
}

// In-memory cache with hydration
let cache: {
  users: Map<string, UserRecord>;
  generations: GenRecord[];
  hydrated: boolean;
} = {
  users: new Map(),
  generations: [],
  hydrated: false,
};

async function getKVData<T>(key: string): Promise<T | undefined> {
  try {
    const data = await kv.get<T>(key);
    return data ?? undefined;
  } catch (e) {
    console.error('KV get error:', e);
    return undefined;
  }
}

async function setKVData<T>(key: string, value: T): Promise<void> {
  try {
    await kv.set(key, value);
  } catch (e) {
    console.error('KV set error:', e);
  }
}

async function ensureHydrated() {
  if (cache.hydrated) return;
  try {
    const usersData = await getKVData<Record<string, UserRecord>>(KEYS.users);
    if (usersData) {
      cache.users = new Map(Object.entries(usersData));
    }
    const genData = await getKVData<GenRecord[]>(KEYS.generations);
    if (genData) {
      cache.generations = genData;
    }
    cache.hydrated = true;
  } catch (e) {
    console.error('Hydrate error:', e);
    cache.hydrated = true;
  }
}

async function persistUsers() {
  const obj = Object.fromEntries(cache.users.entries());
  await setKVData(KEYS.users, obj);
}

async function persistGenerations() {
  const trimmed = cache.generations.slice(-500);
  await setKVData(KEYS.generations, trimmed);
}

// User operations
export async function createUserRecord(
  email: string,
  hash: string,
  salt: string,
  referralCode: string,
): Promise<UserRecord> {
  await ensureHydrated();
  const record: UserRecord = {
    hash,
    salt,
    email,
    referralCode,
    inviteCount: 0,
    createdAt: new Date().toISOString(),
  };
  cache.users.set(email, record);
  await persistUsers();
  return record;
}

export async function getUserRecord(email: string): Promise<UserRecord | undefined> {
  await ensureHydrated();
  return cache.users.get(email);
}

export async function getReferralOwner(displayCode: string): Promise<string | undefined> {
  await ensureHydrated();
  for (const [email, user] of cache.users.entries()) {
    if (user.referralCode === displayCode) return email;
  }
  return undefined;
}

export async function incrementInviteCount(email: string): Promise<number> {
  await ensureHydrated();
  const record = cache.users.get(email);
  if (!record) return 0;
  record.inviteCount++;
  await persistUsers();
  return record.inviteCount;
}

export async function registerReferralCode(referralCode: string, email: string): Promise<void> {
  await ensureHydrated();
  const user = cache.users.get(email);
  if (user) {
    user.referralCode = referralCode;
    await persistUsers();
  }
}

export async function getAllUserRecords(): Promise<UserRecord[]> {
  await ensureHydrated();
  return Array.from(cache.users.values());
}

// Generation tracking
export async function trackGeneration(record: GenRecord): Promise<void> {
  await ensureHydrated();
  cache.generations.push(record);
  await persistGenerations();
}

export async function getGenerations(): Promise<GenRecord[]> {
  await ensureHydrated();
  return [...cache.generations];
}

// Visit tracking
export interface VisitRecord {
  timestamp: string;
  ip: string;
  path: string;
  ua?: string;
  referer?: string;
}

export async function trackVisit(record: VisitRecord): Promise<void> {
  try {
    // Use KV list to store visits - push to a list with 7 day TTL
    await kv.lpush(KEYS.visits, record);
    // Trim to last 10000 entries to prevent unbounded growth
    await kv.ltrim(KEYS.visits, 0, 9999);
    // Set TTL on the list key (7 days)
    await kv.expire(KEYS.visits, 7 * 24 * 60 * 60);
  } catch (e) {
    console.error('Track visit error:', e);
  }
}

export async function getVisits(limit = 1000): Promise<VisitRecord[]> {
  try {
    const visits = await kv.lrange<VisitRecord>(KEYS.visits, 0, limit - 1);
    return visits || [];
  } catch (e) {
    console.error('Get visits error:', e);
    return [];
  }
}

export async function getVisitStats(): Promise<{
  totalVisits: number;
  todayVisits: number;
  onlineUsers: number;
  uniqueIPs: number;
  topPaths: Array<{ path: string; count: number }>;
}> {
  try {
    const visits = await getVisits(10000);
    const now = Date.now();
    const todayStr = new Date().toISOString().slice(0, 10);
    
    // Online = active in last 5 minutes
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const onlineSet = new Set<string>();
    const todayCount = visits.filter(v => v.timestamp.slice(0, 10) === todayStr).length;
    const allIPs = new Set(visits.map(v => v.ip));
    
    // Count unique IPs in last 5 minutes
    for (const v of visits) {
      const ts = new Date(v.timestamp).getTime();
      if (ts > fiveMinutesAgo) {
        onlineSet.add(v.ip);
      }
    }
    
    // Top paths
    const pathCounts: Record<string, number> = {};
    for (const v of visits) {
      pathCounts[v.path] = (pathCounts[v.path] || 0) + 1;
    }
    const topPaths = Object.entries(pathCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));
    
    return {
      totalVisits: visits.length,
      todayVisits: todayCount,
      onlineUsers: onlineSet.size,
      uniqueIPs: allIPs.size,
      topPaths,
    };
  } catch (e) {
    console.error('Get visit stats error:', e);
    return { totalVisits: 0, todayVisits: 0, onlineUsers: 0, uniqueIPs: 0, topPaths: [] };
  }
}
// Temp tokens (keep in-memory, short-lived)
interface TempTokenEntry {
  email: string;
  expires: number;
  referralCode?: string;
}

const tempTokens = new Map<string, TempTokenEntry>();

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
