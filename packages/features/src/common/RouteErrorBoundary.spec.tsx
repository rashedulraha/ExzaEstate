import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RouteErrorBoundary } from './RouteErrorBoundary.js';
import { ApiError } from '@exzaestate/api-client';

const mockNavigate = vi.fn();
let mockRouteError: unknown = null;
let mockPathname = '/properties/invalid-plot';

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname }),
  useRouteError: () => mockRouteError,
  isRouteErrorResponse: (
    err: unknown,
  ): err is { status: number; statusText: string; data?: unknown } => {
    return Boolean(
      err &&
        typeof err === 'object' &&
        'status' in err &&
        typeof (err as { status: unknown }).status === 'number',
    );
  },
}));

vi.mock('@exzaestate/ui', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@exzaestate/ui');
  return {
    ...actual,
    useToast: () => ({
      showToast: vi.fn(),
      removeToast: vi.fn(),
    }),
  };
});

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockRouteError = null;
    mockPathname = '/test-path';
  });

  it('renders 404 Not Found state when route is missing', () => {
    mockRouteError = {
      status: 404,
      statusText: 'Not Found',
      data: null,
    };
    mockPathname = '/collection/receipts-unknown';

    render(<RouteErrorBoundary />);

    expect(screen.getByText('Page Not Found')).toBeDefined();
    expect(screen.getByText('Route 404')).toBeDefined();
    expect(screen.getByText(/collection\/receipts-unknown/)).toBeDefined();
    expect(screen.getByText('Return to Dashboard')).toBeDefined();

    fireEvent.click(screen.getByText('Return to Dashboard'));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('renders 401 Unauthorized state with Sign In action', () => {
    mockRouteError = {
      status: 401,
      statusText: 'Unauthorized',
      data: null,
    };

    render(<RouteErrorBoundary />);

    expect(screen.getByText('Session Expired or Unauthorized')).toBeDefined();
    expect(screen.getByText('Auth 401')).toBeDefined();
    expect(screen.getByText('Sign In to Continue')).toBeDefined();

    fireEvent.click(screen.getByText('Sign In to Continue'));
    expect(mockNavigate).toHaveBeenCalledWith('/auth/login', { replace: true });
  });

  it('renders 403 Forbidden state when user lacks permissions', () => {
    mockRouteError = {
      status: 403,
      statusText: 'Forbidden',
      data: null,
    };

    render(<RouteErrorBoundary />);

    expect(screen.getByText('Access Restricted')).toBeDefined();
    expect(screen.getByText('Forbidden 403')).toBeDefined();
  });

  it('renders Backend Server Error (500) with diagnostic panel', () => {
    mockRouteError = new ApiError('INTERNAL_SERVER_ERROR', 'Database pool exhausted', 500);

    render(<RouteErrorBoundary />);

    expect(screen.getByText('Backend Server Error')).toBeDefined();
    expect(screen.getByText(/HTTP 500|INTERNAL_SERVER_ERROR/)).toBeDefined();
    expect(screen.getByText('Reload Page')).toBeDefined();
  });

  it('renders Network Disconnection state when backend is offline', () => {
    mockRouteError = new ApiError('NETWORK_ERROR', 'Network connection refused', 0);

    render(<RouteErrorBoundary />);

    expect(screen.getByText('Network / Connection Failed')).toBeDefined();
    expect(screen.getByText('Backend Disconnected')).toBeDefined();
    expect(screen.getByText(/Unable to reach the backend API server/)).toBeDefined();
  });

  it('renders Frontend Client Runtime Exception gracefully', () => {
    mockRouteError = new Error('useToast must be used within a ToastProvider');

    render(<RouteErrorBoundary />);

    expect(screen.getByText('Application Runtime Error')).toBeDefined();
    expect(screen.getByText('Frontend Client Issue')).toBeDefined();
    expect(screen.getByText('useToast must be used within a ToastProvider')).toBeDefined();
    expect(screen.getByText('Reload Page')).toBeDefined();
    expect(screen.getByText('Go to Dashboard')).toBeDefined();
  });

  it('toggles technical diagnostics drawer and copies details', async () => {
    mockRouteError = new Error('Cannot read properties of undefined (reading "name")');

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      writable: true,
      configurable: true,
    });

    render(<RouteErrorBoundary />);

    const toggleButton = screen.getByText('Technical Diagnostics & Stack Trace');
    fireEvent.click(toggleButton);

    const matches = screen.getAllByText(/Cannot read properties of undefined/);
    expect(matches.length).toBeGreaterThanOrEqual(1);

    const copyBtn = screen.getByText('Copy Diagnostics');
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalled();
  });
});
