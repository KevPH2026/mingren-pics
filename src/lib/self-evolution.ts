import { kv } from '@vercel/kv';
import { isProd } from './auth';

// ===== 名人状态管理 =====
// 存储格式: celebrity_status:{celebrityId} = { disabled: boolean, failCount: number, lastFailAt: string, reason: string }

const STATUS_PREFIX = 'celebrity_status:';
const EVOLUTION_LOG_PREFIX = 'evolution_log:';

export interface CelebrityStatus {
  disabled: boolean;
  failCount: number;
  lastFailAt?: string;
  reason?: string;
  autoDisabledAt?: string;
}

// 获取名人状态
export async function getCelebrityStatus(celebrityId: string): Promise<CelebrityStatus | null> {
  // KV 暂时不可用，返回 null 让所有名人可用
  return null;
  // if (!isProd) return null; // 开发环境不启用
  // try {
  //   const status = await kv.get<CelebrityStatus>(`${STATUS_PREFIX}${celebrityId}`);
  //   return status;
  // } catch (e) {
  //   console.error('getCelebrityStatus error:', e);
  //   return null;
  // }
}

// 记录失败
export async function recordFailure(celebrityId: string, errorType: string, promptUsed: string): Promise<CelebrityStatus> {
  if (!isProd) return { disabled: false, failCount: 0 };
  
  const key = `${STATUS_PREFIX}${celebrityId}`;
  const now = new Date().toISOString();
  
  try {
    const existing = await kv.get<CelebrityStatus>(key);
    const newStatus: CelebrityStatus = {
      disabled: false,
      failCount: (existing?.failCount || 0) + 1,
      lastFailAt: now,
      reason: errorType,
    };
    
    // 连续失败3次自动下线
    if (newStatus.failCount >= 3) {
      newStatus.disabled = true;
      newStatus.autoDisabledAt = now;
      
      // 记录进化日志
      await kv.lpush(`${EVOLUTION_LOG_PREFIX}recent`, {
        celebrityId,
        action: 'auto_disabled',
        reason: errorType,
        failCount: newStatus.failCount,
        promptUsed: promptUsed.substring(0, 200),
        timestamp: now,
      });
      
      console.log(`[EVOLUTION] Celebrity ${celebrityId} auto-disabled after ${newStatus.failCount} failures. Reason: ${errorType}`);
    }
    
    await kv.set(key, newStatus);
    return newStatus;
  } catch (e) {
    console.error('recordFailure error:', e);
    return { disabled: false, failCount: 0 };
  }
}

// 记录成功（重置失败计数）
export async function recordSuccess(celebrityId: string): Promise<void> {
  if (!isProd) return;
  
  const key = `${STATUS_PREFIX}${celebrityId}`;
  try {
    const existing = await kv.get<CelebrityStatus>(key);
    if (existing && existing.failCount > 0) {
      await kv.set(key, {
        ...existing,
        failCount: 0,
        lastFailAt: undefined,
        reason: undefined,
      });
      console.log(`[EVOLUTION] Celebrity ${celebrityId} failure count reset after success`);
    }
  } catch (e) {
    console.error('recordSuccess error:', e);
  }
}

// 手动上线/下线名人（管理员用）
export async function setCelebrityStatus(celebrityId: string, disabled: boolean, reason?: string): Promise<void> {
  if (!isProd) return;
  
  const key = `${STATUS_PREFIX}${celebrityId}`;
  const now = new Date().toISOString();
  
  try {
    await kv.set(key, {
      disabled,
      failCount: 0,
      reason: reason || (disabled ? 'manual_disabled' : 'manual_enabled'),
      autoDisabledAt: disabled ? now : undefined,
    });
    
    await kv.lpush(`${EVOLUTION_LOG_PREFIX}recent`, {
      celebrityId,
      action: disabled ? 'manual_disabled' : 'manual_enabled',
      reason: reason || 'admin_action',
      timestamp: now,
    });
  } catch (e) {
    console.error('setCelebrityStatus error:', e);
  }
}

// 获取所有名人状态
export async function getAllCelebrityStatus(): Promise<Record<string, CelebrityStatus>> {
  if (!isProd) return {};
  
  try {
    const keys = await kv.keys(`${STATUS_PREFIX}*`);
    const result: Record<string, CelebrityStatus> = {};
    
    for (const key of keys) {
      const celebrityId = key.replace(STATUS_PREFIX, '');
      const status = await kv.get<CelebrityStatus>(key);
      if (status) {
        result[celebrityId] = status;
      }
    }
    
    return result;
  } catch (e) {
    console.error('getAllCelebrityStatus error:', e);
    return {};
  }
}

// 获取进化日志
export async function getEvolutionLogs(limit = 50): Promise<any[]> {
  if (!isProd) return [];
  
  try {
    const logs = await kv.lrange(`${EVOLUTION_LOG_PREFIX}recent`, 0, limit - 1);
    return logs || [];
  } catch (e) {
    console.error('getEvolutionLogs error:', e);
    return [];
  }
}

// 获取推荐替代名人（同类别中找在线的）
export async function getAlternativeCelebrity(
  disabledId: string,
  category: string,
  allCelebrityIds: string[]
): Promise<string | null> {
  if (!isProd) return null;
  
  try {
    // 找同类别的其他名人
    // 这里简化处理，实际应该从celebrities数据中获取同类别
    // 返回null让前端自己处理
    return null;
  } catch (e) {
    console.error('getAlternativeCelebrity error:', e);
    return null;
  }
}
