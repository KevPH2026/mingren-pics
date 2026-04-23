'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { celebrities, categories } from '@/lib/celebrities';

const categoryColors: Record<string, string> = {
  all: 'bg-[#e00] text-white',
  kpop: 'bg-[#ff69b4] text-white',
  hollywood: 'bg-[#0cf] text-black',
  music: 'bg-[#e00] text-white',
  tech: 'bg-[#0f0] text-black',
  sports: 'bg-[#f90] text-black',
  anime: 'bg-[#8b5cf6] text-white',
  business: 'bg-[#9b59b6] text-white',
};

export default function SelectCelebrity() {
  const selectCelebrity = useAppStore((s) => s.selectCelebrity);
  const setStep = useAppStore((s) => s.setStep);
  const userImage = useAppStore((s) => s.userImage);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = celebrities
    .filter((c) => activeCategory === 'all' || c.category === activeCategory)
    .filter(
      (c) =>
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        c.tags.some((t) => t.includes(search))
    )
    .sort((a, b) => b.hotness - a.hotness);

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 mt-4 px-4">
      {/* User preview + instruction */}
      {userImage && (
        <div className="flex items-center gap-3 bg-white comic-border-thin p-2 rounded-lg comic-shadow-sm">
          <img
            src={userImage}
            alt="You"
            className="w-10 h-10 rounded-full object-cover comic-border-thin border-[#e00]"
          />
          <span className="text-sm font-black">选个名人合影 →</span>
        </div>
      )}

      {/* Search - comic style */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 搜索名人..."
          className="w-full py-2.5 px-4 bg-white comic-border-thin text-sm font-bold placeholder:text-black/30 focus:outline-none focus:border-[#e00]"
        />
      </div>

      {/* Category tabs - colorful pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 px-3 py-1.5 text-xs font-black tracking-wider transition-all comic-border-thin ${
              activeCategory === cat.id
                ? categoryColors[cat.id] + ' comic-shadow-sm'
                : 'bg-white text-black/50'
            }`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Celebrity Grid */}
      <div className="grid grid-cols-3 gap-2">
        {filtered.map((celeb) => (
          <button
            key={celeb.id}
            onClick={() => selectCelebrity(celeb.id)}
            className="flex flex-col items-center gap-1.5 p-3 bg-white comic-border-thin hover:bg-[#ff0] hover:translate-y-[-2px] hover:comic-shadow-sm transition-all group"
          >
            <div className="text-3xl group-hover:scale-125 transition-transform">
              {celeb.avatarUrl}
            </div>
            <span className="text-xs font-black truncate w-full text-center">
              {celeb.name}
            </span>
            <span className="text-[10px] text-black/40 font-bold truncate w-full text-center">
              {celeb.nameEn}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <div className="text-5xl mb-2">🤔</div>
          <p className="text-sm font-black">没找到？换个关键词！</p>
        </div>
      )}

      {/* Back */}
      <button
        onClick={() => setStep('upload')}
        className="text-center text-black/40 text-sm font-bold py-2 hover:text-[#e00] transition-colors"
      >
        ← 重新选照片
      </button>
    </div>
  );
}
