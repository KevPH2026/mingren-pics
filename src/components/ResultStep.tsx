'use client';

import { useRef, useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { celebrities, scenarios } from '@/lib/celebrities';

export default function ResultStep() {
  const { generatedImages, selectedCelebrityId, selectedScenarioId, reset, setStep, addToHistory, isRegistered, setShowPaywall, setGeneratedImages, userImage } = useAppStore();
  const celeb = celebrities.find((c) => c.id === selectedCelebrityId);
  const scenario = scenarios.find((s) => s.id === selectedScenarioId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const savedRef = useRef(false);

  const currentImage = generatedImages[0];
  const registered = isRegistered();

  // 修改指令相关
  const [editInstruction, setEditInstruction] = useState('');
  const [editing, setEditing] = useState(false);

  // 快捷指令
  const quickEdits = [
    { label: '👔 换西装', prompt: 'Change both people to wearing formal business suits' },
    { label: '🕶️ 加墨镜', prompt: 'Add sunglasses on both people' },
    { label: '🌃 变夜景', prompt: 'Change the scene to nighttime with city lights in the background' },
    { label: '🎨 油画风', prompt: 'Transform this photo into an oil painting style artwork' },
    { label: '❄️ 下雪', prompt: 'Add snow falling in the scene, winter atmosphere' },
    { label: '📸 黑白', prompt: 'Convert this photo to classic black and white film style' },
  ];

  // 自动保存到历史记录（只保存一次）
  useEffect(() => {
    if (currentImage && celeb && !savedRef.current) {
      savedRef.current = true;
      addToHistory({
        imageUrl: currentImage,
        celebrityId: celeb.id,
        celebrityName: celeb.name,
        scenarioLabel: scenario?.label || '合影',
      });
    }
  }, [currentImage, celeb, scenario, addToHistory]);

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

      ctx.strokeStyle = '#000';
      ctx.lineWidth = fontSize / 6;
      ctx.strokeText('mingren.pics', img.width / 2, img.height - 25);

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

  const handleEdit = async (instruction: string) => {
    if (!instruction.trim() || !currentImage) return;

    if (!registered) {
      setShowPaywall(true);
      return;
    }

    setEditing(true);

    const editPrompt = `Modify this photo: ${instruction}. Keep the two people and their positions, only change what is requested. Photorealistic quality.`;

    try {
      const resp = await fetch('/api/generate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editPrompt,
          userImageBase64: currentImage, // 用当前生成的图作为参考
        }),
      });

      const data = await resp.json();

      if (data.images) {
        setGeneratedImages(data.images);
        savedRef.current = false; // 允许再次自动保存
      } else if (data.imageUrl) {
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(data.imageUrl)}`;
        const imgResp = await fetch(proxyUrl);
        const blob = await imgResp.blob();
        const reader = new FileReader();
        reader.onload = () => {
          setGeneratedImages([reader.result as string]);
          savedRef.current = false;
        };
        reader.readAsDataURL(blob);
      } else {
        alert(data.error || '修改失败，请重试');
      }
    } catch {
      alert('网络异常，请重试');
    } finally {
      setEditing(false);
      setEditInstruction('');
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
        <div className={`relative w-full max-w-[320px] animate-bounce-in ${editing ? 'opacity-60' : ''}`}>
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
          {editing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
              <div className="text-center">
                <div className="text-4xl animate-spin">🎨</div>
                <p className="text-white text-xs font-black mt-2">AI修改中...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      {celeb && (
        <p className="text-sm font-black">
          你跟 <span className="text-[#e00]">{celeb.name}</span> 的合影 🎉
        </p>
      )}

      {/* ===== 修改指令区域（注册用户可用） ===== */}
      <div className="w-full max-w-[320px] flex flex-col gap-3">
        {/* 快捷指令按钮 */}
        <div className="flex flex-wrap gap-2 justify-center">
          {quickEdits.map((q) => (
            <button
              key={q.label}
              onClick={() => handleEdit(q.prompt)}
              disabled={editing}
              className={`px-3 py-1.5 text-xs font-black comic-border-thin transition-all ${
                registered
                  ? 'bg-white hover:bg-[#ff0] hover:translate-y-[-2px] hover:comic-shadow-sm'
                  : 'bg-[#f0f0f0] text-black/30'
              }`}
            >
              {q.label}
              {!registered && ' 🔒'}
            </button>
          ))}
        </div>

        {/* 自定义修改输入 */}
        <div className="flex gap-2">
          <input
            type="text"
            value={editInstruction}
            onChange={(e) => setEditInstruction(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEdit(editInstruction)}
            placeholder={registered ? '✏️ 输入修改指令...如"把背景换成海边"' : '🔒 注册后可自定义修改'}
            disabled={!registered || editing}
            className="flex-1 py-2.5 px-3 border-2 border-black text-xs font-bold focus:outline-none focus:border-[#e00] disabled:bg-[#f5f5f5] disabled:text-black/30"
          />
          <button
            onClick={() => handleEdit(editInstruction)}
            disabled={!registered || editing || !editInstruction.trim()}
            className="px-4 py-2.5 bg-[#8b5cf6] text-white border-2 border-black font-black text-xs hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {editing ? '⏳' : '🎨 修改'}
          </button>
        </div>

        {!registered && (
          <button
            onClick={() => setShowPaywall(true)}
            className="text-center text-[10px] font-bold text-[#8b5cf6] hover:underline"
          >
            🔓 注册解锁AI修改功能 →
          </button>
        )}
      </div>

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
