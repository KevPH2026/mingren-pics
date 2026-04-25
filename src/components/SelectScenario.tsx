'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { celebrities, scenarios } from '@/lib/celebrities';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function SelectScenario() {
  const { selectedCelebrityId, selectScenario, setStep, setGeneratedImages, userImage, setShowPaywall, canGenerate, getRemainingToday, isRegistered, fetchServerQuota } =
    useAppStore();
  const celeb = celebrities.find((c) => c.id === selectedCelebrityId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  // 骰子状态
  const [rolling, setRolling] = useState(false);
  const [diceValue, setDiceValue] = useState(0);
  const [diceResult, setDiceResult] = useState<string | null>(null);

  const remaining = getRemainingToday();
  const registered = isRegistered();

  const handleGenerate = async (scenarioId: string, customText?: string) => {
    if (loading) return;

    if (!canGenerate()) {
      if (registered) {
        alert('今日生成次数已用完，明天再来或邀请好友获取更多次数！');
      } else {
        setShowPaywall(true);
      }
      return;
    }

    selectScenario(scenarioId);
    setLoading(true);
    setError(null);

    if (!selectedCelebrityId) return;

    let prompt: string;

    if (customText && customText.trim()) {
      prompt = `Create a photorealistic photograph: ${customText.trim()}. The photo features two real people standing together. Person A is a famous celebrity who looks exactly like this: ${celeb?.referencePrompt}. Generate their face with highly recognizable celebrity features — make it look like a real photo of this famous person, not a generic lookalike. Person B is from the reference image — preserve their exact face, identity and appearance. Both people should look equally real and natural. Natural lighting, authentic candid moment, high quality DSLR photo.`;
    } else {
      const scenario = scenarios.find((s) => s.id === scenarioId) || scenarios[2];
      prompt = `Create a photorealistic photograph of two real people ${scenario.prompt}. Person A is a famous celebrity who looks exactly like this: ${celeb?.referencePrompt}. Generate their face with highly recognizable celebrity features — make it look like a real photo of this famous person, not a generic lookalike. Person B is from the reference image — preserve their exact face, identity and appearance. Both people should look equally real and natural. Natural lighting, authentic candid moment, DSLR quality.`;
    }

    setStep('generating');

    try {
      const resp = await fetch('/api/generate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          userImageBase64: userImage || undefined,
        }),
        signal: AbortSignal.timeout(120_000),
      });

      const data = await resp.json();

      // 任何非成功状态码都停止，不重试
      if (!resp.ok) {
        const errMsg = data.error || '生成失败，请稍后重试';
        // 503 = 账号限制/维护中, 502/504 = 上游故障
        setError(resp.status === 503 ? errMsg : `${celeb?.name || '该人物'} 暂时不可用，请稍后再试或换个人物`);
        setStep('scenario');
        return;
      }

      if (data.images) {
        setGeneratedImages(data.images);
      } else if (data.imageUrl) {
        await downloadAndSet(data.imageUrl);
      } else {
        setError(`${celeb?.name || '该人物'} 暂时不可用，请稍后再试或换个人物`);
        setStep('scenario');
      }
    } catch (err: any) {
      const msg = err?.name === 'TimeoutError' ? '生成超时，请稍后重试' : '网络异常，请重试';
      setError(msg);
      setStep('scenario');
    } finally {
      setLoading(false);
      // Refresh quota from server (server set new cookie)
      fetchServerQuota();
    }
  };

  const downloadAndSet = async (imageUrl: string) => {
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    const imgResp = await fetch(proxyUrl);
    const blob = await imgResp.blob();
    return new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        setGeneratedImages([reader.result as string]);
        resolve();
      };
      reader.readAsDataURL(blob);
    });
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
        // 自动触发生成
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

      {error && (
        <div className="bg-[#e00] text-white comic-border-thin px-4 py-3 text-sm font-bold flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* 剩余次数提示 */}
      <div className={`text-center text-xs font-bold py-1 ${remaining <= 0 ? 'text-[#e00]' : remaining === 1 ? 'text-[#f90]' : 'text-black/40'}`}>
        {remaining > 0
          ? `今日剩余 ${remaining} 次免费${registered ? '' : ' · 注册后每天3次'}`
          : `${registered ? '今日次数已用完 · 邀请好友+3次' : '免费次数已用完 · 注册后每天3次'}`
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
