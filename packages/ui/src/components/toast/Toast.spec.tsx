import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast.js';

function TestComponent() {
  const { showToast } = useToast();
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          showToast({
            family: 'success',
            title: 'Plot Reserved',
            description: 'Plot A-102 was reserved successfully',
          })
        }
      >
        Trigger Toast
      </button>
    </div>
  );
}

describe('Toast Component & Provider', () => {
  it('renders and displays toasts triggered through context', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    expect(screen.queryByText('Plot Reserved')).toBeNull();

    fireEvent.click(screen.getByText('Trigger Toast'));

    expect(screen.getByText('Plot Reserved')).toBeDefined();
    expect(screen.getByText('Plot A-102 was reserved successfully')).toBeDefined();
  });

  it('allows dismissing a toast via the close button', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Trigger Toast'));
    expect(screen.getByText('Plot Reserved')).toBeDefined();

    const dismissBtn = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissBtn);

    expect(screen.queryByText('Plot Reserved')).toBeNull();
  });

  it('safely falls back without throwing when useToast is called outside ToastProvider', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<TestComponent />);

    // Clicking trigger toast should NOT throw an unhandled error
    expect(() => {
      fireEvent.click(screen.getByText('Trigger Toast'));
    }).not.toThrow();

    consoleWarnSpy.mockRestore();
  });
});
