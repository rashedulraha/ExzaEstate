import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { GlobalSearchCommandPalette } from './components/GlobalSearchCommandPalette.js';

// Mock apiClient to prevent network calls
vi.mock('@exzaestate/api-client', () => ({
  useSearchControllerGlobalSearch: () => ({
    data: undefined,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

describe('Global Search Command Palette', () => {
  it('does not render when isOpen is false', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <GlobalSearchCommandPalette isOpen={false} onClose={onClose} />
      </MemoryRouter>,
    );

    expect(screen.queryByPlaceholderText(/Search across customers/i)).toBeNull();
  });

  it('renders search input and default navigation commands when open', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <GlobalSearchCommandPalette isOpen={true} onClose={onClose} />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(/Search across customers/i);
    expect(input).toBeDefined();

    // Default fast-jump commands
    expect(screen.getByText('Go to Executive Dashboard')).toBeDefined();
    expect(screen.getByText('Browse Property Inventory')).toBeDefined();
    expect(screen.getByText('View All Bookings')).toBeDefined();
    expect(screen.getByText('Security & Audit Log Viewer')).toBeDefined();
  });

  it('handles input changes and escape key to close', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <GlobalSearchCommandPalette isOpen={true} onClose={onClose} />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(/Search across customers/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Gulshan' } });
    expect(input.value).toBe('Gulshan');

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('transitions from closed (isOpen: false) to open (isOpen: true) without hook order violations', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <GlobalSearchCommandPalette isOpen={false} onClose={onClose} />
      </MemoryRouter>,
    );

    expect(screen.queryByPlaceholderText(/Search across customers/i)).toBeNull();

    // Rerender as open — must strictly avoid "Rendered more hooks than during the previous render"
    rerender(
      <MemoryRouter>
        <GlobalSearchCommandPalette isOpen={true} onClose={onClose} />
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText(/Search across customers/i)).toBeDefined();
  });
});
