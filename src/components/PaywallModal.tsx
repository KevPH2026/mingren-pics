'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';

type Step = 'email' | 'code' | 'set-password' | 'login-password' | 'reset-password' | 'success';

export default function PaywallModal() {
  const { setShowPaywall } = useAppStore();

  // --- common state ---
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [signature, setSignature] = useState('');

  // --- password flow state ---
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetCodeSending, setResetCodeSending] = useState(false);
  const [resetCodeSubmitting, setResetCodeSubmitting] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(0);
  const [resetError, setResetError] = useState('');

  // --- success state ---
  const [referralCode, setReferralCode] = useState('');

  // 获取 pending ref
  const pendingRef = typeof window !== 'undefined' ? localStorage.getItem('mingren_pending_ref') : null;

  // auto-fill email from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mingren_email');
    if (saved) setEmail(saved);
  }, []);

  // --- helpers ---
  const maskEmail = (e: string) => {
    const [user, domain] = e.split('@');
    if (!domain) return e;
    const masked = user.length <= 2 ? user[0] + '***' : user[0] + '***' + user.slice(-1);
    return `${masked}@${domain}`;
  };

  const startCountdown = () => {
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
  };

  const handleLoginSuccess = async (data: {
    email: string;
    referralCode?: string;
  }) => {
    localStorage.setItem('mingren_registered', '1');
    localStorage.setItem('mingren_email', data.email);
    if (pendingRef) localStorage.removeItem('mingren_pending_ref');
    if (data.referralCode) {
      localStorage.setItem('mingren_referral_code', data.referralCode);
      setReferralCode(data.referralCode);
    }
    const { fetchServerQuota } = useAppStore.getState();
    await fetchServerQuota();
  };

  // --- actions ---
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
      if (data.signature) setSignature(data.signature);
      setSent(true);
      setStep('code');
      startCountdown();
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

      localStorage.setItem('mingren_email', email);

      if (data.isNewUser) {
        // 新用户 → set-password
        setIsNewUser(true);
        setTempToken(data.tempToken);
        setStep('set-password');
      } else {
        // 老用户 → login-password
        setIsNewUser(false);
        setStep('login-password');
      }
    } catch {
      setError('网络异常');
      setVerifying(false);
    }
  };

  const handleSetPassword = async () => {
    if (password.length < 6) {
      setPasswordError('密码至少6位');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('两次密码不一致');
      return;
    }
    setSettingPassword(true);
    setPasswordError('');
    try {
      const resp = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, tempToken }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setPasswordError(data.error || '设置密码失败');
        setSettingPassword(false);
        return;
      }
      await handleLoginSuccess(data);
      setStep('success');
    } catch {
      setPasswordError('网络异常');
      setSettingPassword(false);
    }
  };

  const handleLogin = async () => {
    if (!password) {
      setPasswordError('请输入密码');
      return;
    }
    setLoggingIn(true);
    setPasswordError('');
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setPasswordError(data.error || '登录失败');
        setLoggingIn(false);
        return;
      }
      await handleLoginSuccess(data);
      setStep('success');
    } catch {
      setPasswordError('网络异常');
      setLoggingIn(false);
    }
  };

  // --- login success auto-close ---
  useEffect(() => {
    if (step === 'success' && !isNewUser) {
      const timer = setTimeout(() => {
        setShowPaywall(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, isNewUser, setShowPaywall]);

  // ============================
  // Render: success
  // ============================
  if (step === 'success') {
    const link = referralCode ? `https://mingren.pics/?ref=${referralCode}` : '';

    // 老用户登录成功 — 简短提示后自动关闭
    if (!isNewUser) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white comic-border animate-bounce-in">
            <div className="bg-green-500 text-white text-center py-8 border-b-4 border-black">
              <p className="text-3xl font-black">🎉 登录成功！</p>
              <p className="text-xs font-bold mt-2 opacity-80">正在跳转...</p>
            </div>
          </div>
        </div>
      );
    }

    // 新用户注册成功 — 显示邀请码
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPaywall(false)} />
        <div className="relative w-full max-w-sm bg-white comic-border animate-bounce-in max-h-[90vh] overflow-y-auto">
          <div className="bg-green-500 text-white text-center py-4 border-b-4 border-black">
            <p className="text-2xl font-black">🎉 注册成功！</p>
            <p className="text-xs font-bold mt-1 opacity-80">每天3次免费生成已解锁</p>
          </div>
          <div className="p-5 flex flex-col gap-4">
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

  // ============================
  // Render: set-password (new user)
  // ============================
  if (step === 'set-password') {
    const canSubmit = password.length >= 6 && password === confirmPassword && !settingPassword;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPaywall(false)} />
        <div className="relative w-full max-w-sm bg-white comic-border animate-bounce-in">
          <div className="bg-[#8b5cf6] text-white text-center py-4 border-b-4 border-black">
            <p className="text-2xl font-black" style={{ WebkitTextStroke: '1px #000' }}>
              🔒 设置你的密码
            </p>
            <p className="text-xs font-bold mt-1 opacity-80">6位以上，用于下次快速登录</p>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {passwordError && (
              <div className="text-center text-xs font-bold text-[#e00] bg-[#e00]/10 py-2 rounded">
                {passwordError}
              </div>
            )}

            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
              placeholder="🔑 设置密码（6位以上）"
              className="w-full py-3 px-3 border-2 border-black text-sm font-bold focus:outline-none focus:border-[#8b5cf6]"
            />

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
              placeholder="🔑 再次输入密码"
              className="w-full py-3 px-3 border-2 border-black text-sm font-bold focus:outline-none focus:border-[#8b5cf6]"
            />

            {/* real-time validation hints */}
            <div className="flex flex-col gap-1 text-xs font-bold">
              <span className={password.length >= 6 ? 'text-green-500' : 'text-black/30'}>
                {password.length >= 6 ? '✅' : '⬜'} 密码至少6位
              </span>
              <span className={password === confirmPassword && confirmPassword.length > 0 ? 'text-green-500' : 'text-black/30'}>
                {password === confirmPassword && confirmPassword.length > 0 ? '✅' : '⬜'} 两次密码一致
              </span>
            </div>

            <button
              onClick={handleSetPassword}
              disabled={!canSubmit}
              className="w-full py-3.5 bg-[#8b5cf6] text-white border-2 border-black font-black text-base comic-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-40"
            >
              {settingPassword ? '⏳ 注册中...' : '🚀 完成注册'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================
  // Render: reset-password (forgot password flow)
  // ============================
  if (step === 'reset-password') {
    const handleResetSubmit = async () => {
      if (resetCode.length < 6) return;
      setResetCodeSubmitting(true);
      setResetError('');
      try {
        const verifyResp = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: resetCode, signature }),
        });
        const verifyData = await verifyResp.json();
        if (!verifyResp.ok) { setResetError(verifyData.error || '验证失败'); setResetCodeSubmitting(false); return; }

        const setResp = await fetch('/api/auth/set-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, tempToken: verifyData.tempToken }),
        });
        const setData = await setResp.json();
        if (!setResp.ok) { setResetError(setData.error || '设置密码失败'); setResetCodeSubmitting(false); return; }

        await handleLoginSuccess(setData);
        setResetMode(false);
        setStep('success');
      } catch { setResetError('网络异常'); }
      setResetCodeSubmitting(false);
    };

    const handleResendResetCode = async () => {
      setResetCodeSending(true);
      try {
        const resp = await fetch('/api/auth/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await resp.json();
        if (!resp.ok) { setResetError(data.error || '发送失败'); setResetCodeSending(false); return; }
        setSignature(data.signature || '');
        setResetCountdown(60);
        const t = setInterval(() => {
          setResetCountdown((p) => {
            if (p <= 1) { clearInterval(t); return 0; }
            return p - 1;
          });
        }, 1000);
      } catch { setResetError('网络异常'); }
      setResetCodeSending(false);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPaywall(false)} />
        <div className="relative w-full max-w-sm bg-white comic-border animate-bounce-in">
          <div className="bg-[#e00] text-white text-center py-4 border-b-4 border-black">
            <p className="text-2xl font-black">🔑 重设密码</p>
            <p className="text-xs font-bold mt-1 opacity-80">输入新密码 + 验证码完成重设</p>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {resetError && (
              <div className="text-center text-xs font-bold text-[#e00] bg-[#e00]/10 py-2 rounded">{resetError}</div>
            )}
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setResetError(''); }}
              placeholder="🔑 新密码（6位以上）"
              className="w-full py-3 px-3 border-2 border-black text-sm font-bold focus:outline-none focus:border-[#8b5cf6]"
            />
            <input
              type="text"
              value={resetCode}
              onChange={(e) => { setResetCode(e.target.value.replace(/\D/g, '')); setResetError(''); }}
              placeholder="🔢 输入6位验证码"
              maxLength={6}
              className="w-full py-3 px-3 border-2 border-black text-sm font-bold text-center tracking-[6px] focus:outline-none focus:border-[#8b5cf6]"
            />
            <button
              onClick={handleResetSubmit}
              disabled={password.length < 6 || resetCode.length < 6 || resetCodeSubmitting}
              className="w-full py-3.5 bg-[#e00] text-white border-2 border-black font-black text-base comic-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-40"
            >
              {resetCodeSubmitting ? '⏳ 验证中...' : '🚀 重设密码'}
            </button>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-black/40">没收到？</span>
              {resetCountdown > 0 ? (
                <span className="text-xs font-bold text-black/30">{resetCountdown}s</span>
              ) : (
                <button onClick={handleResendResetCode} disabled={resetCodeSending} className="text-xs font-bold text-[#8b5cf6] hover:underline disabled:opacity-40">重新发送</button>
              )}
            </div>
            <button
              onClick={() => { setStep('login-password'); setResetMode(false); setResetCode(''); setResetError(''); }}
              className="text-center text-black/30 text-xs font-bold py-1 hover:text-[#8b5cf6] transition-colors"
            >
              ← 返回登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================
  // Render: login-password (existing user / quick login)
  // ============================
  if (step === 'login-password') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPaywall(false)} />
        <div className="relative w-full max-w-sm bg-white comic-border animate-bounce-in">
          <div className="bg-[#8b5cf6] text-white text-center py-4 border-b-4 border-black">
            <p className="text-2xl font-black" style={{ WebkitTextStroke: '1px #000' }}>
              🔑 密码登录
            </p>
            <p className="text-xs font-bold mt-1 opacity-80">{maskEmail(email)}</p>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {passwordError && (
              <div className="text-center text-xs font-bold text-[#e00] bg-[#e00]/10 py-2 rounded">
                {passwordError}
              </div>
            )}

            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
              placeholder="🔑 输入密码"
              className="w-full py-3 px-3 border-2 border-black text-sm font-bold focus:outline-none focus:border-[#8b5cf6]"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />

            <button
              onClick={handleLogin}
              disabled={!password || loggingIn}
              className="w-full py-3.5 bg-[#8b5cf6] text-white border-2 border-black font-black text-base comic-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-40"
            >
              {loggingIn ? '⏳ 登录中...' : '🚀 登录'}
            </button>

            <button
              onClick={() => { setPassword(''); setPasswordError(''); setStep('code'); }}
              className="text-center text-black/40 text-xs font-bold py-1 hover:text-[#8b5cf6] transition-colors"
            >
              ← 用验证码登录
            </button>

            {/* 忘记密码 → 重发验证码 → 走 set-password 流程 */}
            <button
              onClick={async () => {
                setPasswordError('');
                setLoggingIn(true);
                try {
                  const resp = await fetch('/api/auth/send-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                  });
                  const data = await resp.json();
                  if (!resp.ok) { setPasswordError(data.error || '发送失败'); setLoggingIn(false); return; }
                  setSignature(data.signature || '');
                  setIsNewUser(false);
                  setResetMode(true);
                  setStep('reset-password');
                } catch { setPasswordError('网络异常'); }
                setLoggingIn(false);
              }}
              disabled={loggingIn}
              className="text-center text-[#e00] text-xs font-bold py-1 hover:underline disabled:opacity-40"
            >
              🔑 忘记密码？用验证码重设
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================
  // Render: code step
  // ============================
  if (step === 'code') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPaywall(false)} />
        <div className="relative w-full max-w-sm bg-white comic-border animate-bounce-in">
          <div className="bg-[#8b5cf6] text-white text-center py-4 border-b-4 border-black">
            <p className="text-2xl font-black" style={{ WebkitTextStroke: '1px #000' }}>
              🎉 解锁完整功能
            </p>
            <p className="text-xs font-bold mt-1 opacity-80">验证码已发送至 {maskEmail(email)}</p>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {error && (
              <div className="text-center text-xs font-bold text-[#e00] bg-[#e00]/10 py-2 rounded">
                {error}
              </div>
            )}

            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
              placeholder="🔢 输入6位验证码"
              maxLength={6}
              className="w-full py-3 px-3 border-2 border-black text-sm font-bold text-center tracking-[6px] focus:outline-none focus:border-[#8b5cf6]"
            />

            <button
              onClick={handleVerify}
              disabled={code.length < 6 || verifying}
              className="w-full py-3.5 bg-[#8b5cf6] text-white border-2 border-black font-black text-base comic-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-40"
            >
              {verifying ? '⏳ 验证中...' : '🚀 立即注册'}
            </button>

            {/* resend */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-black/40">没收到？</span>
              {countdown > 0 ? (
                <span className="text-xs font-bold text-black/30">{countdown}s 后重发</span>
              ) : (
                <button
                  onClick={handleSendCode}
                  disabled={sending}
                  className="text-xs font-bold text-[#8b5cf6] hover:underline disabled:opacity-40"
                >
                  重新发送
                </button>
              )}
            </div>

            <button
              onClick={() => { setStep('email'); setCode(''); setSent(false); setError(''); }}
              className="text-center text-black/30 text-xs font-bold py-1 hover:text-[#e00] transition-colors"
            >
              ← 返回修改邮箱
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================
  // Render: email step (default)
  // ============================
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
              className="flex-1 py-3 px-3 border-2 border-black text-sm font-bold focus:outline-none focus:border-[#8b5cf6]"
            />
            <button
              onClick={handleSendCode}
              disabled={sending || !email}
              className="px-4 py-3 bg-[#ff0] border-2 border-black font-black text-xs hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-40 whitespace-nowrap"
            >
              {sending ? '⏳' : '验证码'}
            </button>
          </div>

          <button
            onClick={() => {
              if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setError('请先输入有效邮箱');
                return;
              }
              setPassword('');
              setPasswordError('');
              setStep('login-password');
            }}
            className="text-center text-[#8b5cf6] text-xs font-bold py-1 hover:underline transition-colors"
          >
            已有账号？密码登录 →
          </button>

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
