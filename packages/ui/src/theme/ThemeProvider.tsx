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
export type ThemePalette = 'meridian' | 'emerald' | 'sapphire' | 'amethyst' | 'terracotta';

export interface ThemePaletteDefinition {
  id: ThemePalette;
  name: string;
  tagline: string;
  category: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  description: string;
}

export const THEME_PALETTES: ThemePaletteDefinition[] = [
  {
    id: 'meridian',
    name: 'Meridian Saffron',
    tagline: 'Exza Signature Corporate',
    category: 'Flagship Brand',
    primaryColor: '#f26522',
    secondaryColor: '#17160f',
    accentColor: '#ff8743',
    description:
      'ExzaEstate flagship corporate identity with vibrant saffron accents and obsidian charcoal depth.',
  },
  {
    id: 'emerald',
    name: 'Emerald Estate',
    tagline: 'Nordic Property & Eco-Assets',
    category: 'Botanical & Land',
    primaryColor: '#059669',
    secondaryColor: '#064e3b',
    accentColor: '#34d399',
    description:
      'Lush botanical emerald and deep jade tones tailored for townships and eco-developments.',
  },
  {
    id: 'sapphire',
    name: 'Sapphire Horizon',
    tagline: 'Institutional Finance & ERP',
    category: 'Corporate Finance',
    primaryColor: '#2563eb',
    secondaryColor: '#0f172a',
    accentColor: '#60a5fa',
    description:
      'High-contrast royal navy and electric sapphire favored by institutional finance and enterprise suites.',
  },
  {
    id: 'amethyst',
    name: 'Royal Amethyst',
    tagline: 'Luxury Commercial & Penthouses',
    category: 'Prestige & Luxury',
    primaryColor: '#7c3aed',
    secondaryColor: '#1e1035',
    accentColor: '#c084fc',
    description:
      'Opulent royal violet and imperial plum crafted for premium skyline towers and private portfolios.',
  },
  {
    id: 'terracotta',
    name: 'Warm Terracotta',
    tagline: 'Architectural Stone & Masonry',
    category: 'Artisanal Masonry',
    primaryColor: '#d97706',
    secondaryColor: '#1c1917',
    accentColor: '#fbbf24',
    description:
      'Warm architectural sandstone, artisanal terracotta, and bronze reflecting bespoke brick and stone masonry.',
  },
];

export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  defaultPalette?: ThemePalette;
  storageKey?: string;
  paletteStorageKey?: string;
}

export interface ThemeProviderState {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  palette: ThemePalette;
  setTheme: (theme: Theme) => void;
  setPalette: (palette: ThemePalette) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  defaultPalette = 'meridian',
  storageKey = 'exzaestate-ui-theme',
  paletteStorageKey = 'exzaestate-ui-palette',
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

  const [palette, setPaletteState] = useState<ThemePalette>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(paletteStorageKey) as ThemePalette;
        if (['meridian', 'emerald', 'sapphire', 'amethyst', 'terracotta'].includes(stored)) {
          return stored;
        }
      } catch {
        // LocalStorage access fallback
      }
    }
    return defaultPalette;
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

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('data-palette', palette);
  }, [palette]);

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

  const setPalette = useCallback(
    (newPalette: ThemePalette) => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(paletteStorageKey, newPalette);
        } catch {
          // Ignore storage errors
        }
        window.document.documentElement.setAttribute('data-palette', newPalette);
      }
      setPaletteState(newPalette);
    },
    [paletteStorageKey],
  );

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        palette,
        setTheme,
        setPalette,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

const defaultThemeState: ThemeProviderState = {
  theme: 'system',
  resolvedTheme: 'light',
  palette: 'meridian',
  setTheme: () => undefined,
  setPalette: () => undefined,
  toggleTheme: () => undefined,
};

export function useTheme(): ThemeProviderState {
  const context = useContext(ThemeContext);
  return context ?? defaultThemeState;
}
