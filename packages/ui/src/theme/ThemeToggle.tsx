import { useState, useRef, useEffect, type ReactElement } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme, type Theme } from './ThemeProvider.js';

export interface ThemeToggleProps {
  className?: string;
  align?: 'left' | 'right';
}

interface ThemeMenuItemProps {
  label: string;
  value: Theme;
  currentTheme: Theme;
  icon: ReactElement;
  onSelect: (theme: Theme) => void;
}

function ThemeMenuItem({
  label,
  value,
  currentTheme,
  icon,
  onSelect,
}: ThemeMenuItemProps): ReactElement {
  const isSelected = currentTheme === value;
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => onSelect(value)}
      className={`flex w-full cursor-pointer items-center justify-between rounded-button px-2.5 py-1.5 text-small text-text transition-colors hover:bg-surface-sunken ${
        isSelected ? 'bg-surface-sunken font-medium text-primary-fg' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </div>
      {isSelected && <Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" />}
    </button>
  );
}

const THEME_OPTIONS: Array<{
  label: string;
  value: Theme;
  icon: ReactElement;
}> = [
  {
    label: 'Light',
    value: 'light',
    icon: <Sun className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />,
  },
  {
    label: 'Dark',
    value: 'dark',
    icon: <Moon className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />,
  },
  {
    label: 'System',
    value: 'system',
    icon: <Laptop className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />,
  },
];

export function ThemeToggle({ className = '', align = 'right' }: ThemeToggleProps): ReactElement {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const alignClass = align === 'right' ? 'right-0' : 'left-0';

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex h-8 w-8 items-center justify-center rounded-button border border-border bg-surface text-text-muted transition-colors hover:bg-surface-sunken hover:text-text focus:outline-none focus:ring-2 focus:ring-focus cursor-pointer"
        aria-label="Toggle theme"
        aria-expanded={isOpen}
        aria-haspopup="true"
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

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`absolute ${alignClass} mt-2 w-36 rounded-modal border border-border bg-surface-elevated p-1 shadow-lg z-50 animate-in fade-in-50 zoom-in-95`}
        >
          {THEME_OPTIONS.map((opt) => (
            <ThemeMenuItem
              key={opt.value}
              label={opt.label}
              value={opt.value}
              currentTheme={theme}
              icon={opt.icon}
              onSelect={(val) => {
                setTheme(val);
                setIsOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
