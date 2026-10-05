import { describe, expect, it } from 'vitest';
import { AppController } from './app.controller.js';
import { ConfigService } from './config/config.service.js';
import type { RequestWithMetadata } from './common/logging/request-logging.middleware.js';

describe('AppController', () => {
  const mockConfigService = {
    isProduction: false,
    minSupportedClientVersion: '0.1.0',
    corsOrigins: ['http://localhost:5173'],
  } as unknown as ConfigService;

  it('returns welcome message, status, version and requestId unit', () => {
    const controller = new AppController(mockConfigService);
    const mockReq = {
      requestId: 'test-req-id-1234',
    } as unknown as RequestWithMetadata;

    const result = controller.getRoot(mockReq);

    expect(result.data.message).toBe('ExzaEstate Enterprise ERP API is operational');
    expect(result.data.status).toBe('online');
    expect(result.data.version).toBe('0.1.0');
    expect(result.data.requestId).toBe('test-req-id-1234');
    expect(result.data.docs).toBe('/api/docs');
    expect(result.meta.requestId).toBe('test-req-id-1234');
    expect(result.meta.timestamp).toBeDefined();
  });

  it('falls back to req.id or unknown if requestId is absent', () => {
    const controller = new AppController(mockConfigService);
    const mockReq = {} as unknown as RequestWithMetadata;

    const result = controller.getRoot(mockReq);

    expect(result.data.requestId).toBe('unknown');
    expect(result.meta.requestId).toBe('unknown');
  });
});
