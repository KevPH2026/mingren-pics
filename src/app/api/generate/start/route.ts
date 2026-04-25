import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, verifyQuota, signQuota, getTodayStr, isProd } from '@/lib/auth';
import { trackGeneration } from '@/app/api/admin/stats/route';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const NOVA_BASE = 'https://www.novartspace.art';
const getApiKey = () => process.env.NOVA_API_KEY || '';
const FREE_LIMIT = 1;
const REG_LIMIT = 3;

function serverError(msg = '服务异常，请稍后重试', status = 500, code = 'SERVER_ERROR') {
  return NextResponse.json({ error: msg, code }, { status, headers: { 'Content-Type': 'application/json' } });
}

// ===== POST: Submit async generation task =====
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

    const apiKey = getApiKey();
    const reqBody: any = {
      model: 'nova-g-image-2',
      prompt,
      size: '1024x1024',
      response_format: 'url',
    };
    if (userImageBase64) reqBody.reference_images = [userImageBase64];

    // Submit as async task
    console.log('Submitting async task to Nova...');
    let submitResp: Response;
    try {
      submitResp = await fetch(`${NOVA_BASE}/v1/images/generations?async=1`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (e: any) {
      console.error('Submit timeout:', e.message);
      return serverError('提交超时，请稍后重试', 504);
    }

    if (!submitResp.ok) {
      const errText = await submitResp.text().catch(() => '');
      console.error('Submit error:', submitResp.status, errText.substring(0, 200));
      if (submitResp.status === 409) return serverError('当前生成请求较多，请稍后再试 🔄', 503, 'CONCURRENCY_LIMIT');
      if (submitResp.status === 429) return serverError('请求过于频繁，请1分钟后再试 ⏳', 429, 'RATE_LIMIT');
      return serverError('提交失败，请稍后重试', 502, 'SUBMIT_FAILED');
    }

    const submitData = await submitResp.json();
    const taskId = submitData?.data?.task_id;
    if (!taskId) {
      console.error('No task_id in response:', JSON.stringify(submitData).substring(0, 300));
      return serverError('提交失败，请重试');
    }

    console.log('Task submitted, task_id:', taskId);
    const res = NextResponse.json(
      { taskId: String(taskId), status: 'submitted' },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return res;

  } catch (error: any) {
    console.error('Submit error:', error);
    return serverError('提交异常，请稍后重试');
  }
}

// ===== GET: Poll task status =====
export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get('taskId');
  if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });

  const apiKey = getApiKey();
  const auth = isAuthenticated(req);
  const registered = auth.ok;

  try {
    const pollResp = await fetch(`${NOVA_BASE}/v1/images/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!pollResp.ok) {
      const errText = await pollResp.text().catch(() => '');
      console.error('Poll error:', pollResp.status, errText.substring(0, 200));
      return NextResponse.json({ status: 'error', error: '查询失败', code: 'POLL_ERROR' }, { status: 502 });
    }

    const pollData = await pollResp.json();
    console.log('Poll raw response:', JSON.stringify(pollData).substring(0, 500));

    // Try multiple response formats
    const task = pollData?.data || pollData;
    const taskStatus = task?.status; // queued/running/success/failed or QUEUED/RUNNING/SUCCESS/FAILED

    if (!taskStatus) {
      return NextResponse.json({ status: 'error', error: '任务不存在', code: 'TASK_NOT_FOUND', raw: pollData }, { status: 404 });
    }

    const normalizedStatus = taskStatus.toUpperCase();

    if (normalizedStatus === 'SUCCESS' && task.results?.length > 0) {
      // Get the result image URL
      const resultUrl = `${NOVA_BASE}/v1/files/images/${taskId}/results/0/content`;
      console.log('Task succeeded:', taskId);

      trackGeneration({
        timestamp: new Date().toISOString(),
        email: auth.ok ? auth.email : undefined,
        success: true,
      });

      // Set quota cookie on success
      const usageCookie = req.cookies.get('mingren_usage')?.value;
      const quota = usageCookie ? verifyQuota(usageCookie) : null;
      const today = getTodayStr();
      const count = quota?.d === today ? quota.c : 0;
      const bonus = quota?.b || 0;
      const newQuota = signQuota({ d: today, c: count + 1, b: bonus });

      const res = NextResponse.json({
        status: 'success',
        imageUrl: resultUrl,
      });
      res.cookies.set('mingren_usage', newQuota, {
        httpOnly: true, secure: isProd, maxAge: 86400, path: '/', sameSite: 'lax',
      });
      return res;
    }

    if (normalizedStatus === 'FAILED') {
      console.error('Task failed:', taskId, JSON.stringify(task).substring(0, 300));
      trackGeneration({ timestamp: new Date().toISOString(), success: false });
      const errMsg = task.error?.message || '';
      // 内容审核类错误（政治/暴力/IP相关敏感词）
      const isContentBlocked = errMsg.toLowerCase().includes('content') ||
        errMsg.toLowerCase().includes('safety') ||
        errMsg.toLowerCase().includes('policy') ||
        errMsg.toLowerCase().includes('blocked') ||
        errMsg.toLowerCase().includes('restricted') ||
        errMsg.toLowerCase().includes('violation');
      return NextResponse.json({
        status: 'failed',
        error: errMsg || '生成失败，请重试',
        code: isContentBlocked ? 'CONTENT_BLOCKED' : 'GENERATION_FAILED',
        canRetry: true,
      });
    }

    // Still QUEUED or RUNNING
    return NextResponse.json({ status: taskStatus.toLowerCase() });

  } catch (e: any) {
    console.error('Poll error:', e.message);
    return NextResponse.json({ status: 'error', error: '查询超时', code: 'POLL_TIMEOUT' }, { status: 502 });
  }
}
