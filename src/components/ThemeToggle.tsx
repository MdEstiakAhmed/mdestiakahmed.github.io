import { Moon, Sun } from 'lucide-react';

import { applyTheme } from '@/lib/theme';
import { useTheme } from '@/lib/use-theme';

export default function ThemeToggle() {
  const theme = useTheme();

  return (
    <button
      type="button"
      onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="bg-card text-foreground hover:bg-accent inline-flex size-10 items-center justify-center rounded-full border transition-colors"
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
