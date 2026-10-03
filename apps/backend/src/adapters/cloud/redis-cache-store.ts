import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '../../config/config.service.js';
import type { CacheStore } from '../../ports/cache-store.port.js';

@Injectable()
export class RedisCacheStore implements CacheStore {
  private readonly redis: Redis;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get('REDIS_URL');
    this.redis = new Redis(url, { maxRetriesPerRequest: null });
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (raw === null) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  async set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.redis.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    if (key.includes('*')) {
      const keys = await this.redis.keys(key);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return;
    }
    await this.redis.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
