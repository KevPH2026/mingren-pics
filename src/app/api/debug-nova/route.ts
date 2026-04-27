import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NOVA_BASE = 'https://www.novartspace.art';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    const apiKey = process.env.NOVA_API_KEY || '';
    
    console.log('Debug Nova test:', { keyPrefix: apiKey.substring(0, 10), prompt: prompt?.substring(0, 50) });
    
    const resp = await fetch(`${NOVA_BASE}/v1/images/generations?async=1`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: 'nova-g-image-2',
        prompt: prompt || 'test',
        size: '1024x1024',
        response_format: 'url',
      }),
    });
    
    const text = await resp.text();
    console.log('Debug Nova response:', { status: resp.status, text: text.substring(0, 200) });
    
    return NextResponse.json({
      novaStatus: resp.status,
      novaResponse: text,
      keyPrefix: apiKey.substring(0, 10),
      keyLength: apiKey.length,
    });
  } catch (e: any) {
    console.error('Debug error:', e);
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
