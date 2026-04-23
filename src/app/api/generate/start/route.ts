import { NextRequest } from 'next/server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const NOVA_BASE = 'https://www.novartspace.art';
const getApiKey = () => process.env.NOVA_API_KEY || '';

// Simple in-memory queue (shared within same serverless instance)
let activeJobs = 0;
let queuePosition = 0;
const MAX_CONCURRENT = 2; // Only 2 concurrent Nova API calls to avoid rate limit

export async function POST(req: NextRequest) {
  try {
    // Queue check
    if (activeJobs >= MAX_CONCURRENT) {
      queuePosition++;
      const pos = queuePosition;
      return new Response(
        JSON.stringify({ queued: true, position: pos, message: '排队中，请稍候...' }),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
      );
    }

    activeJobs++;

    try {
      const body = await req.json();
      const { prompt, userImageBase64 } = body;

      if (!prompt) {
        return new Response(JSON.stringify({ error: 'Missing prompt' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }

      const apiKey = getApiKey();

      // Strategy: Try Gemini with ref image first, fallback to flex without ref
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

      // Attempt 1: Gemini with reference image
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
          console.log('Gemini generation succeeded');
          return new Response(
            JSON.stringify({ images: [`data:${imgMime};base64,${imgMatch[1]}`] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Log Gemini failure with status code
      const geminiErr = response.ok ? 'No image in response' : `${response.status}`;
      console.warn('Gemini failed:', geminiErr, '— falling back to nova-image-pro-flex');

      // Attempt 2: Fallback — nova-image-pro-flex (OpenAI compat), no reference image
      // This catches: Gemini 502, content filter blocks, rate limits, and other failures
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
        const errText = await fallbackResp.text();
        console.error('Flex fallback also failed:', fallbackResp.status, errText.slice(0, 300));
        return new Response(
          JSON.stringify({ error: '生成失败，请稍后重试' }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const flexText = await fallbackResp.text();
      const urlMatch = flexText.match(/"url"\s*:\s*"([^"]+)"/);

      if (urlMatch) {
        console.log('Flex fallback succeeded (url mode)');
        return new Response(
          JSON.stringify({ imageUrl: urlMatch[1] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const b64Match = flexText.match(/"b64_json"\s*:\s*"([A-Za-z0-9+/=]+)/);
      if (b64Match) {
        console.log('Flex fallback succeeded (b64 mode)');
        return new Response(
          JSON.stringify({ images: [`data:image/png;base64,${b64Match[1]}`] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.error('Flex fallback returned unexpected format:', flexText.slice(0, 300));
      return new Response(
        JSON.stringify({ error: '生成失败，请重试' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );

    } finally {
      activeJobs--;
      if (queuePosition > 0) queuePosition--;
    }
  } catch (error: any) {
    activeJobs--;
    console.error('Generate error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
