'use client';

import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { celebrities, scenarios } from '@/lib/celebrities';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function SelectScenario() {
  const { selectedCelebrityId, selectScenario, setStep, setGeneratedImages, userImage, setShowPaywall, canGenerate, getRemainingToday, isRegistered, fetchServerQuota, setRetryingVariant, setIsRetryingFlag, generationError, setGenerationError } =
    useAppStore();
  const celeb = celebrities.find((c) => c.id === selectedCelebrityId);
  const [loading, setLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  // 骰子状态
  const [rolling, setRolling] = useState(false);
  const [diceValue, setDiceValue] = useState(0);
  const [diceResult, setDiceResult] = useState<string | null>(null);

  // 重试时保留的生成参数
  const pendingRetry = useRef<{ scenarioId: string; customText?: string } | null>(null);

  const remaining = getRemainingToday();
  const registered = isRegistered();

  // 构建prompt（支持变体切换）
  const buildPrompt = useCallback((variantIndex: number, scenarioId: string, customText?: string): string => {
    if (!celeb) return '';
    const variants = celeb.promptVariants || [];
    const refPrompt = variants[variantIndex] || celeb.referencePrompt;

    if (customText && customText.trim()) {
      return `A photorealistic photograph: ${customText.trim()}. Two people standing together. On the left is ${refPrompt}. On the right is a person from the reference image with their exact face preserved. Both look natural and real. Natural lighting, candid moment, high quality photo.`;
    }
    const scenario = scenarios.find((s) => s.id === scenarioId) || scenarios[2];
    return `A photorealistic photograph of two people ${scenario.prompt}. On the left is ${refPrompt}. On the right is a person from the reference image with their exact face preserved. Both look natural and real. Natural lighting, candid moment, high quality photo.`;
  }, [celeb]);

  // 轮询任务结果
  const pollForResult = (taskId: string): Promise<{ imageUrl?: string; error?: string; code?: string }> => {
    return new Promise((resolve) => {
      const maxAttempts = 60;
      let attempts = 0;
      const poll = async () => {
        attempts++;
        try {
          const resp = await fetch(`/api/generate/start?taskId=${taskId}`);
          const data = await resp.json();
          if (data.status === 'success' && data.imageUrl) {
            resolve({ imageUrl: data.imageUrl });
          } else if (data.status === 'failed') {
            resolve({ error: data.error || '生成失败，请重试', code: data.code });
          } else if (data.status === 'error') {
            resolve({ error: data.error || '查询失败', code: data.code });
          } else if (attempts >= maxAttempts) {
            resolve({ error: '生成超时，请稍后重试', code: 'TIMEOUT' });
          } else {
            setTimeout(poll, 3000);
          }
        } catch {
          if (attempts >= maxAttempts) {
            resolve({ error: '网络异常，请重试', code: 'NETWORK_ERROR' });
          } else {
            setTimeout(poll, 3000);
          }
        }
      };
      setTimeout(poll, 2000);
    });
  };

  // 核心生成逻辑（内部封装，支持变体切换）
  const doGenerate = async (scenarioId: string, variantIndex: number, customText?: string) => {
    selectScenario(scenarioId);
    setStep('generating');

    try {
      const prompt = buildPrompt(variantIndex, scenarioId, customText);

      const resp = await fetch('/api/generate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, userImageBase64: userImage || undefined, celebrityId: selectedCelebrityId || undefined }),
        signal: AbortSignal.timeout(60_000), // 60秒超时
      });

      const data = await resp.json();

      // 配额/服务器直接错误（不走异步）
      if (!resp.ok) {
        const errMsg = data.error || '生成失败，请稍后重试';
        if (data.code === 'QUOTA_EXCEEDED') {
          setGenerationError(errMsg);
        } else if (data.code === 'CONCURRENCY_LIMIT') {
          setGenerationError('当前生成请求较多，请稍后再试 🔄');
        } else if (data.code === 'RATE_LIMIT') {
          setGenerationError('请求过于频繁，请1分钟后再试 ⏳');
        } else {
          setGenerationError(errMsg);
        }
        setStep('scenario');
        return;
      }

      if (data.imageUrl) {
        setGeneratedImages([`/api/image-proxy?url=${encodeURIComponent(data.imageUrl)}`]);
        setStep('result');
        return;
      }

      if (data.taskId) {
        const result = await pollForResult(data.taskId);
        if (result.imageUrl) {
          setGeneratedImages([`/api/image-proxy?url=${encodeURIComponent(result.imageUrl)}`]);
          return;
        }

        // 生成失败：判断是否要自动换变体重试
        const variants = celeb?.promptVariants || [];
        const canRetry = result.code === 'CONTENT_BLOCKED' || result.code === 'GENERATION_FAILED';
        const hasMoreVariants = variantIndex < variants.length - 1;

        if (canRetry && hasMoreVariants) {
          // 自动换prompt变体重试
          const nextVariant = variantIndex + 1;
          console.log(`Prompt variant ${variantIndex} blocked, trying variant ${nextVariant}`);
          setRetryingVariant(nextVariant);
          setIsRetryingFlag(true);
          setIsRetrying(true);
          // 短暂提示后重新生成
          setTimeout(() => {
            doGenerate(scenarioId, nextVariant, customText);
          }, 1200);
          return;
        }

        // 无更多变体或非审核类错误，展示友好提示
        let friendlyMsg = result.error || '生成失败，请重试';
        if (result.code === 'CONTENT_BLOCKED') {
          friendlyMsg = `这个场景对${celeb?.name}来说有点难合成 😔 可以尝试：\n① 换个场景 ② 换个名人 ③ 稍后再试`;
        } else if (result.code === 'RATE_LIMIT') {
          friendlyMsg = '服务器太火爆了，请1分钟后再试 🔥';
        } else if (result.code === 'ACCOUNT_RESTRICTED') {
          friendlyMsg = '系统繁忙，请30分钟后再试 😴';
        } else if (result.code === 'TIMEOUT') {
          friendlyMsg = '生成超时了，服务器有点忙 😅 稍后再试吧';
        } else if (result.code === 'NETWORK_ERROR') {
          friendlyMsg = '网络波动，生成中断了 😤 重新试一次？';
        }
        setGenerationError(friendlyMsg);
        setStep('scenario');
        setIsRetrying(false);
        setIsRetryingFlag(false);
        setRetryingVariant(-1);
        return;
      }

      setGenerationError(`${celeb?.name || '该人物'} 暂时不可用`);
      setStep('scenario');
    } catch (err: any) {
      const msg = err?.name === 'TimeoutError' ? '生成超时，请稍后重试' : '网络异常，请重试';
      setGenerationError(msg);
      setStep('scenario');
    } finally {
      setLoading(false);
      setIsRetryingFlag(false);
      setIsRetrying(false);
      fetchServerQuota();
    }
  };

  // 对外暴露的生成入口
  const handleGenerate = async (scenarioId: string, customText?: string) => {
    if (loading && !isRetrying) return;

    if (!canGenerate() && !isRetrying) {
      if (registered) {
        alert('今日生成次数已用完，明天再来或邀请好友获取更多次数！');
      } else {
        setShowPaywall(true);
      }
      return;
    }

    if (!selectedCelebrityId) return;

    setLoading(true);
    setGenerationError(null);
    setRetryingVariant(-1);
    pendingRetry.current = { scenarioId, customText };

    // 先进入 generating 页面
    setStep('generating');

    await doGenerate(scenarioId, 0, customText);
  };

  // 重试（保留当前参数，从变体1开始重试）
  const handleRetry = () => {
    if (!pendingRetry.current) return;
    setLoading(true);
    setGenerationError(null);
    setRetryingVariant(1);
    setIsRetryingFlag(true);
    setIsRetrying(true);
    const { scenarioId, customText } = pendingRetry.current;
    doGenerate(scenarioId, 1, customText);
  };

  const handleCustomGenerate = () => {
    if (!customPrompt.trim()) return;
    handleGenerate('custom', customPrompt);
  };

  // 骰子随机场景
  const handleDiceRoll = useCallback(() => {
    if (rolling || loading) return;
    setRolling(true);
    setDiceResult(null);

    let count = 0;
    const totalFrames = 15;
    const interval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6));
      count++;
      if (count >= totalFrames) {
        clearInterval(interval);
        const finalIndex = Math.floor(Math.random() * scenarios.length);
        setDiceValue(finalIndex % 6);
        setDiceResult(scenarios[finalIndex].label);
        setRolling(false);
        setTimeout(() => handleGenerate(scenarios[finalIndex].id), 600);
      }
    }, 80);
  }, [rolling, loading]);

  const scenarioColors = [
    'hover:bg-[#e00] hover:text-white',
    'hover:bg-[#ff0] hover:text-black',
    'hover:bg-[#0cf] hover:text-black',
    'hover:bg-[#0f0] hover:text-black',
    'hover:bg-[#f90] hover:text-black',
    'hover:bg-[#ff69b4] hover:text-white',
    'hover:bg-[#9b59b4] hover:text-white',
    'hover:bg-[#ff0] hover:text-black',
  ];

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 mt-4 px-4">
      {celeb && (
        <div className="flex items-center gap-3 p-3 bg-[#ff0] comic-border comic-shadow">
          <div className="text-4xl">{celeb.avatarUrl}</div>
          <div>
            <p className="font-black text-lg">{celeb.name}</p>
            <p className="text-xs font-bold text-black/50">{celeb.nameEn}</p>
          </div>
        </div>
      )}

      <div className="text-center">
        <span className="text-2xl font-black text-[#e00]" style={{ WebkitTextStroke: '1px #000' }}>
          选个场景！💥
        </span>
      </div>

      {/* 🎲 骰子区域 */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleDiceRoll}
          disabled={rolling || loading}
          className={`group flex items-center gap-2 px-5 py-2.5 bg-[#ff0] comic-border font-black text-sm transition-all disabled:opacity-50 ${
            rolling ? '' : 'hover:translate-y-[-3px] hover:comic-shadow-sm hover:bg-[#0cf]'
          }`}
        >
          <span className={`text-2xl transition-transform ${rolling ? 'animate-dice-spin' : 'group-hover:scale-125 group-hover:rotate-12'}`}>
            {DICE_FACES[diceValue] || '🎲'}
          </span>
          <span>{rolling ? '🎲 掷骰中...' : '🎲 随机场景'}</span>
        </button>
        {diceResult && !rolling && (
          <div className="text-xs font-black text-[#e00] animate-bounce-in">
            ✨ 命中：{diceResult}！
          </div>
        )}
      </div>

      {/* 错误展示 + 重试按钮 */}
      {generationError && (
        <div className="flex flex-col gap-2">
          <div className="bg-[#e00] text-white comic-border-thin px-4 py-3 text-sm font-bold flex items-start gap-2 leading-snug">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span className="whitespace-pre-line">{generationError}</span>
          </div>
          {pendingRetry.current && (
            <button
              onClick={handleRetry}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 bg-[#ff0] comic-border font-black text-sm hover:bg-[#0cf] transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  {isRetrying ? (
                    <span>正在重新生成（换一套描述）...</span>
                  ) : (
                    <span>重试中...</span>
                  )}
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>重新生成（已自动换描述）</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* 正在切换prompt变体中的提示 */}
      {isRetrying && !generationError && (
        <div className="bg-[#0cf] text-black comic-border-thin px-4 py-3 text-sm font-bold flex items-center gap-2 animate-pulse">
          <span>🔄</span>
          <span>检测到合成失败，自动切换描述重试中...</span>
        </div>
      )}

      {/* 剩余次数提示 */}
      <div className={`text-center text-xs font-bold py-1 ${remaining <= 0 ? 'text-[#e00]' : remaining === 1 ? 'text-[#f90]' : 'text-black/40'}`}>
        {remaining > 0
          ? `今日剩余 ${remaining} 次免费${registered ? '' : ' · 注册后每天仍6次'}`
          : `${registered ? '今日次数已用完 · 邀请好友+3次' : '免费次数已用完 · 注册后每天仍6次'}`
        }
      </div>

      <div className="grid grid-cols-2 gap-3">
        {scenarios.map((s, i) => (
          <button
            key={s.id}
            onClick={() => handleGenerate(s.id)}
            disabled={loading}
            className={`flex flex-col items-center gap-2 p-4 bg-white comic-border-thin ${scenarioColors[i]} hover:translate-y-[-3px] hover:comic-shadow-sm transition-all group disabled:opacity-50 disabled:pointer-events-none`}
          >
            <span className="text-3xl group-hover:scale-125 transition-transform">{s.emoji}</span>
            <span className="text-sm font-black">{s.label}</span>
          </button>
        ))}

        {/* 自定义场景按钮 */}
        <button
          onClick={() => setShowCustom(!showCustom)}
          disabled={loading}
          className={`flex flex-col items-center gap-2 p-4 bg-white comic-border-thin hover:bg-[#8b5cf6] hover:text-white hover:translate-y-[-3px] hover:comic-shadow-sm transition-all group disabled:opacity-50 disabled:pointer-events-none col-span-2`}
        >
          <span className="text-3xl group-hover:scale-125 transition-transform">✏️</span>
          <span className="text-sm font-black">自定义场景 {registered ? '✅' : '🔒 注册'}</span>
        </button>
      </div>

      {/* 自定义场景输入框 */}
      {showCustom && (
        <div className="flex flex-col gap-2 animate-bounce-in">
          {!registered ? (
            <button
              onClick={() => setShowPaywall(true)}
              className="text-center text-xs font-bold text-[#8b5cf6] py-2 hover:underline"
            >
              🔓 注册后可使用自定义场景 →
            </button>
          ) : (
            <>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={"描述你想要的场景，比如：\n我和Taylor Swift在月球上喝咖啡\n我跟Messi一起在马拉卡纳球场踢球\n我和Spider-Man在纽约街头吃热狗"}
                rows={3}
                maxLength={200}
                className="w-full p-3 border-2 border-black text-sm font-bold focus:outline-none focus:border-[#8b5cf6] resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCustomGenerate}
                  disabled={loading || !customPrompt.trim()}
                  className="flex-1 py-3 bg-[#8b5cf6] text-white border-2 border-black font-black text-sm comic-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-40"
                >
                  {loading ? '⏳ 生成中...' : '🎨 生成自定义合影'}
                </button>
              </div>
              <p className="text-[10px] text-black/30 text-center">支持中英文描述 · 越具体效果越好</p>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setStep('select')}
        disabled={loading}
        className="text-center text-black/40 text-sm font-bold py-2 hover:text-[#e00] transition-colors disabled:opacity-30"
      >
        ← 换个名人
      </button>
    </div>
  );
}
