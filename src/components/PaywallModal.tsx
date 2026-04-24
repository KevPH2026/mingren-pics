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
  const [success, setSuccess] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [childCodes, setChildCodes] = useState<string[]>([]);
  const [signature, setSignature] = useState('');

  // 获取 pending ref
  const pendingRef = typeof window !== 'undefined' ? localStorage.getItem('mingren_pending_ref') : null;

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

      // 保存 signature 用于 verify
      if (data.signature) {
        setSignature(data.signature);
      }

      setSent(true);

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
        body: JSON.stringify({
          email,
          code,
          signature,
          referralCode: pendingRef || undefined,
        }),
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
      if (pendingRef) localStorage.removeItem('mingren_pending_ref');
      if (data.referralCode) {
        localStorage.setItem('mingren_referral_code', data.referralCode);
        setReferralCode(data.referralCode);
      }
      if (data.childCodes && data.childCodeDisplays) {
        setChildCodes(data.childCodeDisplays);
        // 存储完整的签名 tokens 用于分享链接
        localStorage.setItem('mingren_child_codes', JSON.stringify(data.childCodes));
        localStorage.setItem('mingren_child_displays', JSON.stringify(data.childCodeDisplays));
      }
      setSuccess(true);

      // 刷新配额
      const { fetchServerQuota } = useAppStore.getState();
      await fetchServerQuota();
    } catch {
      setError('网络异常');
      setVerifying(false);
    }
  };

  // 注册成功 — 显示邀请链接和子码
  if (success) {
    const link = referralCode ? `https://mingren.pics/?ref=${referralCode}` : '';
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPaywall(false)} />
        <div className="relative w-full max-w-sm bg-white comic-border animate-bounce-in max-h-[90vh] overflow-y-auto">
          <div className="bg-green-500 text-white text-center py-4 border-b-4 border-black">
            <p className="text-2xl font-black">🎉 注册成功！</p>
            <p className="text-xs font-bold mt-1 opacity-80">每天3次免费生成已解锁</p>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {/* 子邀请码区域 */}
            {childCodes.length > 0 && (
              <div className="bg-[#8b5cf6]/10 border-2 border-[#8b5cf6] rounded-lg p-3">
                <p className="text-xs font-black mb-2 text-[#8b5cf6]">🎫 你的3个专属邀请码</p>
                <p className="text-[10px] text-black/40 mb-2">每个码可邀请3人，被邀请人注册后再获3个码！</p>
                <div className="flex flex-col gap-2">
                  {(() => {
                    const storedTokens = typeof window !== 'undefined'
                      ? JSON.parse(localStorage.getItem('mingren_child_codes') || '[]')
                      : [];
                    return childCodes.map((displayCode, i) => {
                      const fullToken = storedTokens[i] || displayCode;
                      return (
                        <div key={displayCode} className="flex items-center gap-2 bg-white rounded border-2 border-[#8b5cf6]/30 p-2">
                          <span className="text-xs font-black text-black/30">#{i + 1}</span>
                          <code className="flex-1 text-sm font-black tracking-wider text-black">{displayCode}</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`https://mingren.pics/?ref=${encodeURIComponent(fullToken)}`);
                            }}
                            className="px-2 py-1 bg-[#8b5cf6] text-white text-[10px] font-black rounded hover:bg-[#7c3aed]"
                          >
                            复制
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {link && (
              <div className="bg-[#ff0]/20 border-2 border-[#ff0] rounded-lg p-3">
                <p className="text-xs font-black mb-2">🎁 分享你的专属链接</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={link}
                    className="flex-1 py-2 px-2 border-2 border-black text-xs font-bold bg-gray-50"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(link);
                      (document.activeElement as HTMLElement)?.blur();
                    }}
                    className="px-3 py-2 bg-[#ff0] border-2 border-black font-black text-xs"
                  >
                    复制
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowPaywall(false)}
              className="w-full py-3 bg-green-500 text-white border-2 border-black font-black text-base comic-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            >
              🚀 开始生成
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPaywall(false)} />

      <div className="relative w-full max-w-sm bg-white comic-border animate-bounce-in">
        <div className="bg-[#8b5cf6] text-white text-center py-4 border-b-4 border-black">
          <p className="text-2xl font-black" style={{ WebkitTextStroke: '1px #000' }}>
            🎉 解锁完整功能
          </p>
          <p className="text-xs font-bold mt-1 opacity-80">邮箱注册 · 免费使用 · 无需手机号</p>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="bg-[#8b5cf6]/10 border-2 border-[#8b5cf6] rounded-lg p-3">
            <p className="text-xs font-black mb-2">🎁 注册即享：</p>
            <div className="flex flex-col gap-1 text-xs font-bold text-black/70">
              <span>✅ 每天3次免费生成</span>
              <span>✅ AI修改指令（换装/换背景等）</span>
              <span>✅ 自定义场景描述</span>
              <span>✅ 30+ 国际名人库</span>
              <span>✅ 邀请好友每+3次</span>
            </div>
          </div>

          {error && (
            <div className="text-center text-xs font-bold text-[#e00] bg-[#e00]/10 py-2 rounded">
              {error}
            </div>
          )}

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

          {sent && (
            <button
              onClick={handleVerify}
              disabled={code.length < 6 || verifying}
              className="w-full py-3.5 bg-[#8b5cf6] text-white border-2 border-black font-black text-base comic-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-40"
            >
              {verifying ? '⏳ 验证中...' : '🚀 立即注册'}
            </button>
          )}

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
