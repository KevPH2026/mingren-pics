'use client';

import { useAppStore } from '@/lib/store';
import { celebrities, scenarios } from '@/lib/celebrities';

export default function SelectScenario() {
  const { selectedCelebrityId, selectScenario, setStep, setIsGenerating, setGeneratedImages, userImage } =
    useAppStore();
  const celeb = celebrities.find((c) => c.id === selectedCelebrityId);

  const handleGenerate = async (scenarioId: string) => {
    selectScenario(scenarioId);
    setIsGenerating(true);

    if (!selectedCelebrityId) return;

    const scenario = scenarios.find((s) => s.id === scenarioId) || scenarios[2];
    const prompt = `Generate a photo of two friends ${scenario.prompt}. One is a person matching this description: ${celeb?.referencePrompt}. The other person is from the reference image — preserve their face and appearance. Natural lighting, authentic candid moment.`;

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

      if (data.images) {
        setGeneratedImages(data.images);
      } else {
        alert(data.error || '生成失败，请重试');
        setIsGenerating(false);
      }
    } catch (err: any) {
      alert('请求失败: ' + err.message);
      setIsGenerating(false);
    }
  };

  const scenarioColors = [
    'hover:bg-[#e00] hover:text-white',
    'hover:bg-[#ff0] hover:text-black',
    'hover:bg-[#0cf] hover:text-black',
    'hover:bg-[#0f0] hover:text-black',
    'hover:bg-[#f90] hover:text-black',
    'hover:bg-[#ff69b4] hover:text-white',
    'hover:bg-[#9b59b6] hover:text-white',
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

      <div className="grid grid-cols-2 gap-3">
        {scenarios.map((s, i) => (
          <button
            key={s.id}
            onClick={() => handleGenerate(s.id)}
            className={`flex flex-col items-center gap-2 p-4 bg-white comic-border-thin ${scenarioColors[i]} hover:translate-y-[-3px] hover:comic-shadow-sm transition-all group`}
          >
            <span className="text-3xl group-hover:scale-125 transition-transform">{s.emoji}</span>
            <span className="text-sm font-black">{s.label}</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setStep('select')}
        className="text-center text-black/40 text-sm font-bold py-2 hover:text-[#e00] transition-colors"
      >
        ← 换个名人
      </button>
    </div>
  );
}
