import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, verifyQuota, signQuota, getTodayStr, authCookieOpts, isProd } from '@/lib/auth';
import { trackGeneration } from '@/app/api/admin/stats/route';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const NOVA_BASE = 'https://www.novartspace.art';
const getApiKey = () => process.env.NOVA_API_KEY || '';
const FREE_LIMIT = 1;
const REG_LIMIT = 3;

function serverError(msg = '服务异常，请稍后重试', status = 500) {
  return NextResponse.json(
    { error: msg },
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, userImageBase64 } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // ===== Auth check =====
    const auth = isAuthenticated(req);
    const registered = auth.ok;
    const dailyLimit = registered ? REG_LIMIT : FREE_LIMIT;

    // ===== Quota check from signed cookie =====
    const usageCookie = req.cookies.get('mingren_usage')?.value;
    const quota = usageCookie ? verifyQuota(usageCookie) : null;
    const today = getTodayStr();
    const count = quota?.d === today ? quota.c : 0;
    const bonus = quota?.b || 0;
    const remaining = dailyLimit + bonus - count;

    if (remaining <= 0) {
      return NextResponse.json({
        error: registered ? '今日生成次数已用完，明天再来或邀请好友获取更多！' : '免费次数已用完，注册后每天3次',
        remaining: 0,
        registered,
      }, {
        status: 429, headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = getApiKey();

    // ===== Build parts for Nova API =====
    const parts: any[] = [{ text: prompt }];
    let hasRefImage = false;

    if (userImageBase64) {
      let imageData = userImageBase64;
      let mimeType = 'image/jpeg';
      if (userImageBase64.startsWith('data:')) {
        const match = userImageBase64.match(/^data:(image\/[\w+]+);base64,(.+)$/);
        if (match) { mimeType = match[1]; imageData = match[2]; }
      }
      parts.push({ inlineData: { mimeType, data: imageData } });
      hasRefImage = true;
    }

    console.log('Starting generation, hasRefImage:', hasRefImage);

    // ===== Attempt 1: nova-g-image-2 (Nova Gemini接口 + 参考图) =====
    const response = await fetch(
      `${NOVA_BASE}/v1beta/models/nova-g-image-2:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: { aspectRatio: '1:1', novartResolution: '1k' },
          },
        }),
      }
    );

    if (response.ok) {
      const novaText = await response.text();
      const imgMatch = novaText.match(/"inlineData"\s*:\s*\{[^}]*"data"\s*:\s*"([A-Za-z0-9+/=]+)/);

      if (imgMatch) {
        const mimeMatch = novaText.match(/"inlineData"\s*:\s*\{[^}]*"mimeType"\s*:\s*"([^"]+)"/);
        const imgMime = mimeMatch?.[1] || 'image/png';
        console.log('Nova generation succeeded');

        trackGeneration({
          timestamp: new Date().toISOString(),
          email: auth.ok ? auth.email : undefined,
          success: true,
        });

        const res = NextResponse.json(
          { images: [`data:${imgMime};base64,${imgMatch[1]}`] },
          { headers: { 'Content-Type': 'application/json' } }
        );
        setQuotaCookie(req, res, registered);
        return res;
      }
    }

    // ===== Log failure =====
    const errStatus = response.ok ? 'No image in response' : `${response.status}`;
    console.warn('Nova failed:', errStatus, '— falling back to nova-image-pro-flex');

    // ===== Attempt 2: Fallback — nova-image-pro-flex =====
    const fallbackResp = await fetch(`${NOVA_BASE}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nova-image-pro-flex',
        prompt,
        n: 1,
        size: '1024x1024',
      }),
    });

    if (!fallbackResp.ok) {
      console.error('Flex fallback also failed:', fallbackResp.status);
      if (fallbackResp.status === 402) {
        trackGeneration({ timestamp: new Date().toISOString(), success: false });
        return serverError('生成服务暂时不可用，请稍后再试', 503);
      }
      trackGeneration({ timestamp: new Date().toISOString(), success: false });
      return serverError('生成失败，请稍后重试', 502);
    }

    const flexText = await fallbackResp.text();
    const urlMatch = flexText.match(/"url"\s*:\s*"([^"]+)"/);

    if (urlMatch) {
      console.log('Flex fallback succeeded (url mode)');
      trackGeneration({ timestamp: new Date().toISOString(), email: auth.ok ? auth.email : undefined, success: true });
      const res = NextResponse.json(
        { imageUrl: urlMatch[1] },
        { headers: { 'Content-Type': 'application/json' } }
      );
      setQuotaCookie(req, res, registered);
      return res;
    }

    const b64Match = flexText.match(/"b64_json"\s*:\s*"([A-Za-z0-9+/=]+)/);
    if (b64Match) {
      console.log('Flex fallback succeeded (b64 mode)');
      trackGeneration({ timestamp: new Date().toISOString(), email: auth.ok ? auth.email : undefined, success: true });
      const res = NextResponse.json(
        { images: [`data:image/png;base64,${b64Match[1]}`] },
        { headers: { 'Content-Type': 'application/json' } }
      );
      setQuotaCookie(req, res, registered);
      return res;
    }

    console.error('Flex fallback returned unexpected format');
    trackGeneration({ timestamp: new Date().toISOString(), success: false });
    return serverError('生成失败，请重试');

  } catch (error: any) {
    console.error('Generate error:', error);
    trackGeneration({ timestamp: new Date().toISOString(), success: false });
    return serverError('生成服务异常，请稍后重试');
  }
}

// Helper: read current quota, increment count, set cookie on response
function setQuotaCookie(req: NextRequest, res: NextResponse, registered: boolean) {
  const usageCookie = req.cookies.get('mingren_usage')?.value;
  const quota = usageCookie ? verifyQuota(usageCookie) : null;
  const today = getTodayStr();
  const count = quota?.d === today ? quota.c : 0;
  const bonus = quota?.b || 0;

  const newQuota = signQuota({ d: today, c: count + 1, b: bonus });
  res.cookies.set('mingren_usage', newQuota, {
    httpOnly: true,
    secure: isProd,
    maxAge: 86400,
    path: '/',
    sameSite: 'lax',
  });
}
