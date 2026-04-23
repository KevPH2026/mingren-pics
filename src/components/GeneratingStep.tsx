'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { celebrities, scenarios } from '@/lib/celebrities';

const phases = [
  { text: '🔍 识别人脸特征...', duration: 8 },
  { text: '🎭 匹配名人面部...', duration: 10 },
  { text: '📐 合成光影角度...', duration: 12 },
  { text: '🎨 渲染高清合影...', duration: 15 },
  { text: '✨ AI 最后润色...', duration: 18 },
];

export default function GeneratingStep() {
  const selectedCelebrityId = useAppStore((s) => s.selectedCelebrityId);
  const selectedScenarioId = useAppStore((s) => s.selectedScenarioId);
  const userImage = useAppStore((s) => s.userImage);
  const celeb = celebrities.find((c) => c.id === selectedCelebrityId);
  const scenario = scenarios.find((s) => s.id === selectedScenarioId);
  const [elapsed, setElapsed] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const startTime = useRef(Date.now());

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      const sec = Math.floor((Date.now() - startTime.current) / 1000);
      setElapsed(sec);

      // Phase transitions
      let cumulative = 0;
      for (let i = 0; i < phases.length; i++) {
        cumulative += phases[i].duration;
        if (sec < cumulative) {
          setPhaseIndex(i);
          break;
        }
      }

      // Progress: ease-out curve, maxes around 90% then waits for real result
      const p = Math.min(90, 90 * (1 - Math.exp(-sec / 25)));
      setProgress(Math.round(p));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-5 mt-8 px-4">
      {/* Face merge preview */}
      <div className="relative flex items-center justify-center gap-0">
        {/* User face */}
        <div className="w-24 h-24 rounded-full overflow-hidden comic-border bg-white z-10">
          {userImage ? (
            <img src={userImage} alt="你" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
          )}
        </div>

        {/* Merge animation */}
        <div className="absolute left-1/2 -translate-x-1/2 z-20">
          <div className="w-10 h-10 rounded-full bg-[#ff0] comic-border-thin flex items-center justify-center animate-pulse text-lg">
            ⚡
          </div>
        </div>

        {/* Celebrity face */}
        <div className="w-24 h-24 rounded-full overflow-hidden comic-border bg-white z-10">
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {celeb?.avatarUrl || '⭐'}
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center">
        <div
          className="text-2xl font-black text-[#e00]"
          style={{ WebkitTextStroke: '1px #000' }}
        >
          AI正在合成合影
        </div>
        <div className="text-sm font-bold text-black/50 mt-1">
          {celeb?.name} × 你 · {scenario?.label || ''}
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
        {phases[phaseIndex].text}
      </div>

      {/* Timer + hint */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl font-black font-mono">{formatTime(elapsed)}</span>
        <span className="text-[10px] font-bold text-black/30">
          预计需要约1分钟 · 请勿离开页面
        </span>
      </div>

      {/* Fun facts */}
      <div className="mt-4 w-full max-w-xs bg-white/60 comic-border-thin p-3">
        <p className="text-[10px] font-bold text-black/40 text-center leading-relaxed">
          💡 趣知识：AI每秒分析超过100万个像素点来融合两张面孔
        </p>
      </div>
    </div>
  );
}
