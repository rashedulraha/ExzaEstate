import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeProvider.js';
import { ThemeToggle } from './ThemeToggle.js';

describe('ThemeProvider & ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('returns default fallback state when useTheme is called outside ThemeProvider', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('renders children with default theme', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <div data-testid="child">App Content</div>
      </ThemeProvider>,
    );

    expect(screen.getByTestId('child')).toBeDefined();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('renders ThemeToggle as rounded button with toggle theme aria-label', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>,
    );

    const toggleBtn = screen.getByRole('button', { name: /toggle theme/i });
    expect(toggleBtn).toBeDefined();
    expect(toggleBtn.className).toContain('rounded-full');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('directly toggles between light and dark theme on click without sub-menu', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>,
    );

    const toggleBtn = screen.getByRole('button', { name: /toggle theme/i });

    // Initial is light
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Click to toggle to dark
    fireEvent.click(toggleBtn);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('exzaestate-ui-theme')).toBe('dark');
    expect(screen.queryByRole('menu')).toBeNull();

    // Click again to toggle back to light
    fireEvent.click(toggleBtn);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('exzaestate-ui-theme')).toBe('light');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('initializes with default palette and allows setting palette', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    expect(result.current.palette).toBe('meridian');
    expect(document.documentElement.getAttribute('data-palette')).toBe('meridian');

    act(() => {
      result.current.setPalette('emerald');
    });
    expect(result.current.palette).toBe('emerald');
    expect(document.documentElement.getAttribute('data-palette')).toBe('emerald');
    expect(localStorage.getItem('exzaestate-ui-palette')).toBe('emerald');
  });
});
