'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { celebrities } from '@/lib/celebrities';

const comicTexts = [
  '💥 BOOM! AI正在合成...',
  '⚡ ZAP! 光影匹配中...',
  '🔥 POW! 细节渲染中...',
  '🎨 WHOOSH! 上色中...',
  '✨ SHAZAM! 最后润色...',
];

export default function GeneratingStep() {
  const selectedCelebrityId = useAppStore((s) => s.selectedCelebrityId);
  const celeb = celebrities.find((c) => c.id === selectedCelebrityId);
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % comicTexts.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center gap-6 mt-16 px-4">
      {/* Burst container */}
      <div className="relative animate-burst">
        {/* Star burst background */}
        <div className="absolute inset-[-20px] bg-[#ff0] comic-border-thin rotate-[12deg] rounded-lg" />
        <div className="absolute inset-[-10px] bg-[#e00] comic-border-thin rotate-[-8deg] rounded-lg" />

        {/* Main circle */}
        <div className="relative w-32 h-32 rounded-full bg-white comic-border flex items-center justify-center">
          <div className="text-5xl">{celeb?.avatarUrl || '⏳'}</div>
        </div>
      </div>

      {/* Comic action text */}
      <div
        className="text-3xl font-black text-[#e00] text-center"
        style={{ WebkitTextStroke: '1px #000' }}
      >
        正在生成你跟
        <br />
        {celeb?.name || '名人'}的合影！
      </div>

      {/* Fun rotating text */}
      <div className="bg-[#ff0] comic-border-thin px-6 py-2 font-black text-sm">
        {comicTexts[textIndex]}
      </div>

      {/* Bouncing dots */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-3 h-3 bg-[#e00] comic-border-thin animate-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}
