import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

const SECRET = process.env.AUTH_SECRET || 'mingren-pics-dev-secret-2026';
export const isProd = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';

// ===== Session token (deterministic, verifiable) =====
export function signToken(userId: string): string {
  return createHmac('sha256', SECRET).update(`session:${userId}`).digest('hex').slice(0, 32);
}

export interface AuthResult {
  ok: boolean;
  email?: string;
  userId?: string;
  referralCode?: string;
}

export function isAuthenticated(req: NextRequest): AuthResult {
  const uid = req.cookies.get('mingren_uid')?.value;
  const sig = req.cookies.get('mingren_sig')?.value;
  const email = req.cookies.get('mingren_email')?.value;
  const referralCode = req.cookies.get('mingren_ref')?.value;

  if (!uid || !sig || !email) return { ok: false };

  const expectedSig = signToken(uid);
  if (sig !== expectedSig) return { ok: false };

  return { ok: true, email, userId: uid, referralCode };
}

// ===== Cookie options =====
export function authCookieOpts() {
  return { httpOnly: true, secure: isProd, maxAge: 365 * 24 * 3600, path: '/' as const, sameSite: 'lax' as const };
}

export function publicCookieOpts() {
  return { httpOnly: false, secure: isProd, maxAge: 365 * 24 * 3600, path: '/' as const, sameSite: 'lax' as const };
}

// ===== Signed quota cookie (tamper-proof daily usage tracking) =====
export interface QuotaData {
  d: string; // date YYYY-MM-DD
  c: number; // daily count
  b: number; // bonus quota
}

export function signQuota(data: QuotaData): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 16);
  return `${payload}.${sig}`;
}

export function verifyQuota(token: string): QuotaData | null {
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return null;
    const payload = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    const expectedSig = createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 16);
    if (sig !== expectedSig) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
}

export function getTodayStr(): string {
  const now = new Date();
  const offset = 8 * 60; // UTC+8
  const local = new Date(now.getTime() + (now.getTimezoneOffset() + offset) * 60000);
  return local.toISOString().slice(0, 10);
}
