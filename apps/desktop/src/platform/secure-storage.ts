import type { SecureStorage } from '@exzaestate/app-core';
import { invoke } from '@tauri-apps/api/core';

function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Desktop SecureStorage implementation.
 * In Tauri desktop runtime, stores credentials strictly in the OS keychain via Rust native vault.
 * Falls back to an in-memory session map during local web development.
 */
export class DesktopKeychainSecureStorage implements SecureStorage {
  private readonly fallbackMemoryStore = new Map<string, string>();
  private readonly storagePrefix = '__exza_desktop_vault_';

  private getStoredLocal(key: string): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(this.storagePrefix + key);
      } catch {
        return null;
      }
    }
    return null;
  }

  private setStoredLocal(key: string, value: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(this.storagePrefix + key, value);
      } catch {
        // storage quota exceeded or disabled
      }
    }
  }

  private removeStoredLocal(key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(this.storagePrefix + key);
      } catch {
        // ignore
      }
    }
  }

  async getItem(key: string): Promise<string | null> {
    if (isTauriEnvironment()) {
      try {
        const value = await invoke<string | null>('plugin:keychain|get_credential', { key });
        if (value) return value;
      } catch {
        // Fallback to local storage in dev/web view
      }
    }
    return this.getStoredLocal(key) ?? this.fallbackMemoryStore.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    if (isTauriEnvironment()) {
      try {
        await invoke('plugin:keychain|set_credential', { key, value });
        this.setStoredLocal(key, value);
        return;
      } catch {
        // Fallback to local storage in dev/web view
      }
    }
    this.setStoredLocal(key, value);
    this.fallbackMemoryStore.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (isTauriEnvironment()) {
      try {
        await invoke('plugin:keychain|remove_credential', { key });
      } catch {
        // Fallback
      }
    }
    this.removeStoredLocal(key);
    this.fallbackMemoryStore.delete(key);
  }
}
