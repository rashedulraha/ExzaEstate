import { describe, expect, it } from 'vitest';
import { createQueryClient, queryClient } from './query-client.js';
import * as mswMocks from './mocks/index.js';

describe('Query Client & MSW Mocks (Task A2.3 S2 & S3)', () => {
  it('creates QueryClient with enterprise default configurations', () => {
    const qc = createQueryClient();
    const defaultOptions = qc.getDefaultOptions();

    expect(defaultOptions.queries?.staleTime).toBe(120000);
    expect(defaultOptions.queries?.gcTime).toBe(600000);
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaultOptions.mutations?.retry).toBe(false);
  });

  it('rejects retrying client 4xx HTTP errors', () => {
    const qc = createQueryClient();
    const retryFn = qc.getDefaultOptions().queries?.retry as (
      failureCount: number,
      error: unknown,
    ) => boolean;

    expect(retryFn(0, { status: 400 })).toBe(false);
    expect(retryFn(0, { status: 401 })).toBe(false);
    expect(retryFn(0, { status: 403 })).toBe(false);
    expect(retryFn(0, { status: 404 })).toBe(false);
    expect(retryFn(0, { status: 409 })).toBe(false);
    expect(retryFn(0, { status: 426 })).toBe(false);
  });

  it('allows retrying transient network and 5xx errors up to 2 times', () => {
    const qc = createQueryClient();
    const retryFn = qc.getDefaultOptions().queries?.retry as (
      failureCount: number,
      error: unknown,
    ) => boolean;

    expect(retryFn(0, { status: 500 })).toBe(true);
    expect(retryFn(1, { status: 502 })).toBe(true);
    expect(retryFn(2, { status: 503 })).toBe(false);
    expect(retryFn(0, new Error('Network error'))).toBe(true);
    expect(retryFn(2, new Error('Network error'))).toBe(false);
  });

  it('exports singleton queryClient instance', () => {
    expect(queryClient).toBeDefined();
    expect(typeof queryClient.getQueryCache).toBe('function');
  });

  it('provides test-only MSW mock handlers for all modules including properties', () => {
    expect(mswMocks).toBeDefined();
    // Verify properties mock exists from golden module
    expect(
      typeof (mswMocks as Record<string, unknown>).getPropertyControllerListPropertiesMockHandler,
    ).toBe('function');
  });
});
