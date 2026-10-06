import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactElement,
  type ReactNode,
} from 'react';

export type Theme = 'dark' | 'light' | 'system';

export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export interface ThemeProviderState {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'exzaestate-ui-theme',
}: ThemeProviderProps): ReactElement {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored === 'dark' || stored === 'light' || stored === 'system') {
          return stored;
        }
      } catch {
        // LocalStorage access may fail in private mode or sandbox
      }
    }
    return defaultTheme;
  });

  const getSystemTheme = (): 'dark' | 'light' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => {
    if (theme === 'system') return getSystemTheme();
    return theme;
  });

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = () => {
      let activeTheme: 'dark' | 'light';
      if (theme === 'system') {
        activeTheme = getSystemTheme();
        root.removeAttribute('data-theme');
      } else {
        activeTheme = theme;
        root.setAttribute('data-theme', theme);
      }

      root.classList.remove('light', 'dark');
      root.classList.add(activeTheme);
      setResolvedTheme(activeTheme);
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
    return undefined;
  }, [theme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, newTheme);
        } catch {
          // Ignore storage errors
        }
      }
      setThemeState(newTheme);
    },
    [storageKey],
  );

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

const defaultThemeState: ThemeProviderState = {
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => undefined,
  toggleTheme: () => undefined,
};

export function useTheme(): ThemeProviderState {
  const context = useContext(ThemeContext);
  return context ?? defaultThemeState;
}
