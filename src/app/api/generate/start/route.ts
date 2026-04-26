import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, verifyQuota, signQuota, getTodayStr, isProd } from '@/lib/auth';
import { trackGeneration } from '@/lib/user-store';
import { getCelebrityStatus, recordFailure, recordSuccess } from '@/lib/self-evolution';
import { celebrities } from '@/lib/celebrities';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const NOVA_BASE = 'https://www.novartspace.art';
const getApiKey = () => process.env.NOVA_API_KEY || '';
const FREE_LIMIT = 6;
const REG_LIMIT = 3;
const MAX_RETRIES = 1; // 最多1次重试（避免触发Nova封号）
const MAX_VARIANT_RETRIES = 1; // 最多1套prompt变体

function serverError(msg = '服务异常，请稍后重试', status = 500, code = 'SERVER_ERROR') {
  return NextResponse.json({ error: msg, code }, { status, headers: { 'Content-Type': 'application/json' } });
}

// ===== Prompt优化策略 =====
function optimizePrompt(originalPrompt: string, errorType: string, attempt: number): string {
  let optimized = originalPrompt;
  
  if (errorType === 'CONTENT_BLOCKED' || attempt > 1) {
    // 移除可能触发审核的词汇
    const sensitiveWords = [
      '总统', '主席', '领导人', '政治', '金正恩', '普京', '特朗普', '拜登',
      'naked', 'nude', 'sex', 'violence', 'blood', 'kill', 'dead',
      ' naked', ' nude', ' sex', ' violence', ' blood', ' kill', ' dead',
    ];
    
    for (const word of sensitiveWords) {
      optimized = optimized.replace(new RegExp(word, 'gi'), '[person]');
    }
    
    // 添加更安全的描述
    optimized = optimized.replace(/Kim Taehyung|V |BTS /gi, 'a young Korean man ');
    optimized = optimized.replace(/Elon Musk|马斯克/gi, 'a tech entrepreneur ');
    optimized = optimized.replace(/Taylor Swift|泰勒/gi, 'a blonde female singer ');
  }
  
  // 每次重试添加一些变化
  if (attempt === 2) {
    optimized += ', professional portrait, soft lighting, high quality';
  } else if (attempt === 3) {
    optimized = 'A person ' + optimized.replace(/^.*?with\s+/i, 'with ') + ', casual photo, natural setting';
  }
  
  return optimized;
}

// 分析错误类型
function analyzeError(errorMsg: string): string {
  const msg = errorMsg.toLowerCase();
  if (msg.includes('content') || msg.includes('safety') || msg.includes('policy') || 
      msg.includes('blocked') || msg.includes('restricted') || msg.includes('violation')) {
    return 'CONTENT_BLOCKED';
  }
  if (msg.includes('timeout') || msg.includes('time out')) {
    return 'TIMEOUT';
  }
  if (msg.includes('rate') || msg.includes('limit')) {
    return 'RATE_LIMIT';
  }
  return 'UNKNOWN';
}

// 带超时的 fetch
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    fetch(url, options)
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

// 提交生成任务
async function submitGeneration(prompt: string, userImageBase64?: string): Promise<{taskId?: string, error?: string, code?: string}> {
  const apiKey = getApiKey();
  const reqBody: any = {
    model: 'nova-g-image-2',
    prompt,
    size: '1024x1024',
    response_format: 'url',
  };
  if (userImageBase64) reqBody.reference_images = [userImageBase64];

  try {
    const submitResp = await fetchWithTimeout(`${NOVA_BASE}/v1/images/generations?async=1`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    }, 15000); // 15秒超时

    if (!submitResp.ok) {
      const errText = await submitResp.text().catch(() => '');
      console.error('Submit error:', submitResp.status, errText.substring(0, 200));
      // 429 = 限流, 403 = 封号/内容限制 —— 直接返回具体错误
      if (submitResp.status === 429) {
        return { error: '服务器繁忙，请1分钟后再试', code: 'RATE_LIMIT' };
      }
      if (submitResp.status === 403) {
        return { error: '该内容暂不支持生成，请换个人物或场景', code: 'FORBIDDEN' };
      }
      return { error: `Submit failed: ${submitResp.status} - ${errText.substring(0, 100)}` };
    }

    const submitData = await submitResp.json();
    const taskId = submitData?.data?.task_id;
    if (!taskId) {
      return { error: 'No task_id in response' };
    }
    
    return { taskId: String(taskId) };
  } catch (e: any) {
    console.error('Submit exception:', e.message);
    return { error: e.message === 'TIMEOUT' ? '提交超时，请重试' : e.message };
  }
}

// 轮询任务状态
async function pollTask(taskId: string): Promise<{status: string, imageUrl?: string, error?: string}> {
  const apiKey = getApiKey();
  
  try {
    const pollResp = await fetchWithTimeout(`${NOVA_BASE}/v1/images/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    }, 10000); // 10秒超时

    if (!pollResp.ok) {
      return { status: 'error', error: `Poll failed: ${pollResp.status}` };
    }

    const pollData = await pollResp.json();
    const task = pollData?.data || pollData;
    const taskStatus = task?.status;

    if (!taskStatus) {
      return { status: 'error', error: 'Task not found' };
    }

    const normalizedStatus = taskStatus.toUpperCase();

    if (normalizedStatus === 'SUCCESS' && task.results?.length > 0) {
      const resultUrl = `${NOVA_BASE}/v1/files/images/${taskId}/results/0/content`;
      return { status: 'success', imageUrl: resultUrl };
    }

    if (normalizedStatus === 'FAILED') {
      const errMsg = task.error?.message || 'Generation failed';
      return { status: 'failed', error: errMsg };
    }

    return { status: 'pending' };
  } catch (e: any) {
    return { status: 'error', error: e.message === 'TIMEOUT' ? '轮询超时' : e.message };
  }
}

// 等待任务完成（带重试）
async function waitForTask(taskId: string, maxWaitMs = 20000): Promise<{status: string, imageUrl?: string, error?: string}> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const result = await pollTask(taskId);
    
    if (result.status === 'success' || result.status === 'failed' || result.status === 'error') {
      return result;
    }
    
    // 等待2秒后再次轮询
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return { status: 'pending', error: 'Task still running' };
}

// ===== 自我进化：尝试多套prompt变体 =====
async function tryGenerateWithEvolution(
  celebrityId: string,
  basePrompt: string,
  promptVariants: string[] | undefined,
  userImageBase64?: string
): Promise<{success: boolean, imageUrl?: string, error?: string, errorType?: string, attemptsMade: number}> {
  
  // 构建尝试列表：基础prompt + 所有变体
  const promptsToTry: string[] = [basePrompt];
  if (promptVariants && promptVariants.length > 0) {
    promptsToTry.push(...promptVariants.slice(0, MAX_VARIANT_RETRIES - 1));
  }
  
  let lastError = '';
  let lastErrorType = 'UNKNOWN';
  
  for (let variantIdx = 0; variantIdx < promptsToTry.length; variantIdx++) {
    let currentPrompt = promptsToTry[variantIdx];
    const isVariant = variantIdx > 0;
    
    console.log(`[EVOLUTION] Attempting variant ${variantIdx + 1}/${promptsToTry.length} for ${celebrityId}${isVariant ? ' (variant)' : ''}`);
    
    // 每套变体内再尝试3次（带通用优化）
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 1) {
        currentPrompt = optimizePrompt(promptsToTry[variantIdx], lastErrorType, attempt);
      }
      
      console.log(`[EVOLUTION] Variant ${variantIdx + 1}, Attempt ${attempt}/${MAX_RETRIES}: ${currentPrompt.substring(0, 80)}...`);
      
      const submitResult = await submitGeneration(currentPrompt, userImageBase64);
      
      if (submitResult.error) {
        lastError = submitResult.error;
        lastErrorType = analyzeError(lastError);
        console.log(`[EVOLUTION] Submit failed: ${lastError}, type: ${lastErrorType}`);
        
        // 如果收到限流，立即停止
        if (submitResult.code === 'RATE_LIMIT') {
          return {
            success: false,
            error: lastError,
            errorType: 'RATE_LIMIT',
            attemptsMade: variantIdx * MAX_RETRIES + attempt,
          };
        }
        
        // 如果收到账号限制或内容安全错误，立即停止所有重试
        if (lastError.includes('ACCOUNT_RESTRICTED') || lastError.includes('内容安全') || lastError.includes('封禁')) {
          console.log('[EVOLUTION] Account restricted, stopping all retries immediately');
          return {
            success: false,
            error: '系统繁忙，请30分钟后再试',
            errorType: 'ACCOUNT_RESTRICTED',
            attemptsMade: variantIdx * MAX_RETRIES + attempt,
          };
        }
        
        continue; // 继续下一次attempt
      }
      
      // 提交成功，等待结果（30秒超时）
      const taskResult = await waitForTask(submitResult.taskId!);
      
      if (taskResult.status === 'success') {
        console.log(`[EVOLUTION] Success on variant ${variantIdx + 1}, attempt ${attempt}!`);
        return {
          success: true,
          imageUrl: taskResult.imageUrl,
          attemptsMade: variantIdx * MAX_RETRIES + attempt,
        };
      }
      
      if (taskResult.status === 'failed') {
        lastError = taskResult.error || 'Generation failed';
        lastErrorType = analyzeError(lastError);
        console.log(`[EVOLUTION] Generation failed: ${lastError}, type: ${lastErrorType}`);
        // 继续下一次attempt
      } else if (taskResult.status === 'timeout' || taskResult.status === 'error') {
        lastError = taskResult.error || 'Task error';
        lastErrorType = taskResult.status === 'timeout' ? 'TIMEOUT' : 'UNKNOWN';
        // 继续下一次attempt
      }
    }
    
    console.log(`[EVOLUTION] Variant ${variantIdx + 1} exhausted all ${MAX_RETRIES} attempts`);
  }
  
  // 所有变体都失败了
  console.log(`[EVOLUTION] All variants failed for ${celebrityId}. Total attempts: ${promptsToTry.length * MAX_RETRIES}`);
  
  return {
    success: false,
    error: lastError,
    errorType: lastErrorType,
    attemptsMade: promptsToTry.length * MAX_RETRIES,
  };
}

// ===== POST: Submit generation with self-evolution =====
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, userImageBase64, celebrityId } = body;
    
    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt', code: 'INVALID_REQUEST' }, { status: 400 });
    }

    const auth = isAuthenticated(req);
    const registered = auth.ok;
    const dailyLimit = registered ? REG_LIMIT : FREE_LIMIT;

    const usageCookie = req.cookies.get('mingren_usage')?.value;
    const quota = usageCookie ? verifyQuota(usageCookie) : null;
    const today = getTodayStr();
    const count = quota?.d === today ? quota.c : 0;
    const bonus = quota?.b || 0;
    const remaining = dailyLimit + bonus - count;
    
    if (remaining <= 0) {
      return NextResponse.json({
        error: registered ? '今日生成次数已用完，明天再来或邀请好友获取更多！' : '免费次数已用完，注册后每天仍6次',
        code: 'QUOTA_EXCEEDED',
      }, { status: 429 });
    }

    // 检查名人是否已下线（生产环境）
    if (celebrityId && isProd) {
      const status = await getCelebrityStatus(celebrityId);
      if (status?.disabled) {
        return NextResponse.json({
          status: 'failed',
          error: '该名人暂时不支持，请更换后重试',
          code: 'CELEBRITY_DISABLED',
          canRetry: false,
          suggestion: '该名人因技术原因暂时下线，请尝试选择其他名人',
        });
      }
    }

    // 查找名人的prompt变体
    const celebrity = celebrities.find(c => c.id === celebrityId);
    const promptVariants = celebrity?.promptVariants;

    // 提交生成任务（不重试，直接返回结果或taskId）
    const submitResult = await submitGeneration(prompt, userImageBase64);
    
    if (submitResult.error) {
      // 提交失败
      const errorType = analyzeError(submitResult.error);
      let errorMsg = submitResult.error;
      let errorCode = errorType;
      let suggestion = '请尝试选择其他名人或场景';
      
      if (submitResult.code === 'RATE_LIMIT' || errorType === 'RATE_LIMIT') {
        errorMsg = '服务器太火爆了，请1分钟后再试 🔥';
        errorCode = 'RATE_LIMIT';
        suggestion = '等待1分钟后点击重试';
      } else if (errorType === 'ACCOUNT_RESTRICTED') {
        errorMsg = '系统繁忙，请30分钟后再试';
        errorCode = 'ACCOUNT_RESTRICTED';
        suggestion = '我们的AI正在休息，请稍后再来';
      } else if (errorType === 'CONTENT_BLOCKED') {
        errorMsg = '这个人物暂时无法生成，请换一位试试';
        errorCode = 'CONTENT_BLOCKED';
        suggestion = '建议选择动漫角色或运动员';
      }
      
      return NextResponse.json({
        status: 'failed',
        error: errorMsg,
        code: errorCode,
        canRetry: errorType !== 'ACCOUNT_RESTRICTED',
        suggestion,
      });
    }
    
    // 提交成功，等待结果
    const taskResult = await waitForTask(submitResult.taskId!);
    
    if (taskResult.status === 'success') {
      // 成功！
      await trackGeneration({
        timestamp: new Date().toISOString(),
        email: auth.ok ? auth.email : undefined,
        celebId: celebrityId || undefined,
        success: true,
        imageUrl: taskResult.imageUrl,
        userImageUrl: userImageBase64 || undefined,
      });

      const newQuota = signQuota({ d: today, c: count + 1, b: bonus });
      const res = NextResponse.json({
        status: 'success',
        imageUrl: taskResult.imageUrl,
      });
      res.cookies.set('mingren_usage', newQuota, {
        httpOnly: true, secure: isProd, maxAge: 86400, path: '/', sameSite: 'lax',
      });
      return res;
    }
    
    if (taskResult.status === 'pending') {
      // 任务还在运行，返回 taskId 让前端轮询
      return NextResponse.json({
        status: 'pending',
        taskId: submitResult.taskId,
        message: 'AI正在生成中...',
      });
    }
    
    // 失败
    const errorType = analyzeError(taskResult.error || 'Generation failed');
    let errorMsg = taskResult.error || '生成失败，请重试';
    let errorCode = errorType;
    let suggestion = '请尝试选择其他名人或场景';
    
    if (errorType === 'CONTENT_BLOCKED') {
      errorMsg = '这个人物暂时无法生成，请换一位试试';
      errorCode = 'CONTENT_BLOCKED';
      suggestion = '建议选择动漫角色或运动员';
    } else if (errorType === 'TIMEOUT') {
      errorMsg = '生成超时了，请重试';
      errorCode = 'TIMEOUT';
      suggestion = '网络波动，请点击重试';
    }
    
    return NextResponse.json({
      status: 'failed',
      error: errorMsg,
      code: errorCode,
      canRetry: true,
      suggestion,
    });

  } catch (error: any) {
    console.error('Submit error:', error);
    return serverError('提交异常，请稍后重试');
  }
}

// ===== GET: Poll task status (legacy) =====
export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get('taskId');
  if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });

  try {
    const result = await pollTask(taskId);
    
    if (result.status === 'success') {
      return NextResponse.json({ status: 'success', imageUrl: result.imageUrl });
    }
    
    if (result.status === 'failed') {
      return NextResponse.json({
        status: 'failed',
        error: result.error || '生成失败',
        code: 'GENERATION_FAILED',
      });
    }
    
    if (result.status === 'error') {
      return NextResponse.json({ status: 'error', error: result.error }, { status: 502 });
    }
    
    return NextResponse.json({ status: 'pending' });

  } catch (e: any) {
    console.error('Poll error:', e.message);
    return NextResponse.json({ status: 'error', error: '查询超时', code: 'POLL_TIMEOUT' }, { status: 502 });
  }
}
