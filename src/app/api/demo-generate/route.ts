import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const NOVA_BASE = 'https://www.novartspace.art';
const DEMO_KEY = process.env.NOVA_API_KEY || '';

const DEMO_PROMPTS = [
  'A photorealistic photo of a young Asian man in his 20s standing next to Taylor Swift at a glamorous red carpet event, both smiling at the camera, warm golden lighting, celebrity gala atmosphere, professional photography, ultra detailed',
  'A photorealistic photo of a young Asian man celebrating with Lionel Messi on a football pitch after winning the World Cup, confetti falling, stadium lights, emotional moment, professional sports photography, ultra detailed',
  'A photorealistic photo of a young Asian man sitting next to Jay Chou (Zhou Jielun) in a cozy recording studio, both wearing headphones, warm ambient lighting, musical instruments in background, professional photography, ultra detailed',
  'A photorealistic photo of a young Asian man posing with BTS members at a concert backstage, colorful stage lights in background, casual cool outfits, friendly atmosphere, professional photography, ultra detailed',
];

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (key !== 'mingren-demo-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const index = parseInt(req.nextUrl.searchParams.get('i') || '0', 10);
  if (index < 0 || index >= DEMO_PROMPTS.length) {
    return NextResponse.json({ error: 'Invalid index', available: DEMO_PROMPTS.length }, { status: 400 });
  }

  const prompt = DEMO_PROMPTS[index];

  try {
    // Try Gemini model first
    const response = await fetch(
      `${NOVA_BASE}/v1beta/models/nova-g-image-2:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': DEMO_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: { aspectRatio: '1:1', novartResolution: '1k' },
          },
        }),
      }
    );

    if (response.ok) {
      const text = await response.text();
      const imgMatch = text.match(/"inlineData"\s*:\s*\{[^}]*"data"\s*:\s*"([A-Za-z0-9+/=]+)/);
      const mimeMatch = text.match(/"inlineData"\s*:\s*\{[^}]*"mimeType"\s*:\s*"([^"]+)"/);

      if (imgMatch) {
        const mime = mimeMatch?.[1] || 'image/png';
        const imgBuffer = Buffer.from(imgMatch[1], 'base64');

        return new NextResponse(imgBuffer, {
          headers: {
            'Content-Type': mime,
            'Content-Disposition': `inline; filename="demo-${index}.png"`,
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    }

    // Fallback to flex model
    const flexResp = await fetch(`${NOVA_BASE}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEMO_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nova-image-pro-flex',
        prompt,
        n: 1,
        size: '1024x1024',
      }),
    });

    if (!flexResp.ok) {
      return NextResponse.json({ error: 'Generation failed', status: flexResp.status }, { status: 502 });
    }

    const flexText = await flexResp.text();
    const b64Match = flexText.match(/"b64_json"\s*:\s*"([A-Za-z0-9+/=]+)/);
    const urlMatch = flexText.match(/"url"\s*:\s*"([^"]+)"/);

    if (b64Match) {
      const imgBuffer = Buffer.from(b64Match[1], 'base64');
      return new NextResponse(imgBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `inline; filename="demo-${index}.png"`,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    if (urlMatch) {
      return NextResponse.redirect(urlMatch[1]);
    }

    return NextResponse.json({ error: 'No image in response' }, { status: 500 });
  } catch (e: any) {
    console.error('Demo generate error:', e);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
