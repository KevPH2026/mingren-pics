// Pure REST API approach — no SDK needed, works in all environments
const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID || '';
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || '';

const KEYS = {
  users: 'users_v1',
  generations: 'generations_v1',
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

async function edgeConfigGet<T>(key: string): Promise<T | undefined> {
  if (!EDGE_CONFIG_ID || !VERCEL_TOKEN) return undefined;
  try {
    const resp = await fetch(`https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_ID}/item/${key}`, {
      headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return undefined;
    const data = await resp.json();
    return data?.value as T;
  } catch (e) {
    console.error('EdgeConfig get error:', e);
    return undefined;
  }
}

async function edgeConfigSet(key: string, value: unknown): Promise<void> {
  if (!EDGE_CONFIG_ID || !VERCEL_TOKEN) return;
  try {
    await fetch(`https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_ID}/items`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ operation: 'upsert', key, value }]
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.error('EdgeConfig set error:', e);
  }
}

async function ensureHydrated() {
  if (cache.hydrated) return;
  try {
    const usersData = await edgeConfigGet<Record<string, UserRecord>>(KEYS.users);
    if (usersData) {
      cache.users = new Map(Object.entries(usersData));
    }
    const genData = await edgeConfigGet<GenRecord[]>(KEYS.generations);
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
  await edgeConfigSet(KEYS.users, obj);
}

async function persistGenerations() {
  const trimmed = cache.generations.slice(-500);
  await edgeConfigSet(KEYS.generations, trimmed);
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
