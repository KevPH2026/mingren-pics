import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NOVA_BASE = 'https://www.novartspace.art';

// 带超时的 fetch（完全复制 generate/start 的逻辑）
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    fetch(url, options)
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, userImageBase64 } = await req.json();
    const apiKey = process.env.NOVA_API_KEY || '';
    
    console.log('Debug Nova test:', { keyPrefix: apiKey.substring(0, 10), prompt: prompt?.substring(0, 50), hasImage: !!userImageBase64 });
    
    // 完全复制 generate/start 的 reqBody 构建逻辑
    let finalPrompt = prompt || 'test';
    if (userImageBase64) {
      if (!finalPrompt.includes('young') && !finalPrompt.includes('man') && !finalPrompt.includes('woman')) {
        finalPrompt = finalPrompt.replace('A photorealistic photo of ', 'A photorealistic photo of a young Asian person ');
      }
    }
    
    const reqBody: any = {
      model: 'nova-g-image-2',
      prompt: finalPrompt,
      size: '1024x1024',
      response_format: 'url',
    };
    // 注意：reference_images 参数会导致Nova API返回500错误，已禁用
    // if (userImageBase64) reqBody.reference_images = [userImageBase64];
    
    console.log('Debug reqBody:', JSON.stringify(reqBody).substring(0, 200));
    
    const submitResp = await fetchWithTimeout(`${NOVA_BASE}/v1/images/generations?async=1`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    }, 15000);
    
    const text = await submitResp.text();
    console.log('Debug Nova response:', { status: submitResp.status, text: text.substring(0, 200) });
    
    return NextResponse.json({
      novaStatus: submitResp.status,
      novaResponse: text,
      keyPrefix: apiKey.substring(0, 10),
      keyLength: apiKey.length,
      reqBody: reqBody,
    });
  } catch (e: any) {
    console.error('Debug error:', e);
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
