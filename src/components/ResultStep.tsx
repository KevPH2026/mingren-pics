'use client';

import { useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { celebrities } from '@/lib/celebrities';

export default function ResultStep() {
  const { generatedImages, selectedCelebrityId, reset, setStep } = useAppStore();
  const celeb = celebrities.find((c) => c.id === selectedCelebrityId);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentImage = generatedImages[0];

  const handleSave = async () => {
    if (!currentImage) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      // Comic watermark
      const fontSize = Math.max(20, Math.floor(img.width / 25));
      ctx.font = `900 ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';

      // White outline
      ctx.strokeStyle = '#000';
      ctx.lineWidth = fontSize / 6;
      ctx.strokeText('mingren.pics', img.width / 2, img.height - 25);

      // Yellow fill
      ctx.fillStyle = '#ff0';
      ctx.fillText('mingren.pics', img.width / 2, img.height - 25);

      const link = document.createElement('a');
      link.download = `mingren-${celeb?.nameEn || 'photo'}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = currentImage;
  };

  const handleShare = async () => {
    if (!currentImage) return;

    if (navigator.share) {
      try {
        const blob = await (await fetch(currentImage)).blob();
        const file = new File([blob], 'mingren-photo.png', { type: 'image/png' });
        await navigator.share({
          title: `我跟${celeb?.name || '名人'}合影了！`,
          text: `快来 mingren.pics 生成你跟名人的合影吧！`,
          files: [file],
        });
        return;
      } catch {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(
        `我跟${celeb?.name || '名人'}合影了！快来 mingren.pics 生成你的名人合影！`
      );
      alert('分享文案已复制！');
    } catch {
      alert('请截图分享到你的社交平台～');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-5 mt-4 px-4">
      <canvas ref={canvasRef} className="hidden" />

      {/* KA-POW! header */}
      <div className="animate-bounce-in text-center">
        <span
          className="text-3xl font-black text-[#e00]"
          style={{ WebkitTextStroke: '2px #000', transform: 'rotate(-3deg)', display: 'inline-block' }}
        >
          💥 KA-POW!
        </span>
      </div>

      {/* Result image in comic frame */}
      {currentImage && (
        <div className="relative w-full max-w-[320px] animate-bounce-in">
          {/* Comic frame layers */}
          <div className="absolute inset-0 bg-[#e00] comic-border rotate-[-1deg] rounded" />
          <div className="absolute inset-[3px] bg-[#ff0] rounded-sm" />
          <div className="relative m-1 overflow-hidden rounded-sm">
            <img
              src={currentImage}
              alt="Generated photo"
              className="w-full object-cover comic-border-thin"
            />
            {/* Watermark overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent py-2 px-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#ff0]">mingren.pics</span>
                <span className="text-[10px] font-bold text-white/50">AI生成 · 仅供娱乐</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      {celeb && (
        <p className="text-sm font-black">
          你跟 <span className="text-[#e00]">{celeb.name}</span> 的合影 🎉
        </p>
      )}

      {/* Main actions */}
      <div className="flex gap-3 w-full max-w-[320px]">
        <button
          onClick={handleSave}
          className="flex-1 py-3 bg-[#0cf] comic-border font-black text-sm comic-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        >
          💾 保存
        </button>
        <button
          onClick={handleShare}
          className="flex-1 py-3 bg-[#e00] text-white comic-border font-black text-sm comic-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        >
          📤 分享
        </button>
      </div>

      {/* Secondary actions */}
      <div className="flex gap-2 w-full max-w-[320px]">
        <button
          onClick={() => setStep('scenario')}
          className="flex-1 py-2 bg-white comic-border-thin text-xs font-black hover:bg-[#ff0] transition-colors"
        >
          🔄 换场景
        </button>
        <button
          onClick={() => setStep('select')}
          className="flex-1 py-2 bg-white comic-border-thin text-xs font-black hover:bg-[#ff0] transition-colors"
        >
          🌟 换名人
        </button>
        <button
          onClick={reset}
          className="flex-1 py-2 bg-white comic-border-thin text-xs font-black hover:bg-[#ff0] transition-colors"
        >
          🆕 重来
        </button>
      </div>
    </div>
  );
}
