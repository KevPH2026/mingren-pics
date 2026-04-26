'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';

const HomeContent = dynamic(() => import('@/components/HomeContent'), { ssr: false });

export default function Home() {
  // Track page visit
  useEffect(() => {
    fetch('/api/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/' }),
    }).catch(() => {});
  }, []);

  return <HomeContent />;
}
