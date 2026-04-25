import { NextRequest, NextResponse } from 'next/server';

// GET /api/image-proxy?url=xxx — proxies image download with API key
export async function GET(req: NextRequest) {
  const imageUrl = req.nextUrl.searchParams.get('url');
  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  // Only allow whitelisted domains
  const allowedHosts = ['novartspace.art'];
  try {
    const parsed = new URL(imageUrl);
    if (!allowedHosts.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h))) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const isNova = imageUrl.includes('novartspace.art');
    const apiKey = process.env.NOVA_API_KEY || '';
    const resp = await fetch(imageUrl, {
      headers: isNova ? { 'Authorization': `Bearer ${apiKey}` } : {},
    });

    if (!resp.ok) {
      return NextResponse.json({ error: 'Download failed' }, { status: resp.status });
    }

    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    const buffer = await resp.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    console.error('Image proxy error:', error);
    return NextResponse.json({ error: '图片下载失败' }, { status: 500 });
  }
}
