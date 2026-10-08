import { ERROR_CODES } from '@exzaestate/shared';
import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '../../config/config.service.js';
import { ClientVersionMiddleware } from './client-version.middleware.js';

describe('ClientVersionMiddleware (D-13 / ARCH-API-COMPAT)', () => {
  const mockConfigService = {
    minSupportedClientVersion: '0.1.0',
  } as unknown as ConfigService;

  function createMocks(options: { headers?: Record<string, string>; path?: string }) {
    const req = {
      headers: options.headers ?? {},
      path: options.path ?? '/api/v1/sales/bookings',
      baseUrl: '',
      originalUrl: options.path ?? '/api/v1/sales/bookings',
    } as unknown as Request;

    const resJson = vi.fn();
    const resStatus = vi.fn().mockReturnValue({ json: resJson });
    const res = {
      status: resStatus,
      json: resJson,
    } as unknown as Response;

    const next = vi.fn();

    return { req, res, resStatus, resJson, next };
  }

  it('allows request when X-Client-Version header is absent (e.g. Web browser)', () => {
    const middleware = new ClientVersionMiddleware(mockConfigService);
    const { req, res, next } = createMocks({});

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows request when X-Client-Version equals minimum supported version', () => {
    const middleware = new ClientVersionMiddleware(mockConfigService);
    const { req, res, next } = createMocks({
      headers: { 'x-client-version': '0.1.0' },
    });

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows request when X-Client-Version exceeds minimum supported version', () => {
    const middleware = new ClientVersionMiddleware(mockConfigService);
    const { req, res, next } = createMocks({
      headers: { 'x-client-version': '1.2.3' },
    });

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows request to /health even with an outdated X-Client-Version header', () => {
    const middleware = new ClientVersionMiddleware(mockConfigService);
    const { req, res, next } = createMocks({
      headers: { 'x-client-version': '0.0.1' },
      path: '/api/v1/health',
    });

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows request to /docs even with an outdated X-Client-Version header', () => {
    const middleware = new ClientVersionMiddleware(mockConfigService);
    const { req, res, next } = createMocks({
      headers: { 'x-client-version': '0.0.1' },
      path: '/api/docs',
    });

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects request with HTTP 426 CLIENT_UPGRADE_REQUIRED when version is older than minimum', () => {
    const middleware = new ClientVersionMiddleware(mockConfigService);
    const { req, res, resStatus, resJson, next } = createMocks({
      headers: { 'x-client-version': '0.0.9' },
      path: '/api/v1/sales/bookings',
    });

    middleware.use(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(resStatus).toHaveBeenCalledWith(426);
    expect(resJson).toHaveBeenCalledWith({
      success: false,
      error: {
        code: ERROR_CODES.CLIENT_UPGRADE_REQUIRED,
        message: 'Client version 0.0.9 is below minimum supported version 0.1.0. Upgrade required.',
        details: {
          clientVersion: '0.0.9',
          minSupportedClientVersion: '0.1.0',
        },
      },
    });
  });
});
