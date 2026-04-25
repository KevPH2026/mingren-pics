'use client';

import UploadStep from '@/components/UploadStep';
import SelectCelebrity from '@/components/SelectCelebrity';
import SelectScenario from '@/components/SelectScenario';
import GeneratingStep from '@/components/GeneratingStep';
import ResultStep from '@/components/ResultStep';
import HistoryStep from '@/components/HistoryStep';
import ProfilePage from '@/components/ProfilePage';
import PaywallModal from '@/components/PaywallModal';
import { useAppStore, AppStep } from '@/lib/store';


function AuthButton() {
  const { isRegistered, setShowPaywall, serverQuota, setStep } = useAppStore();
  const email = serverQuota?.email || (typeof window !== 'undefined' ? localStorage.getItem('mingren_email') || '' : '');

  if (isRegistered()) {
    return (
      <button
        onClick={() => setStep('profile')}
        className="text-[10px] font-bold opacity-80 bg-white/15 px-2 py-0.5 rounded hover:bg-white/25 transition-colors cursor-pointer"
      >
        ✅ {email ? email.replace(/(.{2}).*(@.*)/, '$1***$2') : '已登录'}
      </button>
    );
  }
  return (
    <button
      onClick={() => setShowPaywall(true)}
      className="px-2 py-0.5 bg-[#ff0] text-black text-[10px] font-black rounded hover:bg-[#ff3] transition-colors"
    >
      🔑 登录
    </button>
  );
}

const stepComponents: Record<AppStep, React.ComponentType> = {
  upload: UploadStep,
  select: SelectCelebrity,
  scenario: SelectScenario,
  generating: GeneratingStep,
  result: ResultStep,
  history: HistoryStep,
  profile: ProfilePage,
};

export default function HomeContent() {
  const step = useAppStore((s) => s.step);
  const historyCount = useAppStore((s) => s.history.length);
  const showPaywall = useAppStore((s) => s.showPaywall);
  const setStep = useAppStore((s) => s.setStep);
  const StepComponent = stepComponents[step];

  return (
    <main className="min-h-dvh flex flex-col halftone relative overflow-hidden">
      {/* ===== 左侧滚动案例 ===== */}
      <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-[180px] overflow-hidden pointer-events-none z-0">
        <div className="flex flex-col gap-4 animate-scroll-up" style={{ animationDuration: '40s' }}>
          {/* 重复两遍实现无缝滚动 */}
          {[
            { celeb: 'Taylor Swift', emoji: '💃', bg: '#ff6b9d' },
            { celeb: 'Elon Musk', emoji: '🚀', bg: '#4ecdc4' },
            { celeb: 'Messi', emoji: '⚽', bg: '#ffe66d' },
            { celeb: 'Blackpink', emoji: '🌟', bg: '#a29bfe' },
            { celeb: '周杰伦', emoji: '🎹', bg: '#fd79a8' },
            { celeb: 'Spider-Man', emoji: '🕷️', bg: '#e17055' },
            { celeb: 'Lisa', emoji: '💃', bg: '#6c5ce7' },
            { celeb: 'LeBron', emoji: '🏀', bg: '#00b894' },
          ].concat([
            { celeb: 'Taylor Swift', emoji: '💃', bg: '#ff6b9d' },
            { celeb: 'Elon Musk', emoji: '🚀', bg: '#4ecdc4' },
            { celeb: 'Messi', emoji: '⚽', bg: '#ffe66d' },
            { celeb: 'Blackpink', emoji: '🌟', bg: '#a29bfe' },
            { celeb: '周杰伦', emoji: '🎹', bg: '#fd79a8' },
            { celeb: 'Spider-Man', emoji: '🕷️', bg: '#e17055' },
            { celeb: 'Lisa', emoji: '💃', bg: '#6c5ce7' },
            { celeb: 'LeBron', emoji: '🏀', bg: '#00b894' },
          ]).map((item, i) => (
            <div key={i} className="flex-shrink-0 w-[150px] rounded-lg comic-border-thin overflow-hidden mx-auto">
              <div className="w-full aspect-[3/4] flex flex-col items-center justify-center gap-2 relative" style={{ backgroundColor: item.bg }}>
                <span className="text-5xl">{item.emoji}</span>
                <span className="text-xs font-black text-white px-2 py-0.5 bg-black/30 rounded">跟 {item.celeb} 合影</span>
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <span className="text-[9px] font-bold text-white/70">mingren.pics</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 右侧滚动案例（emoji风格） ===== */}
      <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-[180px] overflow-hidden pointer-events-none z-0">
        <div className="flex flex-col gap-4 animate-scroll-down" style={{ animationDuration: '45s' }}>
          {[
            { celeb: 'Lady Gaga', emoji: '🎤', bg: '#e84393' },
            { celeb: 'C罗', emoji: '⚽', bg: '#0984e3' },
            { celeb: 'BTS', emoji: '🌟', bg: '#fdcb6e' },
            { celeb: 'Lisa', emoji: '💃', bg: '#6c5ce7' },
            { celeb: 'Zendaya', emoji: '🎬', bg: '#00cec9' },
            { celeb: 'IU', emoji: '🎵', bg: '#a29bfe' },
            { celeb: 'Messi', emoji: '⚽', bg: '#ffe66d' },
            { celeb: 'Taylor Swift', emoji: '💃', bg: '#ff6b9d' },
          ].concat([
            { celeb: 'Lady Gaga', emoji: '🎤', bg: '#e84393' },
            { celeb: 'C罗', emoji: '⚽', bg: '#0984e3' },
            { celeb: 'BTS', emoji: '🌟', bg: '#fdcb6e' },
            { celeb: 'Lisa', emoji: '💃', bg: '#6c5ce7' },
            { celeb: 'Zendaya', emoji: '🎬', bg: '#00cec9' },
            { celeb: 'IU', emoji: '🎵', bg: '#a29bfe' },
            { celeb: 'Messi', emoji: '⚽', bg: '#ffe66d' },
            { celeb: 'Taylor Swift', emoji: '💃', bg: '#ff6b9d' },
          ]).map((item, i) => (
            <div key={i} className="flex-shrink-0 w-[150px] rounded-lg comic-border-thin overflow-hidden mx-auto">
              <div className="w-full aspect-[3/4] flex flex-col items-center justify-center gap-2 relative" style={{ backgroundColor: item.bg }}>
                <span className="text-5xl">{item.emoji}</span>
                <span className="text-xs font-black text-white px-2 py-0.5 bg-black/30 rounded">跟 {item.celeb} 合影</span>
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <span className="text-[9px] font-bold text-white/70">mingren.pics</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comic header bar */}
      <header className="bg-[#e00] text-white comic-border-thin border-t-0 border-x-0 px-4 py-2 flex items-center justify-between relative z-10">
        <button
          onClick={() => setStep('upload')}
          className="font-black text-xs tracking-[3px] uppercase"
        >
          mingren.pics
        </button>
        <div className="flex items-center gap-2">
          <AuthButton />
          <span className="hidden sm:inline text-[10px] font-bold opacity-70 tracking-wider">⚡ GPT-IMAGE 2.0</span>
          {historyCount > 0 && step !== 'history' && (
            <button
              onClick={() => setStep('history')}
              className="relative px-2 py-0.5 bg-white/20 rounded text-[10px] font-black hover:bg-white/30 transition-colors"
            >
              📸
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ff0] text-black text-[8px] font-black rounded-full flex items-center justify-center comic-border-thin">
                {historyCount > 9 ? '9+' : historyCount}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* ===== 移动端水平滚动名人条（emoji风格） ===== */}
      <div className="lg:hidden flex-shrink-0 relative z-10">
        <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {[
            { celeb: 'Taylor Swift', emoji: '💃', bg: '#ff6b9d' },
            { celeb: 'Elon Musk', emoji: '🚀', bg: '#4ecdc4' },
            { celeb: 'Lisa', emoji: '💃', bg: '#6c5ce7' },
            { celeb: 'Messi', emoji: '⚽', bg: '#ffe66d' },
            { celeb: 'Lady Gaga', emoji: '🎤', bg: '#e84393' },
            { celeb: 'IU', emoji: '🎵', bg: '#a29bfe' },
            { celeb: 'Zendaya', emoji: '🎬', bg: '#00cec9' },
            { celeb: 'C罗', emoji: '⚽', bg: '#0984e3' },
          ].map((item, i) => (
            <div key={i} className="flex-shrink-0 w-[72px] rounded-lg overflow-hidden comic-border-thin">
              <div className="w-full aspect-[3/4] flex flex-col items-center justify-center gap-1 relative" style={{ backgroundColor: item.bg }}>
                <span className="text-2xl">{item.emoji}</span>
                <div className="absolute bottom-0 left-0 right-0 p-1 z-10">
                  <span className="text-[7px] font-black text-white drop-shadow-lg block leading-tight text-center">{item.celeb}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start pb-8 relative z-10">
        <StepComponent />
      </div>

      {/* Bottom branding */}
      <footer className="bg-black text-white text-center py-2 text-[10px] font-black tracking-[4px] uppercase">
        MINGREN.PICS
      </footer>

      {/* Paywall Modal */}
      {showPaywall && <PaywallModal />}
    </main>
  );
}
