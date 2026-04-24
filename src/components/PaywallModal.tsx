'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';

export default function PaywallModal() {
  const { setShowPaywall } = useAppStore();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效邮箱');
      return;
    }

    setSending(true);
    setError('');

    try {
      const resp = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        setError(data.error || '发送失败');
        return;
      }

      setSent(true);

      // 开发模式提示
      if (data.dev) {
        setError('');
        // 不显示验证码，只显示已发送
      }

      // 60秒倒计时
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setError('网络异常');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (code.length < 6) return;
    setVerifying(true);
    setError('');

    try {
      const resp = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        setError(data.error || '验证失败');
        setVerifying(false);
        return;
      }

      // 注册成功
      localStorage.setItem('mingren_registered', '1');
      localStorage.setItem('mingren_email', email);
      setShowPaywall(false);
    } catch {
      setError('网络异常');
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPaywall(false)} />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white comic-border animate-bounce-in">
        {/* Header */}
        <div className="bg-[#8b5cf6] text-white text-center py-4 border-b-4 border-black">
          <p className="text-2xl font-black" style={{ WebkitTextStroke: '1px #000' }}>
            🎉 解锁完整功能
          </p>
          <p className="text-xs font-bold mt-1 opacity-80">邮箱注册 · 免费使用 · 无需手机号</p>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Benefits */}
          <div className="bg-[#8b5cf6]/10 border-2 border-[#8b5cf6] rounded-lg p-3">
            <p className="text-xs font-black mb-2">🎁 注册即享：</p>
            <div className="flex flex-col gap-1 text-xs font-bold text-black/70">
              <span>✅ 每天3次免费生成</span>
              <span>✅ AI修改指令（换装/换背景等）</span>
              <span>✅ 高清无水印保存</span>
              <span>✅ 30+ 国际名人库</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-center text-xs font-bold text-[#e00] bg-[#e00]/10 py-2 rounded">
              {error}
            </div>
          )}

          {/* Email input */}
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="📧 输入邮箱地址"
              disabled={sent && countdown > 0}
              className="flex-1 py-3 px-3 border-2 border-black text-sm font-bold focus:outline-none focus:border-[#8b5cf6] disabled:bg-gray-50"
            />
            <button
              onClick={handleSendCode}
              disabled={sending || countdown > 0 || !email}
              className="px-4 py-3 bg-[#ff0] border-2 border-black font-black text-xs hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-40 whitespace-nowrap"
            >
              {sending ? '⏳' : countdown > 0 ? `${countdown}s` : '验证码'}
            </button>
          </div>

          {/* Code input */}
          {sent && (
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
              placeholder="🔢 输入6位验证码"
              maxLength={6}
              className="w-full py-3 px-3 border-2 border-black text-sm font-bold text-center tracking-[6px] focus:outline-none focus:border-[#8b5cf6]"
            />
          )}

          {/* Submit */}
          {sent && (
            <button
              onClick={handleVerify}
              disabled={code.length < 6 || verifying}
              className="w-full py-3.5 bg-[#8b5cf6] text-white border-2 border-black font-black text-base comic-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-40"
            >
              {verifying ? '⏳ 验证中...' : '🚀 立即注册'}
            </button>
          )}

          {/* Close */}
          <button
            onClick={() => setShowPaywall(false)}
            className="text-center text-black/30 text-xs font-bold py-1 hover:text-[#e00] transition-colors"
          >
            下次再说
          </button>
        </div>
      </div>
    </div>
  );
}
