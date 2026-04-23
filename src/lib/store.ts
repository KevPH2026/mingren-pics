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
  freeUsedCount: number;

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
  incrementFreeUsed: () => void;
  isRegistered: () => boolean;
  canGenerate: () => boolean;
  reset: () => void;
}

const STORAGE_KEY = 'mingren_history';
const USAGE_KEY = 'mingren_free_used';
const REGISTERED_KEY = 'mingren_registered';
const FREE_LIMIT = 1; // 非注册用户只能生成1张
const MAX_HISTORY = 50; // 最多50条

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

function loadUsage(): number {
  if (typeof window === 'undefined') return 0;
  try {
    return parseInt(localStorage.getItem(USAGE_KEY) || '0', 10);
  } catch { return 0; }
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
  freeUsedCount: 0,
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

  incrementFreeUsed: () => {
    const count = get().freeUsedCount + 1;
    set({ freeUsedCount: count });
    try { localStorage.setItem(USAGE_KEY, String(count)); } catch {}
  },

  isRegistered: () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(REGISTERED_KEY) === '1';
  },

  canGenerate: () => {
    if (get().isRegistered()) return true;
    return get().freeUsedCount < FREE_LIMIT;
  },

  reset: () => set({ ...initialState, history: get().history, freeUsedCount: get().freeUsedCount }),
}));

// 在客户端初始化时加载历史和使用次数
if (typeof window !== 'undefined') {
  const saved = loadHistory();
  const used = loadUsage();
  if (saved.length > 0 || used > 0) {
    useAppStore.setState({ history: saved, freeUsedCount: used });
  }
}
