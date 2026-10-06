import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
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

  it('renders ThemeToggle and opens menu on click', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>,
    );

    const toggleBtn = screen.getByRole('button', { name: /toggle theme/i });
    expect(toggleBtn).toBeDefined();

    // Menu should be closed initially
    expect(screen.queryByRole('menu')).toBeNull();

    // Click to open menu
    fireEvent.click(toggleBtn);
    expect(screen.getByRole('menu')).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /light/i })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /dark/i })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /system/i })).toBeDefined();
  });

  it('switches to dark theme when Dark is clicked', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /dark/i }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('exzaestate-ui-theme')).toBe('dark');
  });

  it('switches to light theme when Light is clicked', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeToggle />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /light/i }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('exzaestate-ui-theme')).toBe('light');
  });
});
