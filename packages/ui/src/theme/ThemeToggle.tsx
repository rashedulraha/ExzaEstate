import { type ReactElement } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider.js';

export interface ThemeToggleProps {
  className?: string;
  align?: 'left' | 'right';
}

export function ThemeToggle({ className = '' }: ThemeToggleProps): ReactElement {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-text-muted transition-all hover:bg-surface-sunken hover:text-text focus:outline-none focus:ring-2 focus:ring-focus cursor-pointer ${className}`}
      aria-label="Toggle theme"
      title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <Sun
        className={`h-4 w-4 transition-all duration-200 ${
          resolvedTheme === 'dark'
            ? 'scale-0 -rotate-90 opacity-0'
            : 'scale-100 rotate-0 opacity-100'
        }`}
        aria-hidden="true"
      />
      <Moon
        className={`absolute h-4 w-4 transition-all duration-200 ${
          resolvedTheme === 'dark'
            ? 'scale-100 rotate-0 opacity-100'
            : 'scale-0 rotate-90 opacity-0'
        }`}
        aria-hidden="true"
      />
    </button>
  );
}
