'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAppStore, HistoryItem } from '@/lib/store';

function maskEmail(email: string): string {
  if (!email) return '已登录';
  const atIndex = email.indexOf('@');
  if (atIndex <= 1) return email.replace(/(.{1}).*(@.*)/, '$1***$2');
  return email.replace(/(.{2}).*(@.*)/, '$1***$2');
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`px-2 py-1 text-[10px] font-black comic-border-thin transition-all ${
        copied
          ? 'bg-[#0f0] text-black'
          : 'bg-[#ff0] text-black hover:bg-[#ff3]'
      }`}
    >
      {copied ? '✅ 已复制' : label || '📋 复制'}
    </button>
  );
}

export default function ProfilePage() {
  const {
    serverQuota,
    history,
    getRemainingToday,
    setStep,
    fetchServerQuota,
  } = useAppStore();

  const email = serverQuota?.email || (typeof window !== 'undefined' ? localStorage.getItem('mingren_email') || '' : '');
  const referralCode = serverQuota?.referralCode || (typeof window !== 'undefined' ? localStorage.getItem('mingren_referral_code') || '' : '');
  const inviteCount = serverQuota?.inviteCount ?? 0;

  // Child codes from store + localStorage
  const storeChildCodes = serverQuota?.childCodes || useAppStore.getState().childCodes || [];
  const [childCodes, setChildCodes] = useState<{ display: string; token: string }[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    // Load child codes from localStorage
    try {
      const displays: string[] = JSON.parse(localStorage.getItem('mingren_child_displays') || '[]');
      const tokens: string[] = JSON.parse(localStorage.getItem('mingren_child_codes') || '[]');
      if (displays.length > 0) {
        setChildCodes(displays.map((d, i) => ({ display: d, token: tokens[i] || d })));
      }
    } catch {}
  }, []);

  const remaining = getRemainingToday();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    // Also clear client-side
    document.cookie = 'mingren_uid=; path=/; max-age=0';
    document.cookie = 'mingren_sig=; path=/; max-age=0';
    document.cookie = 'mingren_email=; path=/; max-age=0';
    document.cookie = 'mingren_ref=; path=/; max-age=0';
    document.cookie = 'mingren_invite_codes=; path=/; max-age=0';
    localStorage.removeItem('mingren_registered');
    localStorage.removeItem('mingren_referral_code');
    localStorage.removeItem('mingren_email');
    localStorage.removeItem('mingren_child_displays');
    localStorage.removeItem('mingren_child_codes');
    window.location.reload();
  };

  const recentHistory = history.slice(0, 6);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-5 mt-4 px-4 pb-8">
      {/* ===== User Info Section ===== */}
      <section className="bg-white comic-border comic-shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#8b5cf6] rounded-full flex items-center justify-center comic-border-thin">
              <span className="text-white text-xl">👤</span>
            </div>
            <div>
              <p className="font-black text-base">{maskEmail(email)}</p>
              <p className="text-xs text-black/50 font-bold">今日剩余 <span className="text-[#e00] font-black">{remaining}</span> 次</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchServerQuota()}
            className="flex-1 py-2 bg-[#0cf] text-black comic-border-thin font-black text-xs hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
          >
            🔄 刷新资料
          </button>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex-1 py-2 bg-[#f0f0f0] text-[#e00] comic-border-thin font-black text-xs hover:bg-[#e00] hover:text-white transition-colors disabled:opacity-50"
          >
            {loggingOut ? '⏳ 退出中...' : '🚪 退出登录'}
          </button>
        </div>
      </section>

      {/* ===== My Invite Codes Section ===== */}
      <section className="bg-[#ff0] comic-border comic-shadow-sm p-4">
        <h2
          className="text-lg font-black mb-3"
          style={{ WebkitTextStroke: '1px #000' }}
        >
          🎟️ 我的邀请码
        </h2>

        {/* Own referral code */}
        {referralCode && (
          <div className="bg-white comic-border-thin p-3 mb-3">
            <p className="text-[10px] font-black text-black/40 mb-1">我的推荐码</p>
            <div className="flex items-center justify-between">
              <span className="font-black text-base tracking-widest">{referralCode}</span>
              <CopyButton text={`https://mingren.pics/?ref=${referralCode}`} label="🔗 复制链接" />
            </div>
          </div>
        )}

        {/* Child invite codes */}
        {childCodes.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            <p className="text-[10px] font-black text-black/40">子邀请码（分享给好友）</p>
            {childCodes.map((code, idx) => (
              <div key={idx} className="bg-white comic-border-thin p-2 flex items-center justify-between">
                <span className="font-black text-sm tracking-widest">{code.display}</span>
                <CopyButton text={`https://mingren.pics/?ref=${code.token}`} label="📋 复制" />
              </div>
            ))}
          </div>
        )}

        {/* Fission explanation */}
        <div className="bg-[#8b5cf6]/10 comic-border-thin p-2 text-center">
          <p className="text-xs font-black text-[#8b5cf6]">
            🚀 每个码可邀请3人，被邀请人注册后再获3个码！无限裂变！
          </p>
        </div>

        {/* Invite stats */}
        {inviteCount > 0 && (
          <div className="mt-3 text-center">
            <span className="inline-block bg-[#e00] text-white px-3 py-1 comic-border-thin font-black text-xs animate-bounce-in">
              🎉 已成功邀请 {inviteCount} 人
            </span>
          </div>
        )}
      </section>

      {/* ===== My Photo History Section ===== */}
      <section className="bg-white comic-border comic-shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-lg font-black"
            style={{ WebkitTextStroke: '1px #000' }}
          >
            📸 我的合影
          </h2>
          {history.length > 6 && (
            <button
              onClick={() => setStep('history')}
              className="px-2 py-0.5 bg-[#8b5cf6] text-white text-[10px] font-black rounded comic-border-thin hover:bg-[#7c3aed] transition-colors"
            >
              查看全部 →
            </button>
          )}
        </div>

        {recentHistory.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {recentHistory.map((item) => (
              <button
                key={item.id}
                onClick={() => setPreviewImage(item.imageUrl)}
                className="aspect-square overflow-hidden comic-border-thin bg-[#ff0]/20 hover:scale-105 transition-transform"
              >
                <img
                  src={item.imageUrl}
                  alt={`${item.celebrityName} · ${item.scenarioLabel}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6">
            <span className="text-4xl">📸</span>
            <p className="text-sm font-black text-black/40">还没有合影记录</p>
            <button
              onClick={() => setStep('upload')}
              className="mt-1 px-4 py-1.5 bg-[#e00] text-white text-xs font-black comic-border-thin hover:bg-[#c00] transition-colors"
            >
              去合影 →
            </button>
          </div>
        )}

        {history.length > 6 && (
          <div className="mt-3 text-center">
            <button
              onClick={() => setStep('history')}
              className="text-xs font-bold text-[#8b5cf6] hover:underline"
            >
              查看全部 {history.length} 张 →
            </button>
          </div>
        )}
      </section>

      {/* ===== Back to Home Button ===== */}
      <button
        onClick={() => setStep('upload')}
        className="w-full py-3 bg-[#e00] text-white comic-border font-black text-base comic-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
      >
        🏠 返回首页
      </button>

      {/* ===== Image Preview Modal ===== */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-sm w-full animate-bounce-in">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-[#e00] text-white comic-border-thin font-black text-sm rounded-full flex items-center justify-center z-10"
            >
              ✕
            </button>
            <img
              src={previewImage}
              alt="合影预览"
              className="w-full comic-border rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}
