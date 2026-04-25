import { NextRequest, NextResponse } from 'next/server';
import { generateReferralCode } from '@/lib/kv';
import { createUserRecord } from '@/lib/user-store';
import { hashEmail } from '@/lib/kv';
import { hashPassword } from '@/lib/password';

const ADMIN_KEY = process.env.ADMIN_KEY || 'mingren-admin-2026';

// POST /api/admin/root-codes — Generate batch invite codes
export async function POST(req: NextRequest) {
  try {
    const { adminKey, count = 10, email, password } = await req.json();

    if (adminKey !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const results: { code: string; assignedTo?: string }[] = [];

    for (let i = 0; i < count; i++) {
      const code = generateReferralCode();

      // If email + password provided, auto-create user with this code
      if (email && password) {
        const normalizedEmail = email.toLowerCase();
        const { hash, salt } = hashPassword(password);
        await createUserRecord(normalizedEmail, hash, salt, code);
        results.push({ code, assignedTo: normalizedEmail });
      } else {
        // Just generate the code (can be distributed manually)
        // Register a placeholder so the code is tracked
        const placeholderEmail = `admin_${code.toLowerCase()}@placeholder.local`;
        const { hash, salt } = hashPassword(Math.random().toString(36));
        await createUserRecord(placeholderEmail, hash, salt, code);
        results.push({ code });
      }
    }

    return NextResponse.json({ ok: true, codes: results, count: results.length });
  } catch (e: any) {
    console.error('Admin root-codes error:', e);
    return NextResponse.json({ error: '生成失败' }, { status: 500 });
  }
}
