import { NextResponse } from 'next/server';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const NOVA_BASE = 'https://www.novartspace.art';
const API_KEY = process.env.NOVA_API_KEY || '';

export async function GET() {
  const results: Record<string, string> = {};

  // Test 1: Nova Gemini endpoint
  try {
    const r1 = await fetch(
      `${NOVA_BASE}/v1beta/models/nova-g-image-2:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Generate a simple red circle on white background' }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
        signal: AbortSignal.timeout(15_000),
      }
    );
    results.gemini_status = `${r1.status} ${r1.statusText}`;
    results.gemini_body = (await r1.text()).substring(0, 500);
  } catch (e: any) {
    results.gemini_status = 'FETCH_ERROR';
    results.gemini_error = e.message;
  }

  // Test 2: Nova Flex endpoint
  try {
    const r2 = await fetch(`${NOVA_BASE}/v1/images/generations`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nova-image-pro-flex', prompt: 'A red circle', n: 1, size: '256x256' }),
      signal: AbortSignal.timeout(15_000),
    });
    results.flex_status = `${r2.status} ${r2.statusText}`;
    results.flex_body = (await r2.text()).substring(0, 500);
  } catch (e: any) {
    results.flex_status = 'FETCH_ERROR';
    results.flex_error = e.message;
  }

  results.has_api_key = API_KEY ? `yes (${API_KEY.substring(0, 8)}...)` : 'NO';
  results.timestamp = new Date().toISOString();

  return NextResponse.json(results, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
