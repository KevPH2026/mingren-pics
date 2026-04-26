import { NextRequest, NextResponse } from 'next/server';
import { scryptSync, timingSafeEqual } from 'crypto';
import { authCookieOpts } from '@/lib/auth';

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const ADMIN_KEY = process.env.ADMIN_KEY || 'mingren-admin-2026';
const SESSION_SECRET = process.env.AUTH_SECRET || 'mingren-pics-dev-secret-2026';

// 验证管理员密码（使用 scrypt 哈希，和主站密码系统一致）
function verifyAdminPassword(password: string): boolean {
  // 优先使用环境变量中的哈希密码
  const hashEnv = (process.env.ADMIN_PASSWORD_HASH || '').trim();
  if (hashEnv && hashEnv.includes('.')) {
    try {
      const [salt, hash] = hashEnv.split('.');
      if (!salt || !hash) return false;
      const derived = scryptSync(password, Buffer.from(salt, 'hex'), 64).toString('hex');
      const hashBuf = Buffer.from(hash, 'hex');
      const derivedBuf = Buffer.from(derived, 'hex');
      if (hashBuf.length !== derivedBuf.length) return false;
      return timingSafeEqual(hashBuf, derivedBuf);
    } catch {
      // 哈希验证失败，fallback 到 ADMIN_KEY
    }
  }
  
  // Fallback: 用 ADMIN_KEY 做简单验证
  const key = (process.env.ADMIN_KEY || 'mingren-admin-2026').trim();
  return password.trim() === key;
}

// 生成管理员 session token
function createAdminSession(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `admin_${timestamp}_${random}`;
}

// 验证管理员 session
export function isAdminSession(req: NextRequest): boolean {
  const session = req.cookies.get('mingren_admin_session')?.value;
  if (!session || !session.startsWith('admin_')) return false;
  
  // 检查 session 是否过期（24小时）
  const parts = session.split('_');
  if (parts.length < 2) return false;
  
  const timestamp = parseInt(parts[1], 36);
  const now = Date.now();
  if (now - timestamp > 24 * 60 * 60 * 1000) return false;
  
  return true;
}

// 中间件：检查管理员权限
export function requireAdmin(req: NextRequest): { ok: boolean; response?: NextResponse } {
  if (!isAdminSession(req)) {
    return { 
      ok: false, 
      response: NextResponse.json({ error: 'Unauthorized', redirect: '/admin/login' }, { status: 401 }) 
    };
  }
  return { ok: true };
}

// POST /api/admin/login — 管理员登录
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: '密码不能为空' }, { status: 400 });
    }
    
    if (!verifyAdminPassword(password)) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }
    
    // 创建 session
    const session = createAdminSession();
    const response = NextResponse.json({ success: true });
    
    // 设置 cookie
    response.cookies.set('mingren_admin_session', session, {
      ...authCookieOpts(),
      maxAge: 24 * 60 * 60, // 24小时
    });
    
    return response;
  } catch (e: any) {
    console.error('Admin login error:', e);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}

// POST /api/admin/logout — 管理员退出
export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.set('mingren_admin_session', '', { maxAge: 0, path: '/' });
  return response;
}
