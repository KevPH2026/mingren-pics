import { NextRequest, NextResponse } from 'next/server';

// POST /api/generate/start — starts generation, returns imageUrl or taskId
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const apiKey = process.env.NOVA_API_KEY || '';

    // Use sync mode with flex model (fast ~30-50s)
    // Return URL instead of b64 to avoid large payloads
    const resp = await fetch('https://www.novartspace.art/v1/images/generations', {
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

    const text = await resp.text();

    if (!resp.ok) {
      console.error('Nova error:', resp.status, text.slice(0, 300));
      return NextResponse.json(
        { error: `Generation failed (${resp.status})` },
        { status: 502 }
      );
    }

    // Extract URL from response
    const urlMatch = text.match(/"url"\s*:\s*"([^"]+)"/);
    if (urlMatch) {
      return NextResponse.json({ imageUrl: urlMatch[1] });
    }

    // Try b64 fallback
    const b64Match = text.match(/"b64_json"\s*:\s*"([A-Za-z0-9+/=]+)/);
    if (b64Match) {
      return NextResponse.json({ images: [`data:image/png;base64,${b64Match[1]}`] });
    }

    console.error('No image in response:', text.slice(0, 300));
    return NextResponse.json({ error: 'No image generated' }, { status: 500 });
  } catch (error: any) {
    console.error('Start error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
