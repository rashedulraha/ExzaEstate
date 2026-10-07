import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import {
  ApiError,
  apiClient,
  customInstance,
  mapAxiosError,
  resetClientState,
  setAuthFailureHandler,
  setAuthToken,
  setBaseUrl,
  setClientInfo,
  setRefreshHandler,
  setTokenGetter,
} from './http.js';

describe('HTTP Mutator & Client Runtime (Task A2.3 S3)', () => {
  beforeEach(() => {
    resetClientState();
    setBaseUrl('http://localhost:3000');
    vi.restoreAllMocks();
  });

  it('attaches X-Client and X-Client-Version headers to requests', async () => {
    setClientInfo('desktop', '1.2.3');

    let capturedConfig: InternalAxiosRequestConfig | null = null;
    apiClient.defaults.adapter = async (config) => {
      capturedConfig = config;
      return {
        data: { success: true, data: { status: 'ok' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      } as AxiosResponse;
    };

    await customInstance({ url: '/test', method: 'GET' });

    expect(capturedConfig).not.toBeNull();
    expect(capturedConfig!.headers?.['X-Client']).toBe('desktop');
    expect(capturedConfig!.headers?.['X-Client-Version']).toBe('1.2.3');
  });

  it('attaches static JWT token via setAuthToken', async () => {
    setAuthToken('mock-jwt-token');

    let capturedConfig: InternalAxiosRequestConfig | null = null;
    apiClient.defaults.adapter = async (config) => {
      capturedConfig = config;
      return {
        data: { success: true, data: { id: 'user-1' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      } as AxiosResponse;
    };

    await customInstance({ url: '/api/v1/auth/me', method: 'GET' });

    expect(capturedConfig).not.toBeNull();
    expect(capturedConfig!.headers?.Authorization).toBe('Bearer mock-jwt-token');
  });

  it('attaches dynamic JWT token via setTokenGetter', async () => {
    setTokenGetter(async () => 'async-dynamic-token');

    let capturedConfig: InternalAxiosRequestConfig | null = null;
    apiClient.defaults.adapter = async (config) => {
      capturedConfig = config;
      return {
        data: { success: true, data: { id: 'user-2' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      } as AxiosResponse;
    };

    await customInstance({ url: '/api/v1/auth/me', method: 'GET' });

    expect(capturedConfig).not.toBeNull();
    expect(capturedConfig!.headers?.Authorization).toBe('Bearer async-dynamic-token');
  });

  it('unwraps response envelope { success: true, data: T, meta: ... }', async () => {
    const payload = { id: 'prop-123', code: 'UNIT-101', netPrice: '5000000' };

    apiClient.defaults.adapter = async (config) => {
      return {
        data: {
          success: true,
          data: payload,
          meta: { timestamp: '2026-10-04T00:00:00Z' },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      } as AxiosResponse;
    };

    const result = await customInstance<typeof payload>({
      url: '/properties/prop-123',
      method: 'GET',
    });
    expect(result).toEqual(payload);
  });

  it('returns raw payload when response is not wrapped in standard envelope', async () => {
    const rawData = 'csv,data,export\n1,2,3';

    apiClient.defaults.adapter = async (config) => {
      return {
        data: rawData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      } as AxiosResponse;
    };

    const result = await customInstance<string>({ url: '/export', method: 'GET' });
    expect(result).toBe(rawData);
  });

  it('maps API error responses to ApiError class with code, message, and details', async () => {
    const errorPayload = {
      success: false,
      error: {
        code: 'PROPERTY_ALREADY_BOOKED',
        message: 'The requested unit is currently booked',
        details: { propertyId: 'prop-1' },
      },
    };

    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError<typeof errorPayload>(
        'Request failed with status code 409',
        'ERR_BAD_REQUEST',
        config,
        undefined,
        {
          status: 409,
          statusText: 'Conflict',
          data: errorPayload,
          headers: {},
          config,
        } as AxiosResponse<typeof errorPayload>,
      );
    };

    try {
      await customInstance({ url: '/properties/prop-1/hold', method: 'POST' });
      expect.unreachable('Should have thrown ApiError');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe('PROPERTY_ALREADY_BOOKED');
      expect(apiErr.message).toBe('The requested unit is currently booked');
      expect(apiErr.status).toBe(409);
      expect(apiErr.details).toEqual({ propertyId: 'prop-1' });
    }
  });

  it('maps HTTP 426 to CLIENT_UPGRADE_REQUIRED error code', () => {
    const err = mapAxiosError(
      new AxiosError('Upgrade Required', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 426,
        statusText: 'Upgrade Required',
        data: { message: 'Desktop client version is outdated' },
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      } as AxiosResponse),
    );

    expect(err.code).toBe('CLIENT_UPGRADE_REQUIRED');
    expect(err.status).toBe(426);
  });

  it('attempts single refresh and retries original request upon HTTP 401', async () => {
    const refreshFn = vi.fn().mockResolvedValue('new-fresh-access-token');
    setRefreshHandler(refreshFn);

    let callCount = 0;
    let authHeaderOnRetry = '';

    apiClient.defaults.adapter = async (config) => {
      callCount++;
      if (callCount === 1) {
        throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
          status: 401,
          statusText: 'Unauthorized',
          data: { error: { code: 'UNAUTHORIZED' } },
          headers: {},
          config,
        } as AxiosResponse);
      }

      authHeaderOnRetry = config.headers?.Authorization as string;
      return {
        data: { success: true, data: { user: 'refreshed' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      } as AxiosResponse;
    };

    const result = await customInstance<{ user: string }>({ url: '/protected', method: 'GET' });

    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(authHeaderOnRetry).toBe('Bearer new-fresh-access-token');
    expect(result).toEqual({ user: 'refreshed' });
  });

  it('invokes authFailureHandler when refresh fails', async () => {
    const failureHandler = vi.fn();
    setAuthFailureHandler(failureHandler);
    setRefreshHandler(async () => {
      throw new Error('Refresh token revoked');
    });

    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        data: { error: { code: 'UNAUTHORIZED' } },
        headers: {},
        config,
      } as AxiosResponse);
    };

    await expect(customInstance({ url: '/protected', method: 'GET' })).rejects.toThrow();
    expect(failureHandler).toHaveBeenCalledTimes(1);
  });

  it('does not attempt refresh when 401 occurs on auth endpoints (/auth/refresh)', async () => {
    const refreshFn = vi.fn().mockResolvedValue('new-token');
    setRefreshHandler(refreshFn);

    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        data: { error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token' } },
        headers: {},
        config,
      } as AxiosResponse);
    };

    await expect(customInstance({ url: '/api/v1/auth/refresh', method: 'POST' })).rejects.toThrow();

    // refreshHandler should NEVER be called recursively for auth endpoints
    expect(refreshFn).not.toHaveBeenCalled();
  });
});
