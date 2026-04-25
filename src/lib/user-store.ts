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

// Persistent user store (survives cold starts via /tmp + fs)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = '/tmp/mingren-pics';
const USERS_FILE = join(DATA_DIR, 'users.json');
const REFERRALS_FILE = join(DATA_DIR, 'referrals.json');

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadJSON<T>(file: string, fallback: T): T {
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf-8'));
  } catch {}
  return fallback;
}

function saveJSON(file: string, data: unknown) {
  ensureDataDir();
  writeFileSync(file, JSON.stringify(data), 'utf-8');
}

// In-memory stores — hydrated from disk on first access
let userMap: Map<string, UserRecord>;
let referralLookup: Map<string, string>;

function ensureLoaded() {
  if (!userMap) {
    userMap = new Map<string, UserRecord>(loadJSON<[string, UserRecord][]>(USERS_FILE, []));
    referralLookup = new Map<string, string>(loadJSON<[string, string][]>(REFERRALS_FILE, []));
  }
}

function persistUsers() {
  ensureLoaded();
  saveJSON(USERS_FILE, Array.from(userMap.entries()));
  saveJSON(REFERRALS_FILE, Array.from(referralLookup.entries()));
}

const tempTokens = new Map<string, TempTokenEntry>();

export function createUserRecord(
  email: string,
  hash: string,
  salt: string,
  referralCode: string,
): UserRecord {
  ensureLoaded();
  const record: UserRecord = {
    hash,
    salt,
    email,
    referralCode,
    inviteCount: 0,
    createdAt: new Date().toISOString(),
  };
  userMap.set(email, record);
  referralLookup.set(referralCode, email);
  persistUsers();
  return record;
}

export function getUserRecord(email: string): UserRecord | undefined {
  ensureLoaded();
  return userMap.get(email);
}

export function getReferralOwner(displayCode: string): string | undefined {
  return referralLookup.get(displayCode);
}

export function incrementInviteCount(email: string): number {
  ensureLoaded();
  const record = userMap.get(email);
  if (!record) return 0;
  record.inviteCount++;
  persistUsers();
  return record.inviteCount;
}

export function registerReferralCode(referralCode: string, email: string): void {
  ensureLoaded();
  referralLookup.set(referralCode, email);
  persistUsers();
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

export function getAllUserRecords(): UserRecord[] {
  ensureLoaded();
  return Array.from(userMap.values());
}
