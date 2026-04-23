import { NextRequest, NextResponse } from 'next/server';
import { celebrities } from '@/lib/celebrities';

// This endpoint returns the celebrity list for the frontend
export async function GET() {
  return NextResponse.json({
    celebrities: celebrities.map((c) => ({
      id: c.id,
      name: c.name,
      nameEn: c.nameEn,
      category: c.category,
      tags: c.tags,
      avatarUrl: c.avatarUrl,
      hotness: c.hotness,
    })),
  });
}
