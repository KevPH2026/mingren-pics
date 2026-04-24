'use client';

import { useRef, useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { celebrities, scenarios } from '@/lib/celebrities';
import QRCode from 'qrcode';

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

  // 水印动画状态
  const [showWatermark, setShowWatermark] = useState(false);
  const [saving, setSaving] = useState(false);

  // 获取邀请码
  const getInviteCode = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('mingren_referral_code') || '';
  };

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
    if (!currentImage || saving) return;

    // 先触发水印动画预览
    setShowWatermark(true);

    // 等动画播完再下载
    setSaving(true);
    await new Promise(r => setTimeout(r, 1200));

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const canvas = canvasRef.current;
      if (!canvas) { setSaving(false); return; }
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { setSaving(false); return; }

      ctx.drawImage(img, 0, 0);

      const fontSize = Math.max(18, Math.floor(img.width / 28));

      // === 右下角二维码区域 ===
      const inviteCode = getInviteCode();
      const qrUrl = inviteCode ? `https://mingren.pics/?ref=${inviteCode}` : 'https://mingren.pics';
      const qrSize = Math.max(80, Math.floor(img.width / 5));

      try {
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          width: qrSize,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'L',
        });

        const qrImg = new Image();
        qrImg.onload = () => {
          const padding = 12;
          const totalQrW = qrSize + padding * 2;
          const totalQrH = qrSize + padding * 2 + fontSize + 8;

          // 二维码背景白底
          const qrX = img.width - totalQrW - 10;
          const qrY = img.height - totalQrH - 10;

          ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
          ctx.beginPath();
          ctx.roundRect(qrX, qrY, totalQrW, totalQrH, 8);
          ctx.fill();

          // 像素风格边框
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 3]);
          ctx.beginPath();
          ctx.roundRect(qrX, qrY, totalQrW, totalQrH, 8);
          ctx.stroke();
          ctx.setLineDash([]);

          // 画二维码
          ctx.drawImage(qrImg, qrX + padding, qrY + padding, qrSize, qrSize);

          // 二维码下方文字
          ctx.font = `900 ${Math.max(10, fontSize * 0.55)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#8b5cf6';
          ctx.fillText('扫码生成你的合影 →', qrX + totalQrW / 2, qrY + qrSize + padding + fontSize * 0.6);

          // === 底部网址水印（像素风） ===
          ctx.font = `900 ${fontSize}px "Courier New", monospace`;
          ctx.textAlign = 'center';
          ctx.strokeStyle = '#000';
          ctx.lineWidth = fontSize / 5;
          ctx.strokeText('⚡ mingren.pics ⚡', img.width / 2, img.height - 12);
          ctx.fillStyle = '#ff0';
          ctx.fillText('⚡ mingren.pics ⚡', img.width / 2, img.height - 12);

          // 触发下载
          const link = document.createElement('a');
          link.download = `mingren-${celeb?.nameEn || 'photo'}-${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          setSaving(false);
          setTimeout(() => setShowWatermark(false), 500);
        };
        qrImg.src = qrDataUrl;
      } catch {
        // QR 生成失败，仅加文字水印
        ctx.font = `900 ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = fontSize / 5;
        ctx.strokeText('⚡ mingren.pics ⚡', img.width / 2, img.height - 12);
        ctx.fillStyle = '#ff0';
        ctx.fillText('⚡ mingren.pics ⚡', img.width / 2, img.height - 12);

        const link = document.createElement('a');
        link.download = `mingren-${celeb?.nameEn || 'photo'}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setSaving(false);
        setTimeout(() => setShowWatermark(false), 500);
      }
    };
    img.src = currentImage;
  };

  const handleShare = async () => {
    if (!currentImage) return;

    const inviteCode = getInviteCode();
    const shareLink = inviteCode ? `https://mingren.pics/?ref=${inviteCode}` : 'https://mingren.pics';

    if (navigator.share) {
      try {
        const blob = await (await fetch(currentImage)).blob();
        const file = new File([blob], 'mingren-photo.png', { type: 'image/png' });
        await navigator.share({
          title: `我跟${celeb?.name || '名人'}合影了！`,
          text: `快来 mingren.pics 生成你跟名人的合影！${inviteCode ? ` 邀请码: ${inviteCode}` : ''}`,
          url: shareLink,
          files: [file],
        });
        return;
      } catch {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(
        `我跟${celeb?.name || '名人'}合影了！快来 mingren.pics 生成你的名人合影！${inviteCode ? `\n邀请码: ${inviteCode}` : ''}\n${shareLink}`
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
          userImageBase64: currentImage,
        }),
      });

      const data = await resp.json();

      if (data.images) {
        setGeneratedImages(data.images);
        savedRef.current = false;
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

  const inviteCode = getInviteCode();

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-5 mt-4 px-4">
      <canvas ref={canvasRef} className="hidden" />

      {/* KA-POW! header */}
      <div className="animate-bounce-in text-center">
        <span
          className="text-3xl font-black text-[#e00] animate-glitch"
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

            {/* 像素化动态水印覆盖层 */}
            {showWatermark && (
              <div className="absolute inset-0 flex flex-col items-center justify-end p-3 bg-gradient-to-t from-black/80 via-black/20 to-transparent animate-pixel-reveal">
                <div className="flex items-center gap-2 mb-2">
                  <div className="px-3 py-1 bg-[#ff0] comic-border-thin font-black text-xs text-black">
                    ⚡ mingren.pics
                  </div>
                  {inviteCode && (
                    <div className="px-2 py-1 bg-[#8b5cf6] border-2 border-white font-black text-[10px] text-white">
                      码: {inviteCode}
                    </div>
                  )}
                </div>
                <div className="px-3 py-1.5 bg-white/90 rounded border-2 border-[#8b5cf6]">
                  <p className="text-[10px] font-black text-[#8b5cf6]">📸 扫码生成你的合影</p>
                </div>
              </div>
            )}

            {/* 常驻底部水印条 */}
            {!showWatermark && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent py-2 px-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#ff0]">mingren.pics</span>
                  <span className="text-[10px] font-bold text-white/50">AI生成 · 仅供娱乐</span>
                </div>
              </div>
            )}
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

      {/* 邀请码展示区 */}
      {inviteCode && registered && (
        <div className="w-full max-w-[320px] bg-gradient-to-r from-[#8b5cf6]/10 to-[#ec4899]/10 border-2 border-dashed border-[#8b5cf6]/40 rounded-lg p-3 animate-float">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-[#8b5cf6] uppercase tracking-wider">你的专属邀请码</p>
              <p className="text-lg font-black text-black font-mono">{inviteCode}</p>
            </div>
            <button
              onClick={() => {
                const link = `https://mingren.pics/?ref=${inviteCode}`;
                navigator.clipboard.writeText(link);
              }}
              className="px-3 py-2 bg-[#8b5cf6] text-white comic-border-thin font-black text-xs hover:bg-[#7c3aed] transition-colors"
            >
              📋 复制链接
            </button>
          </div>
          <p className="text-[10px] text-black/40 font-bold mt-1">分享给好友 · 每人使用你+3次生成</p>
        </div>
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
              className={`px-3 py-1.5 text-xs font-black comic-border-thin transition-all animate-glitch ${
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
          disabled={saving}
          className={`flex-1 py-3 bg-[#0cf] comic-border font-black text-sm transition-all ${
            saving ? 'opacity-60' : 'comic-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
          }`}
        >
          {saving ? '⏳ 水印渲染中...' : '💾 保存带码图'}
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
          className="flex-1 py-2 bg-white comic-border-thin text-xs font-black hover:bg-[#ff0] transition-colors animate-glitch"
        >
          🔄 换场景
        </button>
        <button
          onClick={() => setStep('select')}
          className="flex-1 py-2 bg-white comic-border-thin text-xs font-black hover:bg-[#ff0] transition-colors animate-glitch"
        >
          🌟 换名人
        </button>
        <button
          onClick={reset}
          className="flex-1 py-2 bg-white comic-border-thin text-xs font-black hover:bg-[#ff0] transition-colors animate-glitch"
        >
          🆕 重来
        </button>
      </div>
    </div>
  );
}
