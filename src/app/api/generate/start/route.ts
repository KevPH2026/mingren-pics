import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, verifyQuota, signQuota, getTodayStr, isProd } from '@/lib/auth';
import { trackGeneration } from '@/lib/user-store';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const NOVA_BASE = 'https://www.novartspace.art';
const getApiKey = () => process.env.NOVA_API_KEY || '';
const FREE_LIMIT = 1;
const REG_LIMIT = 3;
const MAX_RETRIES = 3;

function serverError(msg = '服务异常，请稍后重试', status = 500, code = 'SERVER_ERROR') {
  return NextResponse.json({ error: msg, code }, { status, headers: { 'Content-Type': 'application/json' } });
}

// Prompt优化策略
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

// 提交生成任务
async function submitGeneration(prompt: string, userImageBase64?: string): Promise<{taskId?: string, error?: string}> {
  const apiKey = getApiKey();
  const reqBody: any = {
    model: 'nova-g-image-2',
    prompt,
    size: '1024x1024',
    response_format: 'url',
  };
  if (userImageBase64) reqBody.reference_images = [userImageBase64];

  try {
    const submitResp = await fetch(`${NOVA_BASE}/v1/images/generations?async=1`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
      signal: AbortSignal.timeout(15_000),
    });

    if (!submitResp.ok) {
      const errText = await submitResp.text().catch(() => '');
      console.error('Submit error:', submitResp.status, errText.substring(0, 200));
      return { error: `Submit failed: ${submitResp.status}` };
    }

    const submitData = await submitResp.json();
    const taskId = submitData?.data?.task_id;
    if (!taskId) {
      return { error: 'No task_id in response' };
    }
    
    return { taskId: String(taskId) };
  } catch (e: any) {
    console.error('Submit exception:', e.message);
    return { error: e.message };
  }
}

// 轮询任务状态
async function pollTask(taskId: string): Promise<{status: string, imageUrl?: string, error?: string}> {
  const apiKey = getApiKey();
  
  try {
    const pollResp = await fetch(`${NOVA_BASE}/v1/images/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!pollResp.ok) {
      return { status: 'error', error: 'Poll failed' };
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
    return { status: 'error', error: e.message };
  }
}

// 等待任务完成（带重试）
async function waitForTask(taskId: string, maxWaitMs = 120000): Promise<{status: string, imageUrl?: string, error?: string}> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const result = await pollTask(taskId);
    
    if (result.status === 'success' || result.status === 'failed' || result.status === 'error') {
      return result;
    }
    
    // 等待2秒后再次轮询
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return { status: 'timeout', error: 'Task timed out' };
}

// ===== POST: Submit generation with auto-retry =====
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, userImageBase64 } = body;
    if (!prompt) return NextResponse.json({ error: 'Missing prompt', code: 'INVALID_REQUEST' }, { status: 400 });

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
        error: registered ? '今日生成次数已用完，明天再来或邀请好友获取更多！' : '免费次数已用完，注册后每天3次',
        code: 'QUOTA_EXCEEDED',
      }, { status: 429 });
    }

    // 尝试生成，带自动重试
    let currentPrompt = prompt;
    let lastError = '';
    let errorType = 'UNKNOWN';
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`Generation attempt ${attempt}/${MAX_RETRIES}, prompt: ${currentPrompt.substring(0, 100)}...`);
      
      const submitResult = await submitGeneration(currentPrompt, userImageBase64);
      
      if (submitResult.error) {
        lastError = submitResult.error;
        errorType = analyzeError(lastError);
        console.log(`Attempt ${attempt} submit failed: ${lastError}, type: ${errorType}`);
        
        if (attempt < MAX_RETRIES) {
          currentPrompt = optimizePrompt(prompt, errorType, attempt);
          console.log(`Optimized prompt for attempt ${attempt + 1}: ${currentPrompt.substring(0, 100)}...`);
          continue;
        }
        break;
      }
      
      // 提交成功，等待结果
      const taskResult = await waitForTask(submitResult.taskId!);
      
      if (taskResult.status === 'success') {
        // 成功！更新配额并返回
        await trackGeneration({
          timestamp: new Date().toISOString(),
          email: auth.ok ? auth.email : undefined,
          success: true,
        });

        const newQuota = signQuota({ d: today, c: count + 1, b: bonus });
        const res = NextResponse.json({
          status: 'success',
          imageUrl: taskResult.imageUrl,
          attempts: attempt,
        });
        res.cookies.set('mingren_usage', newQuota, {
          httpOnly: true, secure: isProd, maxAge: 86400, path: '/', sameSite: 'lax',
        });
        return res;
      }
      
      if (taskResult.status === 'failed') {
        lastError = taskResult.error || 'Generation failed';
        errorType = analyzeError(lastError);
        console.log(`Attempt ${attempt} generation failed: ${lastError}, type: ${errorType}`);
        
        if (attempt < MAX_RETRIES) {
          currentPrompt = optimizePrompt(prompt, errorType, attempt);
          console.log(`Optimized prompt for attempt ${attempt + 1}: ${currentPrompt.substring(0, 100)}...`);
          continue;
        }
      }
      
      if (taskResult.status === 'timeout') {
        lastError = 'Generation timeout';
        break;
      }
    }
    
    // 所有重试都失败了
    console.error(`All ${MAX_RETRIES} attempts failed. Last error: ${lastError}`);
    await trackGeneration({ timestamp: new Date().toISOString(), success: false });
    
    return NextResponse.json({
      status: 'failed',
      error: '该名人暂时不支持，请更换后重试',
      code: errorType === 'CONTENT_BLOCKED' ? 'CONTENT_BLOCKED' : 'GENERATION_FAILED',
      canRetry: false,
      suggestion: '请尝试选择其他名人或场景',
    });

  } catch (error: any) {
    console.error('Submit error:', error);
    return serverError('提交异常，请稍后重试');
  }
}

// ===== GET: Poll task status (legacy, now handled in POST) =====
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
