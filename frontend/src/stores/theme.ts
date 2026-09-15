import { create } from 'zustand';
import { readStorage, storageKeys, writeStorage } from '../utils/storage';

export type ThemeMode = 'light' | 'dark';

function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.classList.toggle('dark', mode === 'dark');
  document.documentElement.style.colorScheme = mode;
}

const initialTheme = readStorage<ThemeMode>(storageKeys.theme, 'light');
applyTheme(initialTheme);

interface ThemeState {
  mode: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialTheme,
  setTheme: (mode) => {
    set({ mode });
    applyTheme(mode);
    writeStorage(storageKeys.theme, mode);
  },
  toggleTheme: () => {
    const nextMode = get().mode === 'light' ? 'dark' : 'light';
    get().setTheme(nextMode);
  },
}));

