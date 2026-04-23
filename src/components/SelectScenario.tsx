'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { celebrities, scenarios } from '@/lib/celebrities';

export default function SelectScenario() {
  const { selectedCelebrityId, selectScenario, setStep, setGeneratedImages, userImage, setShowPaywall, incrementFreeUsed, canGenerate } =
    useAppStore();
  const celeb = celebrities.find((c) => c.id === selectedCelebrityId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (scenarioId: string) => {
    if (loading) return;

    // 检查是否还能生成
    if (!canGenerate()) {
      setShowPaywall(true);
      return;
    }

    selectScenario(scenarioId);
    setLoading(true);
    setError(null);
    incrementFreeUsed();

    if (!selectedCelebrityId) return;

    const scenario = scenarios.find((s) => s.id === scenarioId) || scenarios[2];
    const prompt = `Generate a photo of two friends ${scenario.prompt}. One is a person matching this description: ${celeb?.referencePrompt}. The other person is from the reference image — preserve their face and appearance. Natural lighting, authentic candid moment.`;

    // Switch to generating animation IMMEDIATELY
    setStep('generating');

    try {
      const resp = await fetch('/api/generate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          userImageBase64: userImage || undefined,
        }),
      });

      const data = await resp.json();

      // Queued — wait and retry once
      if (resp.status === 202 && data.queued) {
        await new Promise(r => setTimeout(r, 10000));
        const retryResp = await fetch('/api/generate/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, userImageBase64: userImage || undefined }),
        });
        const retryData = await retryResp.json();
        if (retryData.images) {
          setGeneratedImages(retryData.images);
          return;
        } else if (retryData.imageUrl) {
          await downloadAndSet(retryData.imageUrl);
          return;
        } else {
          setError(retryData.error || '生成失败，请重试');
          setStep('scenario');
          return;
        }
      }

      // Direct success
      if (data.images) {
        setGeneratedImages(data.images);
      } else if (data.imageUrl) {
        await downloadAndSet(data.imageUrl);
      } else {
        setError(data.error || '生成失败，请重试');
        setStep('scenario');
      }
    } catch (err: any) {
      setError('网络异常，请重试');
      setStep('scenario');
    } finally {
      setLoading(false);
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

      {error && (
        <div className="bg-[#e00] text-white comic-border-thin px-4 py-3 text-sm font-bold flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

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
      </div>

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
