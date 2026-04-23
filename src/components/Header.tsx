'use client';

import { useAppStore } from '@/lib/store';

export default function Header() {
  const step = useAppStore((s) => s.step);
  const reset = useAppStore((s) => s.reset);

  const titles: Record<string, string> = {
    upload: '📸 上传你的照片',
    select: '🌟 选择名人',
    scenario: '🎭 选择场景',
    generating: '✨ AI生成中...',
    result: '🎉 你的合影',
  };

  return (
    <header className="w-full px-4 py-3 flex items-center justify-between border-b border-white/10">
      <button
        onClick={reset}
        className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
      >
        名人合影
      </button>
      <span className="text-sm text-white/60">{titles[step]}</span>
    </header>
  );
}
