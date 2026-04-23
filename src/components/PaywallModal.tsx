'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';

export default function PaywallModal() {
  const { setShowPaywall, setStep } = useAppStore();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSendCode = () => {
    if (phone.length < 10) return;
    setSent(true);
    // TODO: 实际发送验证码
  };

  const handleVerify = () => {
    if (code.length < 4) return;
    setVerifying(true);
    // TODO: 实际验证
    // MVP: 任何4位验证码都通过
    setTimeout(() => {
      localStorage.setItem('mingren_registered', '1');
      setShowPaywall(false);
      setVerifying(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white comic-border animate-bounce-in">
        {/* Header */}
        <div className="bg-[#e00] text-white text-center py-4 border-b-4 border-black">
          <p className="text-2xl font-black" style={{ WebkitTextStroke: '1px #000' }}>
            🔒 免费次数用完了
          </p>
          <p className="text-xs font-bold mt-1 opacity-80">注册后无限生成名人合影！</p>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Benefits */}
          <div className="bg-[#ff0]/20 border-2 border-[#ff0] rounded-lg p-3">
            <p className="text-xs font-black mb-2">🎁 注册即享：</p>
            <div className="flex flex-col gap-1 text-xs font-bold text-black/70">
              <span>✅ 注册后每天3次免费生成</span>
              <span>✅ 无水印高清保存</span>
              <span>✅ 20+ 国际名人库</span>
              <span>✅ 8种趣味场景</span>
            </div>
          </div>

          {/* Phone input */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="📱 输入手机号"
                maxLength={11}
                className="flex-1 py-3 px-3 border-2 border-black text-sm font-bold focus:outline-none focus:border-[#e00]"
              />
              <button
                onClick={handleSendCode}
                disabled={phone.length < 10 || sent}
                className="px-4 py-3 bg-[#ff0] border-2 border-black font-black text-xs hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-40 whitespace-nowrap"
              >
                {sent ? '已发送' : '验证码'}
              </button>
            </div>

            {sent && (
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="🔢 输入验证码"
                maxLength={6}
                className="w-full py-3 px-3 border-2 border-black text-sm font-bold text-center tracking-[8px] focus:outline-none focus:border-[#e00]"
              />
            )}
          </div>

          {/* Submit */}
          {sent && (
            <button
              onClick={handleVerify}
              disabled={code.length < 4 || verifying}
              className="w-full py-3.5 bg-[#e00] text-white border-2 border-black font-black text-base comic-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-40"
            >
              {verifying ? '⏳ 验证中...' : '🚀 立即注册'}
            </button>
          )}

          {/* Close */}
          <button
            onClick={() => { setShowPaywall(false); setStep('upload'); }}
            className="text-center text-black/30 text-xs font-bold py-1 hover:text-[#e00] transition-colors"
          >
            下次再说
          </button>
        </div>
      </div>
    </div>
  );
}
