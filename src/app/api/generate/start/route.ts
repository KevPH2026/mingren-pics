import { NextRequest } from 'next/server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const NOVA_BASE = 'https://www.novartspace.art';
const getApiKey = () => process.env.NOVA_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, userImageBase64 } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Missing prompt' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = getApiKey();

    // Build Gemini-style request parts
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
            imageConfig: {
              aspectRatio: '1:1',
              novartResolution: '1k',
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Nova error:', response.status, errText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: `生成失败 (${response.status})` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Stream the response directly from Nova to avoid Vercel buffer limits
    // Nova returns JSON with base64 image - stream it through
    const contentType = response.headers.get('content-type') || 'application/json';
    
    // Read the full response from Nova, extract image, return clean JSON
    const novaText = await response.text();
    const imgMatch = novaText.match(/"inlineData"\s*:\s*\{[^}]*"data"\s*:\s*"([A-Za-z0-9+/=]+)/);

    if (!imgMatch) {
      console.error('No image in response:', novaText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: '生成失败，请重试' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const mimeMatch = novaText.match(/"inlineData"\s*:\s*\{[^}]*"mimeType"\s*:\s*"([^"]+)"/);
    const imgMime = mimeMatch?.[1] || 'image/png';

    return new Response(
      JSON.stringify({ images: [`data:${imgMime};base64,${imgMatch[1]}`] }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('Generate error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
