import { Inject, Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import type { CacheStore } from '../../ports/cache-store.port.js';
import { CACHE_STORE } from '../../ports/tokens.js';

export interface HealthCheckResult {
  status: 'ok';
  details?: {
    database: { status: 'up' | 'down'; message?: string };
    redis: { status: 'up' | 'down'; message?: string };
    storage: { status: 'up' | 'down'; message?: string };
  };
}

@Injectable()
export class HealthService {
  constructor(
    @Optional() private readonly prismaService?: PrismaService,
    @Optional() @Inject(CACHE_STORE) private readonly cacheStore?: CacheStore,
    @Optional() private readonly storageService?: StorageService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const details = {
      database: { status: 'up' as 'up' | 'down', message: undefined as string | undefined },
      redis: { status: 'up' as 'up' | 'down', message: undefined as string | undefined },
      storage: { status: 'up' as 'up' | 'down', message: undefined as string | undefined },
    };

    let hasFailure = false;

    // Check Database reachability
    if (this.prismaService) {
      try {
        await Promise.race([
          this.prismaService.$queryRaw`SELECT 1`,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 3000)),
        ]);
      } catch (err: unknown) {
        hasFailure = true;
        details.database = { status: 'down', message: (err as Error).message };
      }
    }

    // Check Redis / Cache reachability
    if (this.cacheStore) {
      try {
        await Promise.race([
          this.cacheStore.get('health:ping'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 3000)),
        ]);
      } catch (err: unknown) {
        hasFailure = true;
        details.redis = { status: 'down', message: (err as Error).message };
      }
    }

    // Check Storage reachability
    if (this.storageService) {
      try {
        await Promise.race([
          this.storageService.ensureBucketExists(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Storage timeout')), 3000)),
        ]);
      } catch (err: unknown) {
        hasFailure = true;
        details.storage = { status: 'down', message: (err as Error).message };
      }
    }

    if (hasFailure) {
      throw new ServiceUnavailableException({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Health check failed: dependent service is unavailable',
        details,
      });
    }

    return { status: 'ok' };
  }
}
