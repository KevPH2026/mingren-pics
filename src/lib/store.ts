import { create } from 'zustand';

export type AppStep = 'upload' | 'select' | 'scenario' | 'generating' | 'result' | 'history';

export interface HistoryItem {
  id: string;
  imageUrl: string;
  celebrityId: string;
  celebrityName: string;
  scenarioLabel: string;
  createdAt: number;
}

interface AppState {
  step: AppStep;
  userImage: string | null;
  userImageFile: File | null;
  selectedCelebrityId: string | null;
  selectedScenarioId: string | null;
  generatedImages: string[];
  isGenerating: boolean;
  history: HistoryItem[];
  showPaywall: boolean;
  dailyUsage: { date: string; count: number };
  // 服务端数据
  serverQuota: { registered: boolean; dailyLimit: number; bonusQuota: number; inviteCount: number; referralCode: string } | null;
  referralCode: string | null;
  inviteCount: number;

  setStep: (step: AppStep) => void;
  setUserImage: (dataUrl: string, file: File) => void;
  selectCelebrity: (id: string) => void;
  selectScenario: (id: string) => void;
  setGeneratedImages: (images: string[]) => void;
  setIsGenerating: (v: boolean) => void;
  addToHistory: (item: Omit<HistoryItem, 'id' | 'createdAt'>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  setShowPaywall: (v: boolean) => void;
  incrementDailyUsage: () => void;
  getRemainingToday: () => number;
  isRegistered: () => boolean;
  canGenerate: () => boolean;
  getReferralLink: () => string;
  fetchServerQuota: () => Promise<void>;
  reset: () => void;
}

const STORAGE_KEY = 'mingren_history';
const USAGE_KEY = 'mingren_daily_usage';
const REGISTERED_KEY = 'mingren_registered';
const REFERRAL_CODE_KEY = 'mingren_referral_code';

const FREE_LIMIT = 1;
const REG_LIMIT = 3;
const MAX_HISTORY = 50;

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function saveJSON(key: string, data: any) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function loadDailyUsage(): { date: string; count: number } {
  const parsed = loadJSON<{ date: string; count: number }>(USAGE_KEY, { date: getTodayStr(), count: 0 });
  if (parsed.date !== getTodayStr()) return { date: getTodayStr(), count: 0 };
  return parsed;
}

function saveDailyUsage(data: { date: string; count: number }) {
  saveJSON(USAGE_KEY, data);
}

function loadHistory(): HistoryItem[] {
  return loadJSON<HistoryItem[]>(STORAGE_KEY, []);
}

function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    const trimmed = items.slice(Math.floor(items.length / 2));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

const initialState = {
  step: 'upload' as AppStep,
  userImage: null,
  userImageFile: null,
  selectedCelebrityId: null,
  selectedScenarioId: null,
  generatedImages: [],
  isGenerating: false,
  history: [] as HistoryItem[],
  showPaywall: false,
  dailyUsage: { date: getTodayStr(), count: 0 },
  serverQuota: null as AppState['serverQuota'],
  referralCode: null as string | null,
  inviteCount: 0,
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  setUserImage: (dataUrl, file) => set({ userImage: dataUrl, userImageFile: file, step: 'select' }),
  selectCelebrity: (id) => set({ selectedCelebrityId: id, step: 'scenario' }),
  selectScenario: (id) => set({ selectedScenarioId: id }),
  setGeneratedImages: (images) => set({ generatedImages: images, isGenerating: false, step: 'result' }),
  setIsGenerating: (v) => set({ isGenerating: v }),

  addToHistory: (item) => {
    const historyItem: HistoryItem = {
      ...item,
      id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };
    const updated = [historyItem, ...get().history].slice(0, MAX_HISTORY);
    set({ history: updated });
    saveHistory(updated);
  },

  removeFromHistory: (id) => {
    const updated = get().history.filter((h) => h.id !== id);
    set({ history: updated });
    saveHistory(updated);
  },

  clearHistory: () => {
    set({ history: [] });
    saveHistory([]);
  },

  setShowPaywall: (v) => set({ showPaywall: v }),

  incrementDailyUsage: () => {
    const today = getTodayStr();
    const current = get().dailyUsage;
    // 优先扣 bonusQuota（服务端管理的）
    const bonus = get().serverQuota?.bonusQuota || 0;
    if (bonus > 0) {
      // 扣服务端 bonus
      fetch('/api/quota/use', { method: 'POST' }).catch(() => {});
      // 同时更新本地 cache
      if (get().serverQuota) {
        set({ serverQuota: { ...get().serverQuota!, bonusQuota: bonus - 1 } });
      }
      return;
    }
    // 扣 daily
    const usage = current.date === today ? { date: today, count: current.count + 1 } : { date: today, count: 1 };
    set({ dailyUsage: usage });
    saveDailyUsage(usage);
  },

  getRemainingToday: () => {
    const today = getTodayStr();
    const current = get().dailyUsage;
    const count = current.date === today ? current.count : 0;
    const registered = get().isRegistered();
    const dailyLimit = registered ? REG_LIMIT : FREE_LIMIT;
    const dailyRemaining = Math.max(0, dailyLimit - count);
    const bonus = get().serverQuota?.bonusQuota || 0;
    return dailyRemaining + bonus;
  },

  isRegistered: () => {
    if (typeof window === 'undefined') return false;
    // Cookie 有 mingren_uid 说明已注册
    const uid = document.cookie.includes('mingren_uid=');
    if (uid) return true;
    return localStorage.getItem(REGISTERED_KEY) === '1';
  },

  canGenerate: () => {
    return get().getRemainingToday() > 0;
  },

  getReferralLink: () => {
    const code = get().serverQuota?.referralCode || localStorage.getItem(REFERRAL_CODE_KEY) || '';
    return code ? `https://mingren.pics/?ref=${code}` : '';
  },

  fetchServerQuota: async () => {
    try {
      const resp = await fetch('/api/quota');
      const data = await resp.json();
      set({ serverQuota: data });
      if (data.registered) {
        localStorage.setItem(REGISTERED_KEY, '1');
        if (data.referralCode) {
          localStorage.setItem(REFERRAL_CODE_KEY, data.referralCode);
          set({ referralCode: data.referralCode });
        }
        set({ inviteCount: data.inviteCount || 0 });
      }
    } catch {
      // 静默失败，用 localStorage
    }
  },

  reset: () => set({ ...initialState, history: get().history, dailyUsage: get().dailyUsage }),
}));

// 客户端初始化
if (typeof window !== 'undefined') {
  const saved = loadHistory();
  const usage = loadDailyUsage();
  const referralCode = localStorage.getItem(REFERRAL_CODE_KEY);
  useAppStore.setState({ history: saved, dailyUsage: usage, referralCode });

  // 从 URL 提取 ref 参数
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref');
  if (ref) {
    localStorage.setItem('mingren_pending_ref', ref);
    // 清理 URL
    window.history.replaceState({}, '', window.location.pathname);
  }

  // 启动时获取服务端配额
  useAppStore.getState().fetchServerQuota();
}
