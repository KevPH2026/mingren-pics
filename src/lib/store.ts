import { create } from 'zustand';

export type AppStep = 'upload' | 'select' | 'scenario' | 'generating' | 'result' | 'history' | 'profile';

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
  // 服务端数据
  serverQuota: { registered: boolean; dailyLimit: number; usedToday: number; bonusQuota: number; remaining: number; inviteCount: number; referralCode: string; email?: string } | null;
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
  getRemainingToday: () => number;
  isRegistered: () => boolean;
  canGenerate: () => boolean;
  getReferralLink: () => string;
  fetchServerQuota: () => Promise<void>;
  reset: () => void;
}

const STORAGE_KEY = 'mingren_history';
const REGISTERED_KEY = 'mingren_registered';
const REFERRAL_CODE_KEY = 'mingren_referral_code';

const FREE_LIMIT = 1;
const REG_LIMIT = 3;
const MAX_HISTORY_ITEMS = 20; // 限制条目数
const MAX_HISTORY_BYTES = 4 * 1024 * 1024; // 4MB localStorage budget

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

function loadHistory(): HistoryItem[] {
  return loadJSON<HistoryItem[]>(STORAGE_KEY, []);
}

function estimateHistoryBytes(items: HistoryItem[]): number {
  return JSON.stringify(items).length * 2; // UTF-16
}

function saveHistory(items: HistoryItem[]) {
  try {
    const data = JSON.stringify(items);
    localStorage.setItem(STORAGE_KEY, data);
  } catch {
    // localStorage full — trim oldest items aggressively
    let trimmed = items.slice(0, Math.floor(items.length / 2));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Still too big, keep only last 3
      trimmed = items.slice(0, 3);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch {
        // Give up
      }
    }
  }
}

const initialState = {
  step: 'upload' as AppStep,
  userImage: null,
  userImageFile: null,
  selectedCelebrityId: null,
  selectedScenarioId: null,
  generatedImages: [] as string[],
  isGenerating: false,
  history: [] as HistoryItem[],
  showPaywall: false,
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
    const updated = [historyItem, ...get().history];

    // Trim by count first
    let trimmed = updated.slice(0, MAX_HISTORY_ITEMS);

    // Then trim by size
    while (estimateHistoryBytes(trimmed) > MAX_HISTORY_BYTES && trimmed.length > 1) {
      trimmed = trimmed.slice(0, trimmed.length - 1);
    }

    set({ history: trimmed });
    saveHistory(trimmed);
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

  // Quota now fully managed server-side via signed cookie
  // This is a client-side convenience that reads from serverQuota
  getRemainingToday: () => {
    const sq = get().serverQuota;
    if (sq) return Math.max(0, sq.remaining);
    const registered = get().isRegistered();
    return registered ? REG_LIMIT : FREE_LIMIT;
  },

  isRegistered: () => {
    if (typeof window === 'undefined') return false;
    if (get().serverQuota?.registered) return true;
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

  reset: () => set({ ...initialState, history: get().history }),
}));

// 客户端初始化
if (typeof window !== 'undefined') {
  const saved = loadHistory();
  const referralCode = localStorage.getItem(REFERRAL_CODE_KEY);
  useAppStore.setState({ history: saved, referralCode });

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
