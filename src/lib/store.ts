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

  setStep: (step: AppStep) => void;
  setUserImage: (dataUrl: string, file: File) => void;
  selectCelebrity: (id: string) => void;
  selectScenario: (id: string) => void;
  setGeneratedImages: (images: string[]) => void;
  setIsGenerating: (v: boolean) => void;
  addToHistory: (item: Omit<HistoryItem, 'id' | 'createdAt'>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  reset: () => void;
}

const STORAGE_KEY = 'mingren_history';
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

const initialState = {
  step: 'upload' as AppStep,
  userImage: null,
  userImageFile: null,
  selectedCelebrityId: null,
  selectedScenarioId: null,
  generatedImages: [],
  isGenerating: false,
  history: [] as HistoryItem[],
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

  reset: () => set({ ...initialState, history: get().history }),
}));

// 在客户端初始化时加载历史
if (typeof window !== 'undefined') {
  const saved = loadHistory();
  if (saved.length > 0) {
    useAppStore.setState({ history: saved });
  }
}
