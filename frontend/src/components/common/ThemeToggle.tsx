import { Switch } from '@headlessui/react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Switch
      checked={isDark}
      onChange={toggleTheme}
      className="inline-flex h-10 w-20 items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[var(--muted)] transition hover:bg-[var(--surface-alt)]"
      aria-label="切换主题"
    >
      <Sun size={16} className={!isDark ? 'text-[var(--accent-strong)]' : ''} aria-hidden />
      <span className="h-5 w-px bg-[var(--border)]" />
      <Moon size={16} className={isDark ? 'text-[var(--accent-strong)]' : ''} aria-hidden />
    </Switch>
  );
}

