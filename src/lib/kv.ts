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
