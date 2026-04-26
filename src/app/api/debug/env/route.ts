import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const novaKey = process.env.NOVA_API_KEY || '';
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    isProd: typeof process !== 'undefined' && process.env.NODE_ENV === 'production',
    novaKeyPrefix: novaKey.substring(0, 10),
    novaKeyLength: novaKey.length,
    novaKeyExists: !!novaKey,
  });
}