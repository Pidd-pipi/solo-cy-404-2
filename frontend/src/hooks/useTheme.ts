import { useThemeStore } from '../stores/theme';

export function useTheme() {
  const mode = useThemeStore((state) => state.mode);
  const setTheme = useThemeStore((state) => state.setTheme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return {
    mode,
    isDark: mode === 'dark',
    setTheme,
    toggleTheme,
  };
}

