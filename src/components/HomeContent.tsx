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
      {/* ===== 左侧滚动案例（像素化名人） ===== */}
      <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-[180px] overflow-hidden pointer-events-none z-0">
        <div className="flex flex-col gap-4 animate-scroll-up" style={{ animationDuration: '40s' }}>
          {[
            { celeb: 'Elon Musk', img: '/pixelated/elon-musk.png', bg: '#4ecdc4' },
            { celeb: 'Messi', img: '/pixelated/messi.png', bg: '#ffe66d' },
            { celeb: 'Lisa', img: '/pixelated/lisa.png', bg: '#a29bfe' },
            { celeb: '周杰伦', img: '/pixelated/jay-chou.png', bg: '#fd79a8' },
            { celeb: 'LeBron', img: '/pixelated/lebron.png', bg: '#00b894' },
            { celeb: 'Lady Gaga', img: '/pixelated/lady-gaga.png', bg: '#e84393' },
            { celeb: 'BTS', img: '/pixelated/bts.png', bg: '#fdcb6e' },
          ].concat([
            { celeb: 'Elon Musk', img: '/pixelated/elon-musk.png', bg: '#4ecdc4' },
            { celeb: 'Messi', img: '/pixelated/messi.png', bg: '#ffe66d' },
            { celeb: 'Lisa', img: '/pixelated/lisa.png', bg: '#a29bfe' },
            { celeb: '周杰伦', img: '/pixelated/jay-chou.png', bg: '#fd79a8' },
            { celeb: 'LeBron', img: '/pixelated/lebron.png', bg: '#00b894' },
            { celeb: 'Lady Gaga', img: '/pixelated/lady-gaga.png', bg: '#e84393' },
            { celeb: 'BTS', img: '/pixelated/bts.png', bg: '#fdcb6e' },
          ]).map((item, i) => (
            <div key={i} className="flex-shrink-0 w-[150px] rounded-lg comic-border-thin overflow-hidden mx-auto">
              <div className="w-full aspect-[3/4] relative" style={{ backgroundColor: item.bg }}>
                <img src={item.img} alt={item.celeb} className="absolute inset-0 w-full h-full object-cover" style={{ imageRendering: 'pixelated', filter: 'brightness(0.8) saturate(1.3)' }} loading="lazy" />
                <span className="absolute top-2 left-2 text-xs font-black text-white px-2 py-0.5 bg-black/40 rounded z-10">跟 {item.celeb} 合影</span>
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent z-10" />
                <div className="absolute bottom-2 left-0 right-0 text-center z-10">
                  <span className="text-[9px] font-bold text-white/80">mingren.pics</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 右侧滚动案例（像素化名人） ===== */}
      <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-[180px] overflow-hidden pointer-events-none z-0">
        <div className="flex flex-col gap-4 animate-scroll-down" style={{ animationDuration: '45s' }}>
          {[
            { celeb: 'Lady Gaga', img: '/pixelated/lady-gaga.png', bg: '#e84393' },
            { celeb: 'C罗', img: '/pixelated/ronaldo.png', bg: '#0984e3' },
            { celeb: 'BTS', img: '/pixelated/bts.png', bg: '#fdcb6e' },
            { celeb: 'Lisa', img: '/pixelated/lisa.png', bg: '#6c5ce7' },
            { celeb: 'Zendaya', img: '/pixelated/zendaya.png', bg: '#00cec9' },
            { celeb: 'IU', img: '/pixelated/iu.png', bg: '#a29bfe' },
            { celeb: 'Messi', img: '/pixelated/messi.png', bg: '#ffe66d' },
            { celeb: 'Rihanna', img: '/pixelated/rihanna.png', bg: '#ff6b9d' },
          ]).concat([
            { celeb: 'Lady Gaga', img: '/pixelated/lady-gaga.png', bg: '#e84393' },
            { celeb: 'C罗', img: '/pixelated/ronaldo.png', bg: '#0984e3' },
            { celeb: 'BTS', img: '/pixelated/bts.png', bg: '#fdcb6e' },
            { celeb: 'Lisa', img: '/pixelated/lisa.png', bg: '#6c5ce7' },
            { celeb: 'Zendaya', img: '/pixelated/zendaya.png', bg: '#00cec9' },
            { celeb: 'IU', img: '/pixelated/iu.png', bg: '#a29bfe' },
            { celeb: 'Messi', img: '/pixelated/messi.png', bg: '#ffe66d' },
            { celeb: 'Rihanna', img: '/pixelated/rihanna.png', bg: '#ff6b9d' },
          ]).map((item, i) => (
            <div key={i} className="flex-shrink-0 w-[150px] rounded-lg comic-border-thin overflow-hidden mx-auto">
              <div className="w-full aspect-[3/4] relative" style={{ backgroundColor: item.bg }}>
                <img src={item.img} alt={item.celeb} className="absolute inset-0 w-full h-full object-cover" style={{ imageRendering: 'pixelated', filter: 'brightness(0.8) saturate(1.3)' }} loading="lazy" />
                <span className="absolute top-2 left-2 text-xs font-black text-white px-2 py-0.5 bg-black/40 rounded z-10">跟 {item.celeb} 合影</span>
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent z-10" />
                <div className="absolute bottom-2 left-0 right-0 text-center z-10">
                  <span className="text-[9px] font-bold text-white/80">mingren.pics</span>
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

      {/* ===== 移动端水平滚动名人条（像素化名人） ===== */}
      <div className="lg:hidden flex-shrink-0 relative z-10">
        <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {[
            { celeb: 'Elon Musk', img: '/pixelated/elon-musk.png', bg: '#4ecdc4' },
            { celeb: 'Lisa', img: '/pixelated/lisa.png', bg: '#6c5ce7' },
            { celeb: 'Messi', img: '/pixelated/messi.png', bg: '#ffe66d' },
            { celeb: 'Lady Gaga', img: '/pixelated/lady-gaga.png', bg: '#e84393' },
            { celeb: 'IU', img: '/pixelated/iu.png', bg: '#a29bfe' },
            { celeb: 'Zendaya', img: '/pixelated/zendaya.png', bg: '#00cec9' },
            { celeb: 'C罗', img: '/pixelated/ronaldo.png', bg: '#0984e3' },
          ].map((item, i) => (
            <div key={i} className="flex-shrink-0 w-[72px] rounded-lg overflow-hidden comic-border-thin">
              <div className="w-full aspect-[3/4] relative" style={{ backgroundColor: item.bg }}>
                <img src={item.img} alt={item.celeb} className="absolute inset-0 w-full h-full object-cover" style={{ imageRendering: 'pixelated', filter: 'brightness(0.8) saturate(1.3)' }} loading="lazy" />
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

      {/* Bottom branding + disclaimer */}
      <footer className="bg-black text-white/60 text-center py-3 px-4 space-y-1">
        <p className="text-[9px] font-bold leading-relaxed">
          ⚠️ 免责声明：本站生成的合影图片均为AI虚构创作，仅供娱乐，不代表真实合影。名人肖像权归本人所有，请勿用于商业用途。
        </p>
        <p className="text-[9px] font-bold text-white/30 leading-relaxed">
          🤖 本页面完全由 AI 开发，AI 维护
        </p>
        <p className="text-[9px] font-black tracking-[4px] uppercase text-white/20">MINGREN.PICS</p>
      </footer>

      {/* Paywall Modal */}
      {showPaywall && <PaywallModal />}
    </main>
  );
}
