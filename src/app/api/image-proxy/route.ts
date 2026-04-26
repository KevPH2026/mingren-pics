import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  // Only allow Nova URLs to prevent SSRF
  if (!url.startsWith('https://www.novartspace.art/')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const apiKey = process.env.NOVA_API_KEY || '';
    const resp = await fetch(url, {
      headers: {
        'Accept': '*/*',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error('Image proxy error:', resp.status, errText.substring(0, 200));
      return NextResponse.json({ error: 'Upstream error', status: resp.status, detail: errText.substring(0, 200) }, { status: resp.status });
    }

    const contentType = resp.headers.get('content-type') || '';

    // Common CORS headers so the proxied image can be used in <img crossOrigin="anonymous"> and canvas
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization',
      'Cache-Control': 'public, max-age=86400',
    };

    // If response is JSON (e.g. base64 encoded), extract the image data
    if (contentType.includes('application/json')) {
      const json = await resp.json();
      // Nova might return { data: [...] } with base64 or URLs
      const b64 = json?.data?.[0]?.b64_json || json?.b64_json || json?.data?.[0]?.url;
      if (b64 && b64.startsWith('data:')) {
        // data:image/png;base64,xxx
        const match = b64.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          const buf = Buffer.from(match[2], 'base64');
          return new NextResponse(buf, {
            headers: { 'Content-Type': match[1], ...corsHeaders },
          });
        }
      }
      if (b64 && !b64.startsWith('http')) {
        // raw base64
        const buf = Buffer.from(b64, 'base64');
        return new NextResponse(buf, {
          headers: { 'Content-Type': 'image/png', ...corsHeaders },
        });
      }
      // It's a URL - redirect or fetch again
      if (b64 && b64.startsWith('http')) {
        const imgResp = await fetch(b64, { signal: AbortSignal.timeout(30_000) });
        const imgBuf = await imgResp.arrayBuffer();
        const imgCt = imgResp.headers.get('content-type') || 'image/png';
        return new NextResponse(imgBuf, {
          headers: { 'Content-Type': imgCt, ...corsHeaders },
        });
      }
      console.error('Unexpected JSON response from Nova file URL:', JSON.stringify(json).substring(0, 300));
      return NextResponse.json({ error: 'Unexpected response format' }, { status: 502 });
    }

    // Direct image response
    const body = await resp.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType || 'image/png',
        ...corsHeaders,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Proxy fetch failed' }, { status: 502 });
  }
}
