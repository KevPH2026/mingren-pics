import { NextRequest, NextResponse } from 'next/server';

// GET /api/generate/poll?taskId=xxx — polls Nova for task status
export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get('taskId');
  if (!taskId) {
    return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
  }

  const apiKey = process.env.NOVA_API_KEY || '';

  try {
    const resp = await fetch(`https://www.novartspace.art/v1/images/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });

    const text = await resp.text();
    const statusMatch = text.match(/"status"\s*:\s*"([^"]+)"/);
    const status = statusMatch?.[1] || 'UNKNOWN';

    if (status === 'COMPLETED' || status === 'SUCCEEDED' || status === 'SUCCESS') {
      const b64Match = text.match(/"b64_json"\s*:\s*"([A-Za-z0-9+/=]+)/);
      if (b64Match) {
        return NextResponse.json({ status: 'completed', images: [`data:image/png;base64,${b64Match[1]}`] });
      }
      // Nova返回的URL字段可能是 "url", "download_url", 或 "signed_download_url"
      const urlMatch = text.match(/"(?:url|download_url|signed_download_url)"\s*:\s*"([^"]+)"/);
      if (urlMatch) {
        return NextResponse.json({ status: 'completed', imageUrl: urlMatch[1] });
      }
      return NextResponse.json({ status: 'failed', error: 'No image in response' });
    }

    if (status === 'FAILED' || status === 'ERROR') {
      const errMsg = text.match(/"message"\s*:\s*"([^"]+)"/);
      return NextResponse.json({ status: 'failed', error: errMsg?.[1] || 'Generation failed' });
    }

    return NextResponse.json({ status: 'processing' });
  } catch (error: any) {
    console.error('Poll error:', error);
    return NextResponse.json({ status: 'error', error: '查询失败，请稍后重试' });
  }
}
