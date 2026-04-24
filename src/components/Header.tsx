'use client';

import { useAppStore } from '@/lib/store';

export default function Header() {
  const step = useAppStore((s) => s.step);
  const reset = useAppStore((s) => s.reset);
  const { isRegistered, setShowPaywall } = useAppStore();
  const phone = typeof window !== 'undefined' ? localStorage.getItem('mingren_email') || '' : '';

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
      <div className="flex items-center gap-3">
        <span className="text-sm text-white/60">{titles[step]}</span>
        {isRegistered() ? (
          <span className="text-xs font-bold text-white/50 bg-white/10 px-2 py-1 rounded">
            ✅ {phone ? phone.replace(/(.{2}).*(@.*)/, '$1***$2') : '已注册'}
          </span>
        ) : (
          <button
            onClick={() => setShowPaywall(true)}
            className="text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded hover:opacity-90 transition"
          >
            登录/注册
          </button>
        )}
      </div>
    </header>
  );
}
