'use client';

import { useRef, useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { celebrities, scenarios } from '@/lib/celebrities';
import QRCode from 'qrcode';

function makeThumbnail(dataUrl: string, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('no canvas')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => reject(new Error('img load failed'));
    img.src = dataUrl;
  });
}

export default function ResultStep() {
  const { generatedImages, selectedCelebrityId, selectedScenarioId, reset, setStep, addToHistory, isRegistered, setShowPaywall, setGeneratedImages, userImage, history } = useAppStore();
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
    if (typeof window === 'undefined') return { display: '', token: '' };
    const referralCode = localStorage.getItem('mingren_referral_code') || useAppStore.getState().serverQuota?.referralCode || '';
    return {
      display: referralCode,
      token: referralCode,
    };
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
      // Save thumbnail to avoid localStorage overflow
      const saveToHistory = async () => {
        try {
          const thumb = await makeThumbnail(currentImage, 200);
          addToHistory({
            imageUrl: thumb,
            celebrityId: celeb.id,
            celebrityName: celeb.name,
            scenarioLabel: scenario?.label || '合影',
          });
        } catch {
          // If thumbnail fails, save with a placeholder
          addToHistory({
            imageUrl: '',
            celebrityId: celeb.id,
            celebrityName: celeb.name,
            scenarioLabel: scenario?.label || '合影',
          });
        }
      };
      saveToHistory();
    }
  }, [currentImage, celeb, scenario, addToHistory]);

  const getViralCopy = () => {
    const copies = [
      '你也来一张？',
      '快来跟名人合影！',
      '一键生成你的名人合影',
      '合影名人就在这里 👇',
    ];
    const count = history.length;
    if (count >= 3) {
      copies.push(`我已生成${count}张啦！`);
    }
    if (count >= 10) {
      copies.push(`已合影${count}次！超上瘾`);
    }
    return copies[Math.floor(Math.random() * copies.length)];
  };

  const triggerDownload = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `mingren-${celeb?.nameEn || 'photo'}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setSaving(false);
    setTimeout(() => setShowWatermark(false), 500);
  };

  const drawBottomBar = (ctx: CanvasRenderingContext2D, w: number, h: number, baseFontSize: number, qrImg: HTMLImageElement | null, qrSize: number) => {
    const invite = getInviteCode();
    const barH = Math.max(120, Math.floor(h * 0.18));

    // 底部半透明渐变遮罩
    const grad = ctx.createLinearGradient(0, h - barH - 20, 0, h);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.3, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - barH - 20, w, barH + 20);

    const y = h - 16;
    const fs = baseFontSize;
    const fsSmall = Math.max(14, Math.floor(fs * 0.6));
    const fsLarge = Math.max(20, Math.floor(fs * 0.8));
    const fsCode = Math.max(24, Math.floor(fs * 1.0));

    // === 左下角：mingren.pics（像素风粗体） ===
    ctx.font = `900 ${fsLarge}px "Courier New", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    // 描边
    ctx.strokeStyle = '#000';
    ctx.lineWidth = fsLarge / 4;
    ctx.lineJoin = 'round';
    ctx.strokeText('mingren.pics', 16, y - 20);
    // 填充黄色
    ctx.fillStyle = '#FFE600';
    ctx.fillText('mingren.pics', 16, y - 20);

    // === 中间：趣味裂变文案 ===
    const viralText = getViralCopy();
    ctx.font = `900 ${fs}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = fs / 4;
    ctx.strokeText(viralText, w / 2, y - 10);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(viralText, w / 2, y - 10);

    // === 右下角：二维码 + 邀请码 ===
    if (qrImg) {
      const qrPadding = 8;
      const qrX = w - qrSize - qrPadding * 2 - 16;
      const qrY = y - qrSize - qrPadding * 2 - 44;

      // 二维码白色圆角背景
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.roundRect(qrX, qrY, qrSize + qrPadding * 2, qrSize + qrPadding * 2, 10);
      ctx.fill();

      // 画二维码
      ctx.drawImage(qrImg, qrX + qrPadding, qrY + qrPadding, qrSize, qrSize);

      // 二维码下方文字 "扫码合影名人"
      ctx.font = `900 ${fsSmall}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = fsSmall / 4;
      ctx.strokeText('扫码合影名人', qrX + (qrSize + qrPadding * 2) / 2, qrY + qrSize + qrPadding * 2 + 4);
      ctx.fillText('扫码合影名人', qrX + (qrSize + qrPadding * 2) / 2, qrY + qrSize + qrPadding * 2 + 4);

      // 如果有邀请码，在二维码左侧显示
      if (invite.display) {
        const codeX = qrX - 16;
        const codeY = qrY + qrSize / 2;

        // 邀请码背景标签
        ctx.font = `900 ${fsSmall}px "PingFang SC", sans-serif`;
        const codeLabel = '邀请码';
        const codeLabelW = ctx.measureText(codeLabel).width + 12;
        ctx.fillStyle = '#8b5cf6';
        ctx.beginPath();
        ctx.roundRect(codeX - codeLabelW, codeY - fsCode / 2 - 4, codeLabelW, fsSmall + 6, 4);
        ctx.fill();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(codeLabel, codeX - 2, codeY - fsCode / 2 - 1);

        // 邀请码数字（大字体醒目）
        ctx.font = `900 ${fsCode}px "Courier New", monospace`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = fsCode / 4;
        ctx.strokeText(invite.display, codeX, codeY + fsCode);
        ctx.fillStyle = '#FFE600';
        ctx.fillText(invite.display, codeX, codeY + fsCode);
      }
    }
  };

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

      // 图片主体占满 canvas
      ctx.drawImage(img, 0, 0, img.width, img.height);

      const baseFontSize = Math.max(20, Math.floor(img.width / 22));
      const invite = getInviteCode();
      const qrUrl = invite.token ? `https://mingren.pics/?ref=${encodeURIComponent(invite.token)}` : 'https://mingren.pics';
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
          drawBottomBar(ctx, img.width, img.height, baseFontSize, qrImg, qrSize);
          triggerDownload(canvas);
        };
        qrImg.src = qrDataUrl;
      } catch {
        // QR 生成失败，只画底部栏（无二维码）
        drawBottomBar(ctx, img.width, img.height, baseFontSize, null, 0);
        triggerDownload(canvas);
      }
    };
    img.src = currentImage;
  };

  const handleShare = async () => {
    if (!currentImage) return;

    const invite = getInviteCode();
    const shareLink = invite.token ? `https://mingren.pics/?ref=${encodeURIComponent(invite.token)}` : 'https://mingren.pics';

    if (navigator.share) {
      try {
        const blob = await (await fetch(currentImage)).blob();
        const file = new File([blob], 'mingren-photo.png', { type: 'image/png' });
        await navigator.share({
          title: `我跟${celeb?.name || '名人'}合影了！`,
          text: `快来 mingren.pics 生成你跟名人的合影！${invite.display ? ` 邀请码: ${invite.display}` : ''}`,
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
        `我跟${celeb?.name || '名人'}合影了！快来 mingren.pics 生成你的名人合影！${invite.display ? `\n邀请码: ${invite.display}` : ''}\n${shareLink}`
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
        setGeneratedImages([`/api/image-proxy?url=${encodeURIComponent(data.imageUrl)}`]);
        savedRef.current = false;
      } else {
        alert(data.error || '修改失败，请重试');
      }
    } catch {
      alert('网络异常，请重试');
    } finally {
      setEditing(false);
      setEditInstruction('');
      useAppStore.getState().fetchServerQuota();
    }
  };

  const invite = getInviteCode();

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

            {/* 动态水印覆盖层（保存动画预览） */}
            {showWatermark && (
              <div className="absolute inset-0 flex flex-col items-center justify-end p-3 bg-gradient-to-t from-black/80 via-black/20 to-transparent animate-pixel-reveal">
                <div className="flex items-center gap-2 mb-2">
                  <div className="px-3 py-1 bg-[#ff0] comic-border-thin font-black text-xs text-black">
                    ⚡ mingren.pics
                  </div>
                  {invite.display && (
                    <div className="px-2 py-1 bg-[#8b5cf6] border-2 border-white font-black text-[10px] text-white">
                      邀请码: {invite.display}
                    </div>
                  )}
                </div>
                <div className="px-3 py-1.5 bg-white/90 rounded border-2 border-[#8b5cf6]">
                  <p className="text-[10px] font-black text-[#8b5cf6]">📸 扫码合影名人</p>
                </div>
              </div>
            )}

            {/* 常驻底部水印条 */}
            {!showWatermark && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent py-1.5 px-3 flex items-center justify-center">
                <span className="text-xs font-black text-[#ff0] tracking-wider">mingren.pics</span>
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
      {invite.display && registered && (
        <div className="w-full max-w-[320px] bg-gradient-to-r from-[#8b5cf6]/10 to-[#ec4899]/10 border-2 border-dashed border-[#8b5cf6]/40 rounded-lg p-3 animate-float">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-[#8b5cf6] uppercase tracking-wider">你的专属邀请码</p>
              <p className="text-lg font-black text-black font-mono">{invite.display}</p>
            </div>
            <button
              onClick={() => {
                const link = `https://mingren.pics/?ref=${encodeURIComponent(invite.token)}`;
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
          {saving ? '⏳ 分享图渲染中...' : '💾 一键保存分享图'}
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
