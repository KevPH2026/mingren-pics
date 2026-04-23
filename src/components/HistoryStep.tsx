'use client';

import { useState } from 'react';
import { useAppStore, HistoryItem } from '@/lib/store';

export default function HistoryStep() {
  const { history, removeFromHistory, clearHistory, setStep } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - ts;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    if (diffHr < 24) return `${diffHr}小时前`;
    if (diffDay < 7) return `${diffDay}天前`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const handleSaveImage = (item: HistoryItem) => {
    const link = document.createElement('a');
    link.download = `mingren-${item.celebrityName}-${item.scenarioLabel}-${Date.now()}.png`;
    link.href = item.imageUrl;
    link.click();
  };

  if (history.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6 mt-16 px-4">
        <div className="text-7xl">📸</div>
        <div className="text-center">
          <p className="text-xl font-black mb-2">还没有合影记录</p>
          <p className="text-sm text-black/50 font-bold">去生成你的第一张名人合影吧！</p>
        </div>
        <button
          onClick={() => setStep('upload')}
          className="py-3 px-8 bg-[#e00] text-white comic-border font-black text-base comic-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        >
          📸 去合影
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-4 mt-4 px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xl font-black" style={{ WebkitTextStroke: '1px #000' }}>
            📸 合影记录
          </span>
          <span className="ml-2 text-xs font-bold text-black/40">{history.length}张</span>
        </div>
        {showConfirmClear ? (
          <div className="flex gap-2">
            <button
              onClick={() => { clearHistory(); setShowConfirmClear(false); }}
              className="px-3 py-1 bg-[#e00] text-white text-xs font-black comic-border-thin"
            >
              确认清空
            </button>
            <button
              onClick={() => setShowConfirmClear(false)}
              className="px-3 py-1 bg-white text-xs font-black comic-border-thin"
            >
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="px-3 py-1 bg-white text-xs font-bold text-black/40 comic-border-thin hover:text-[#e00] transition-colors"
          >
            🗑️ 清空
          </button>
        )}
      </div>

      {/* History list */}
      <div className="flex flex-col gap-3">
        {history.map((item) => (
          <div
            key={item.id}
            className="bg-white comic-border-thin overflow-hidden"
          >
            {/* Main row - click to expand */}
            <button
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              className="w-full flex items-center gap-3 p-3 text-left"
            >
              <div className="w-14 h-14 rounded overflow-hidden comic-border-thin flex-shrink-0 bg-[#ff0]/20">
                <img
                  src={item.imageUrl}
                  alt={item.celebrityName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm truncate">
                  {item.celebrityName} · {item.scenarioLabel}
                </p>
                <p className="text-xs text-black/40 font-bold">{formatTime(item.createdAt)}</p>
              </div>
              <span className="text-black/30 text-lg">{expandedId === item.id ? '▼' : '▶'}</span>
            </button>

            {/* Expanded view */}
            {expandedId === item.id && (
              <div className="border-t-2 border-black/10 p-3 flex flex-col gap-3">
                <div className="w-full max-w-[280px] mx-auto">
                  <img
                    src={item.imageUrl}
                    alt={item.celebrityName}
                    className="w-full object-cover comic-border-thin rounded"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveImage(item)}
                    className="flex-1 py-2 bg-[#0cf] comic-border-thin font-black text-xs hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                  >
                    💾 保存
                  </button>
                  <button
                    onClick={() => removeFromHistory(item.id)}
                    className="flex-1 py-2 bg-[#f0f0f0] comic-border-thin font-black text-xs text-[#e00] hover:bg-[#e00] hover:text-white transition-colors"
                  >
                    🗑️ 删除
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Back button */}
      <button
        onClick={() => setStep('upload')}
        className="text-center text-black/40 text-sm font-bold py-3 hover:text-[#e00] transition-colors"
      >
        ← 返回首页
      </button>
    </div>
  );
}
