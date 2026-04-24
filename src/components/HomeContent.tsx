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
    <main className="min-h-dvh flex flex-col halftone">
      {/* Comic header bar */}
      <header className="bg-[#e00] text-white comic-border-thin border-t-0 border-x-0 px-4 py-2 flex items-center justify-between">
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

      <div className="flex-1 flex flex-col items-center justify-start pb-8">
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
