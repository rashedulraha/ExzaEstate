import { Injectable } from '@nestjs/common';
import type { CacheStore } from '../../ports/cache-store.port.js';

interface CacheEntry {
  value: unknown;
  expiresAt?: number;
}

@Injectable()
export class InMemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, CacheEntry>();

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string): Promise<number> {
    const current = await this.get<number>(key);
    const next = (typeof current === 'number' ? current : 0) + 1;
    await this.set(key, next);
    return next;
  }

  async close(): Promise<void> {
    this.store.clear();
  }
}
