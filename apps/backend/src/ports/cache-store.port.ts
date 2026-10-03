/**
 * CacheStore Port
 * Clean-architecture boundary for key-value caching, rate limiting, and session invalidation.
 * Implemented by RedisCacheStore in Cloud mode, and InMemoryCacheStore in Local mode.
 */
export interface CacheStore {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  close(): Promise<void>;
}
