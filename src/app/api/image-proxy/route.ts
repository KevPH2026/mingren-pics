import { NextRequest, NextResponse } from 'next/server';

// GET /api/image-proxy?url=xxx — proxies image download with API key
export async function GET(req: NextRequest) {
  const imageUrl = req.nextUrl.searchParams.get('url');
  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  // Only allow novartspace.art URLs
  if (!imageUrl.includes('novartspace.art')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const apiKey = process.env.NOVA_API_KEY || '';

  try {
    const resp = await fetch(imageUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
