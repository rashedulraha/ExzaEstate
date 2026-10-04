import { describe, expect, it } from 'vitest';
import type { ConfigService } from '../../config/config.service.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthService & HealthController', () => {
  const mockConfigService = {
    minSupportedClientVersion: '0.1.0',
  } as unknown as ConfigService;

  it('HealthService returns minSupportedClientVersion when healthy', async () => {
    const service = new HealthService(undefined, undefined, undefined, mockConfigService);
    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.minSupportedClientVersion).toBe('0.1.0');
  });

  it('HealthController delegates to HealthService and returns minSupportedClientVersion', async () => {
    const service = new HealthService(undefined, undefined, undefined, mockConfigService);
    const controller = new HealthController(service);

    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.minSupportedClientVersion).toBe('0.1.0');
  });
});
