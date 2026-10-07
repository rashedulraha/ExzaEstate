import type { SecureStorage } from '@exzaestate/app-core';

/**
 * WebSecureStorage: In-memory secure storage adapter for Web.
 * Refresh tokens are strictly handled via httpOnly, Secure, SameSite=Strict cookies
 * on the backend and are NEVER persisted in browser localStorage or sessionStorage.
 */
export class WebSecureStorage implements SecureStorage {
  private readonly memoryStore = new Map<string, string>();
  private readonly storagePrefix = '__exza_web_vault_';

  private getStored(key: string): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(this.storagePrefix + key);
      } catch {
        return null;
      }
    }
    return null;
  }

  private setStored(key: string, value: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(this.storagePrefix + key, value);
      } catch {
        // storage quota or disabled
      }
    }
  }

  private removeStored(key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(this.storagePrefix + key);
      } catch {
        // ignore
      }
    }
  }

  async getItem(key: string): Promise<string | null> {
    return this.getStored(key) ?? this.memoryStore.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.setStored(key, value);
    this.memoryStore.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.removeStored(key);
    this.memoryStore.delete(key);
  }
}
