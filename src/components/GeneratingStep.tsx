'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { celebrities, scenarios } from '@/lib/celebrities';

const phases = [
  { text: '🔍 识别人脸特征...', duration: 10 },
  { text: '🎭 匹配名人面部...', duration: 22 },
  { text: '📐 合成光影角度...', duration: 40 },
  { text: '🎨 渲染高清合影...', duration: 75 },
  { text: '✨ AI 最后润色...', duration: 120 },
];

// 重试时显示的专属phase
const retryPhases = [
  { text: '🔄 切换描述方案...', duration: 5 },
  { text: '🎨 重新合成...', duration: 10 },
  { text: '📐 调整光影...', duration: 15 },
  { text: '🎨 渲染中...', duration: 20 },
  { text: '✨ 最后润色...', duration: 25 },
];

const funFacts = [
  { emoji: '🧠', text: 'AI生成一张合影需要分析超过1亿个参数，比人脑眨一次眼还复杂' },
  { emoji: '📸', text: '全球每天产生超过50亿张照片，但跟名人合影的机会不到0.001%' },
  { emoji: '🎨', text: 'AI学会了光影物理——它知道逆光时人的脸应该是暗的' },
  { emoji: '🎪', text: '历史上第一张照片拍摄于1826年，曝光时间长达8小时' },
  { emoji: '🎭', text: 'AI能识别68个人脸关键点，比专业化妆师还精准' },
  { emoji: '🌍', text: '如果你能跟地球上每个人拍一张合影，每天拍1000张需要22000年' },
  { emoji: '🤖', text: '这个AI模型读过互联网上几乎所有公开照片——它见过的人比你多' },
  { emoji: '💫', text: '一张1024×1024的AI图片包含超过100万个像素，每个都是"算"出来的' },
  { emoji: '🎬', text: '好莱坞特效团队做一张合影合成要6小时，AI只需要30秒' },
  { emoji: '🎲', text: 'AI每次生成都是独一无二的——即使同样的提示词，结果也绝不重复' },
  { emoji: '👁️', text: 'AI通过分析100亿张图片学会了"美"的标准，但它偶尔会翻车' },
  { emoji: '⚡', text: '生成这张合影消耗的算力，可以让一部手机充满50次电' },
  { emoji: '🏆', text: '梅西职业生涯进球数超过800个，但跟你合影这球还是第一次' },
  { emoji: '🎵', text: 'Taylor Swift的"Shake It Off"已经播放超过30亿次' },
  { emoji: '🚀', text: 'Elon Musk的SpaceX火箭已经成功回收超过200次' },
  { emoji: '⚽', text: 'C罗每天训练超过3小时，自律程度堪比AI' },
  { emoji: '📱', text: '人类拍照的第一需求是"看起来好看"，AI也是这么被训练的' },
  { emoji: '🔬', text: 'AI不懂什么是"好看"，它只是记住了几百亿组"好看"的数学规律' },
  { emoji: '🎭', text: 'Lisa的舞蹈视频在YouTube上累计播放超过100亿次' },
  { emoji: '🎧', text: '周杰伦的《稻香》发行于2008年，但每次听都有初见的感觉' },
  { emoji: '🏀', text: 'LeBron James是NBA历史上唯一一位得分超过40000分的球员' },
  { emoji: '🏆', text: 'Lady Gaga的Met Gala造型每次都能上热搜——AI都学不来那种前卫' },
  { emoji: '🌟', text: 'IU出道时才15岁，现在已经是韩国国民级歌手' },
  { emoji: '⚽', text: 'BTS的ARMY粉丝遍布全球，数量比一些小国的人口还多' },
  { emoji: '🤳', text: '研究表明看到自己的合影会分泌多巴胺——这就是为什么你这么期待结果' },
  { emoji: '💡', text: 'AI绘图技术的突破源于2014年的一篇论文"Generative Adversarial Networks"' },
  { emoji: '🔥', text: '这张图发到朋友圈，预计能让你的获赞数提升300%（我们的非官方统计）' },
  { emoji: '🎨', text: 'AI用到的技术叫"扩散模型"——先画噪声再慢慢变清晰，像从迷雾中显影' },
  { emoji: '✨', text: '你正在参与一场AI革命——5年前这还是科幻电影里的情节' },
];

export default function GeneratingStep() {
  const selectedCelebrityId = useAppStore((s) => s.selectedCelebrityId);
  const selectedScenarioId = useAppStore((s) => s.selectedScenarioId);
  const userImage = useAppStore((s) => s.userImage);
  const retryingVariant = useAppStore((s) => s.retryingVariant);
  const isRetryingFlag = useAppStore((s) => s.isRetryingFlag);
  const celeb = celebrities.find((c) => c.id === selectedCelebrityId);
  const scenario = scenarios.find((s) => s.id === selectedScenarioId);
  const [elapsed, setElapsed] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [factIndex, setFactIndex] = useState(() => Math.floor(Math.random() * funFacts.length));
  const [fadeClass, setFadeClass] = useState('opacity-100');
  const startTime = useRef(Date.now());

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      const sec = Math.floor((Date.now() - startTime.current) / 1000);
      setElapsed(sec);

      // Phase transitions
      const currentPhases = isRetryingFlag ? retryPhases : phases;
      let cumulative = 0;
      for (let i = 0; i < currentPhases.length; i++) {
        cumulative += currentPhases[i].duration;
        if (sec < cumulative) {
          setPhaseIndex(i);
          break;
        }
      }

      // Progress: slow ease-out curve, maxes at 88% then waits for real result
      // Designed for ~90s actual generation time
      const p = Math.min(88, 88 * (1 - Math.exp(-sec / 45)));
      setProgress(Math.round(p));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // Rotate fun facts every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setFadeClass('opacity-0');
      setTimeout(() => {
        setFactIndex((prev) => (prev + 1) % funFacts.length);
        setFadeClass('opacity-100');
      }, 400);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const currentFact = funFacts[factIndex];

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-5 mt-8 px-4 pb-8">
      {/* Face merge preview */}
      <div className="relative flex items-center justify-center gap-0">
        {/* Outer glow ring */}
        <div className="absolute inset-[-12px] rounded-full border-4 border-[#ff0]/30 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-[-6px] rounded-full border-2 border-[#e00]/20 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />

        {/* User face */}
        <div className="w-24 h-24 rounded-full overflow-hidden comic-border bg-white z-10 transition-transform" style={{ transform: progress > 40 ? 'translateX(4px)' : 'translateX(0)' }}>
          {userImage ? (
            <img src={userImage} alt="你" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
          )}
        </div>

        {/* Merge animation */}
        <div className="absolute left-1/2 -translate-x-1/2 z-20">
          <div className={`w-10 h-10 rounded-full comic-border-thin flex items-center justify-center text-lg transition-all duration-1000 ${progress > 50 ? 'bg-[#e00] scale-125' : 'bg-[#ff0] animate-pulse'}`}>
            {progress > 70 ? '🔥' : progress > 40 ? '⚡' : '✨'}
          </div>
        </div>

        {/* Celebrity face */}
        <div className="w-24 h-24 rounded-full overflow-hidden comic-border bg-white z-10 transition-transform" style={{ transform: progress > 40 ? 'translateX(-4px)' : 'translateX(0)' }}>
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {celeb?.avatarUrl || '⭐'}
          </div>
        </div>
      </div>

      {/* Merge progress hint */}
      {progress > 30 && progress < 85 && (
        <div className="text-[10px] font-black text-[#e00] animate-bounce" style={{ marginTop: '-8px' }}>
          {progress > 60 ? '🎨 正在渲染细节...' : '⚡ 人脸融合中...'}
        </div>
      )}

      {/* Title */}
      <div className="text-center">
        <div
          className="text-2xl font-black text-[#e00]"
          style={{ WebkitTextStroke: '1px #000' }}
        >
          {isRetryingFlag ? 'AI正在重新合成 🔄' : 'AI正在合成合影'}
        </div>
        <div className="text-sm font-bold text-black/50 mt-1">
          {celeb?.name} × 你 · {scenario?.label || ''}
          {isRetryingFlag && retryingVariant > 0 && (
            <span className="ml-2 text-[10px] bg-[#0cf] px-2 py-0.5 rounded-full">
              第{retryingVariant + 1}套方案
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="w-full h-5 bg-white comic-border-thin overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-[#e00] via-[#ff0] to-[#0f0] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-black text-black drop-shadow-sm">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Phase text */}
      <div className="bg-[#ff0] comic-border-thin px-5 py-2 font-black text-sm animate-wiggle">
        {isRetryingFlag ? retryPhases[phaseIndex]?.text : phases[phaseIndex]?.text}
      </div>

      {/* Timer + hint */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl font-black font-mono">{formatTime(elapsed)}</span>
        <span className="text-[10px] font-bold text-black/30">
          预计需要约1-2分钟 · 请稍等，效果值得等待
        </span>
      </div>

      {/* Rotating fun facts */}
      <div className="mt-2 w-full max-w-xs">
        <div
          className={`bg-white/80 comic-border-thin p-4 transition-opacity duration-400 ${fadeClass}`}
        >
          <div className="flex items-start gap-2">
            <span className="text-xl shrink-0 mt-0.5">{currentFact.emoji}</span>
            <p className="text-[11px] font-bold text-black/60 leading-relaxed">
              {currentFact.text}
            </p>
          </div>
        </div>
        {/* Dots indicator */}
        <div className="flex justify-center gap-1.5 mt-2">
          {funFacts.slice(0, 8).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === factIndex % 8
                  ? 'bg-[#e00] scale-125'
                  : 'bg-black/15'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Share teaser */}
      <div className="mt-1 text-center">
        <p className="text-[10px] font-bold text-black/25">
          🔥 生成完成后一键分享到朋友圈 · 获赞率超高
        </p>
      </div>
    </div>
  );
}
