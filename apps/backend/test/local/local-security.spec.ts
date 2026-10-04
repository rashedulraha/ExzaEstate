import { describe, expect, it } from 'vitest';
import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { LocalSecretGuard } from '../../src/common/guards/local-secret.guard.js';
import { ConfigService } from '../../src/config/config.service.js';
import { validateEnv } from '../../src/config/env.schema.js';

describe('A10.2 — Local Security: Loopback Binding & Per-Launch Secret', () => {
  function createGuard(mode: 'cloud' | 'local', secret?: string): LocalSecretGuard {
    const env = validateEnv({
      NODE_ENV: 'test',
      RUNTIME_MODE: mode,
      LOCAL_API_SECRET: secret,
      DATABASE_URL: 'postgresql://exza_app:secret@localhost:5432/exzaestate',
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: 'super_secret_jwt_access_token_key_at_least_32_chars',
      JWT_REFRESH_SECRET: 'super_secret_jwt_refresh_token_key_at_least_32_chars',
      STORAGE_ENDPOINT: 'http://localhost:9000',
      STORAGE_BUCKET: 'exzaestate-documents',
      STORAGE_ACCESS_KEY: 'minioadmin',
      STORAGE_SECRET_KEY: 'minioadmin',
    });
    const configService = new ConfigService(env);
    return new LocalSecretGuard(configService);
  }

  function mockContext(headers: Record<string, string>, path: string = '/api/v1/properties'): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          path,
          url: path,
          method: 'GET',
          ip: '127.0.0.1',
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows all requests when in cloud mode with no local secret configured', () => {
    const guard = createGuard('cloud');
    const ctx = mockContext({ host: 'app.exzaestate.com' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects foreign Host header in local mode to prevent DNS rebinding (403 INVALID_HOST_HEADER)', () => {
    const guard = createGuard('local', 'secret_256_bit_launch_key_12345');
    const ctx = mockContext({ host: 'evil-attacker.com' });

    expect(() => guard.canActivate(ctx)).toThrowError(ForbiddenException);
    try {
      guard.canActivate(ctx);
    } catch (err: unknown) {
      const response = (err as ForbiddenException).getResponse() as Record<string, unknown>;
      expect(response.code).toBe('INVALID_HOST_HEADER');
    }
  });

  it('permits loopback Host headers (127.0.0.1 and localhost)', () => {
    const guard = createGuard('local', 'secret_256_bit_launch_key_12345');
    const ctx1 = mockContext({ host: '127.0.0.1:14201', 'x-local-secret': 'secret_256_bit_launch_key_12345' });
    const ctx2 = mockContext({ host: 'localhost:14201', 'x-local-secret': 'secret_256_bit_launch_key_12345' });

    expect(guard.canActivate(ctx1)).toBe(true);
    expect(guard.canActivate(ctx2)).toBe(true);
  });

  it('exempts /api/v1/health from secret requirement for launcher startup probes', () => {
    const guard = createGuard('local', 'secret_256_bit_launch_key_12345');
    const ctx = mockContext({ host: '127.0.0.1:14201' }, '/api/v1/health');

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects business requests missing X-Local-Secret header (403 LOCAL_SECRET_REQUIRED)', () => {
    const guard = createGuard('local', 'secret_256_bit_launch_key_12345');
    const ctx = mockContext({ host: '127.0.0.1:14201' }, '/api/v1/properties');

    expect(() => guard.canActivate(ctx)).toThrowError(ForbiddenException);
    try {
      guard.canActivate(ctx);
    } catch (err: unknown) {
      const response = (err as ForbiddenException).getResponse() as Record<string, unknown>;
      expect(response.code).toBe('LOCAL_SECRET_REQUIRED');
    }
  });

  it('rejects business requests with invalid X-Local-Secret header (403 LOCAL_SECRET_INVALID)', () => {
    const guard = createGuard('local', 'secret_256_bit_launch_key_12345');
    const ctx = mockContext(
      { host: '127.0.0.1:14201', 'x-local-secret': 'wrong_secret' },
      '/api/v1/properties',
    );

    expect(() => guard.canActivate(ctx)).toThrowError(ForbiddenException);
    try {
      guard.canActivate(ctx);
    } catch (err: unknown) {
      const response = (err as ForbiddenException).getResponse() as Record<string, unknown>;
      expect(response.code).toBe('LOCAL_SECRET_INVALID');
    }
  });

  it('accepts requests with valid loopback Host and valid X-Local-Secret header', () => {
    const guard = createGuard('local', 'secret_256_bit_launch_key_12345');
    const ctx = mockContext(
      { host: '127.0.0.1:14201', 'x-local-secret': 'secret_256_bit_launch_key_12345' },
      '/api/v1/properties',
    );

    expect(guard.canActivate(ctx)).toBe(true);
  });
});
