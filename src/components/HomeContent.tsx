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

// 像素化覆盖组件：用canvas将图片缩小再放大实现像素化
function PixelateOverlay({ src }: { src: string }) {
  return (
    <canvas
      className="absolute inset-0 w-full h-full z-[5]"
      ref={(canvas) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = 24;
        canvas.height = 32;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, 24, 32);
        };
        img.src = src;
      }}
    />
  );
}

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

      {/* ===== 右侧滚动案例（真实名人像素化） ===== */}
      <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-[180px] overflow-hidden pointer-events-none z-0">
        <div className="flex flex-col gap-4 animate-scroll-down" style={{ animationDuration: '45s' }}>
          {[
            { celeb: 'Lady Gaga', src: '/api/image-proxy?url=https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Lady_Gaga_at_the_2024_LACMA_Art_Film_Gala_%28cropped%29.jpg/220px-Lady_Gaga_at_the_2024_LACMA_Art_Film_Gala_%28cropped%29.jpg', bg: '#e84393' },
            { celeb: 'C罗', src: '/api/image-proxy?url=https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Cristiano_Ronaldo_playing_for_Al_Nassr_FC_against_Persepolis%2C_September_2023_%28cropped%29.jpg/220px-Cristiano_Ronaldo_playing_for_Al_Nassr_FC_against_Persepolis%2C_September_2023_%28cropped%29.jpg', bg: '#0984e3' },
            { celeb: 'BTS', src: '/api/image-proxy?url=https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/BTS_%28%EB%B0%A9%ED%83%84%EC%86%8C%EB%85%84%EB%8B%A8%29%27Love_Yourself%27_in_Seoul_%28cropped%29.jpg/220px-BTS_%28%EB%B0%A9%ED%83%84%EC%86%8C%EB%85%84%EB%8B%A8%29%27Love_Yourself%27_in_Seoul_%28cropped%29.jpg', bg: '#fdcb6e' },
            { celeb: 'Lisa', src: '/api/image-proxy?url=https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Lisa_%28Lalisa_Manobal%29_at_the_Paris_Fashion_Week_2024_02.jpg/220px-Lisa_%28Lalisa_Manobal%29_at_the_Paris_Fashion_Week_2024_02.jpg', bg: '#6c5ce7' },
            { celeb: 'Zendaya', src: '/api/image-proxy?url=https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Zendaya_-_2024.jpg/220px-Zendaya_-_2024.jpg', bg: '#00cec9' },
            { celeb: 'IU', src: '/api/image-proxy?url=https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/IU_at_%22Dreaming_of_a_Fairy_Tale%22_Press_Conference%2C_24_March_2025_04.jpg/220px-IU_at_%22Dreaming_of_a_Fairy_Tale%22_Press_Conference%2C_24_March_2025_04.jpg', bg: '#a29bfe' },
            { celeb: 'Messi', src: '/api/image-proxy?url=https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg/220px-Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg', bg: '#ffe66d' },
            { celeb: 'Taylor Swift', src: '/api/image-proxy?url=https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29.png/220px-Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29.png', bg: '#ff6b9d' },
          ].concat([
            { celeb: 'Lady Gaga', src: '/api/image-proxy?url=https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Lady_Gaga_at_the_2024_LACMA_Art_Film_Gala_%28cropped%29.jpg/220px-Lady_Gaga_at_the_2024_LACMA_Art_Film_Gala_%28cropped%29.jpg', bg: '#e84393' },
            { celeb: 'C罗', src: '/api/image-proxy?url=https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Cristiano_Ronaldo_playing_for_Al_Nassr_FC_against_Persepolis%2C_September_2023_%28cropped%29.jpg/220px-Cristiano_Ronaldo_playing_for_Al_Nassr_FC_against_Persepolis%2C_September_2023_%28cropped%29.jpg', bg: '#0984e3' },
            { celeb: 'BTS', src: '/api/image-proxy?url=https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/BTS_%28%EB%B0%A9%ED%83%84%EC%86%8C%EB%85%84%EB%8B%A8%29%27Love_Yourself%27_in_Seoul_%28cropped%29.jpg/220px-BTS_%28%EB%B0%A9%ED%83%84%EC%86%8C%EB%85%84%EB%8B%A8%29%27Love_Yourself%27_in_Seoul_%28cropped%29.jpg', bg: '#fdcb6e' },
            { celeb: 'Lisa', src: '/api/image-proxy?url=https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Lisa_%28Lalisa_Manobal%29_at_the_Paris_Fashion_Week_2024_02.jpg/220px-Lisa_%28Lalisa_Manobal%29_at_the_Paris_Fashion_Week_2024_02.jpg', bg: '#6c5ce7' },
            { celeb: 'Zendaya', src: '/api/image-proxy?url=https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Zendaya_-_2024.jpg/220px-Zendaya_-_2024.jpg', bg: '#00cec9' },
            { celeb: 'IU', src: '/api/image-proxy?url=https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/IU_at_%22Dreaming_of_a_Fairy_Tale%22_Press_Conference%2C_24_March_2025_04.jpg/220px-IU_at_%22Dreaming_of_a_Fairy_Tale%22_Press_Conference%2C_24_March_2025_04.jpg', bg: '#a29bfe' },
            { celeb: 'Messi', src: '/api/image-proxy?url=https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg/220px-Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg', bg: '#ffe66d' },
            { celeb: 'Taylor Swift', src: '/api/image-proxy?url=https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29.png/220px-Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29.png', bg: '#ff6b9d' },
          ]).map((item, i) => (
            <div key={i} className="flex-shrink-0 w-[150px] rounded-lg comic-border-thin overflow-hidden mx-auto">
              <div className="w-full aspect-[3/4] relative" style={{ backgroundColor: item.bg }}>
                {/* 像素化名人照片：缩小到32px再放大，实现像素风 */}
                <img
                  src={item.src}
                  alt={item.celeb}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    imageRendering: 'pixelated',
                    filter: 'brightness(0.7) saturate(1.2)',
                  }}
                  loading="lazy"
                />
                {/* 像素化遮罩层：用小canvas实现真正的像素化效果 */}
                <PixelateOverlay src={item.src} />
                {/* 底部渐变 + 文字 */}
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-10" />
                <div className="absolute bottom-0 left-0 right-0 p-2 z-10">
                  <span className="text-xs font-black text-white drop-shadow-lg block">跟 {item.celeb} 合影</span>
                  <span className="text-[9px] font-bold text-white/60 block mt-0.5">mingren.pics</span>
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
          <span className="text-[10px] font-bold opacity-70 tracking-wider">⚡ GPT-IMAGE 2.0</span>
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
