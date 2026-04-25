import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getAllUserRecords } from '@/lib/user-store';

const ADMIN_KEY = process.env.ADMIN_KEY || 'mingren-admin-2026';
const DATA_DIR = '/tmp/mingren-pics';
const GENERATIONS_FILE = join(DATA_DIR, 'generations.json');

interface GenRecord {
  timestamp: string;
  email?: string; // undefined for anonymous
  celebId?: string;
  scenarioId?: string;
  success: boolean;
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadGenerations(): GenRecord[] {
  try {
    if (existsSync(GENERATIONS_FILE)) return JSON.parse(readFileSync(GENERATIONS_FILE, 'utf-8'));
  } catch {}
  return [];
}

// Export for generate/start to call
export function trackGeneration(record: GenRecord) {
  ensureDataDir();
  const gens = loadGenerations();
  gens.push(record);
  // Keep last 1000 records only
  if (gens.length > 1000) gens.splice(0, gens.length - 1000);
  writeFileSync(GENERATIONS_FILE, JSON.stringify(gens), 'utf-8');
}

// GET /api/admin/stats — Return registration + usage stats
export async function GET(req: NextRequest) {
  const adminKey = req.nextUrl.searchParams.get('key') || req.headers.get('x-admin-key');
  if (adminKey !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const users = getAllUserRecords();
    const realUsers = users.filter(u => !u.email.startsWith('admin_'));
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayUsers = realUsers.filter(u => u.createdAt.slice(0, 10) === todayStr).length;

    const recent = realUsers
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10)
      .map(u => ({
        email: u.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
        referralCode: u.referralCode,
        inviteCount: u.inviteCount,
        createdAt: u.createdAt,
      }));

    // Generation stats
    const gens = loadGenerations();
    const todayGens = gens.filter(g => g.timestamp.slice(0, 10) === todayStr);
    const todaySuccess = todayGens.filter(g => g.success).length;
    const todayFailed = todayGens.filter(g => !g.success).length;
    const totalGens = gens.filter(g => g.success).length;

    // Page visits (approximate from quota API calls — not tracked, skip)
    // Recent generations
    const recentGens = gens
      .slice(-10)
      .reverse()
      .map(g => ({
        time: g.timestamp,
        user: g.email ? g.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '匿名用户',
        celeb: g.celebId || '-',
        success: g.success,
      }));

    return NextResponse.json({
      // Users
      totalUsers: realUsers.length,
      todayNewUsers: todayUsers,
      recentUsers: recent,
      // Generations
      totalGenerations: totalGens,
      todayGenerations: todaySuccess,
      todayFailed,
      recentGenerations: recentGens,
    });
  } catch (e: any) {
    console.error('Admin stats error:', e);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
