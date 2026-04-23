import { create } from 'zustand';

export type AppStep = 'upload' | 'select' | 'scenario' | 'generating' | 'result' | 'history';

export interface HistoryItem {
  id: string;
  imageUrl: string; // base64 data URL
  celebrityId: string;
  celebrityName: string;
  scenarioLabel: string;
  createdAt: number; // timestamp
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
  reset: () => void;
}

const STORAGE_KEY = 'mingren_history';
const USAGE_KEY = 'mingren_daily_usage';   // { date: "2026-04-24", count: 1 }
const REGISTERED_KEY = 'mingren_registered';
const FREE_LIMIT = 1;    // 非注册用户每天1次
const REG_LIMIT = 3;     // 注册用户每天3次
const MAX_HISTORY = 50;

function getTodayStr() {
  return new Date().toISOString().slice(0, 10); // "2026-04-24"
}

function loadDailyUsage(): { date: string; count: number } {
  if (typeof window === 'undefined') return { date: getTodayStr(), count: 0 };
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return { date: getTodayStr(), count: 0 };
    const parsed = JSON.parse(raw);
    // 如果日期不是今天，重置
    if (parsed.date !== getTodayStr()) return { date: getTodayStr(), count: 0 };
    return parsed;
  } catch { return { date: getTodayStr(), count: 0 }; }
}

function saveDailyUsage(data: { date: string; count: number }) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(USAGE_KEY, JSON.stringify(data)); } catch {}
}

function loadHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage满了，删最旧的一半
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
    const usage = current.date === today ? { date: today, count: current.count + 1 } : { date: today, count: 1 };
    set({ dailyUsage: usage });
    saveDailyUsage(usage);
  },

  getRemainingToday: () => {
    const today = getTodayStr();
    const current = get().dailyUsage;
    const count = current.date === today ? current.count : 0;
    const limit = get().isRegistered() ? REG_LIMIT : FREE_LIMIT;
    return Math.max(0, limit - count);
  },

  isRegistered: () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(REGISTERED_KEY) === '1';
  },

  canGenerate: () => {
    return get().getRemainingToday() > 0;
  },

  reset: () => set({ ...initialState, history: get().history, dailyUsage: get().dailyUsage }),
}));

// 在客户端初始化时加载历史和每日用量
if (typeof window !== 'undefined') {
  const saved = loadHistory();
  const usage = loadDailyUsage();
  useAppStore.setState({ history: saved, dailyUsage: usage });
}
