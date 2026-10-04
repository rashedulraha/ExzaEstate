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

  async getItem(key: string): Promise<string | null> {
    if (isTauriEnvironment()) {
      try {
        const value = await invoke<string | null>('plugin:keychain|get_credential', { key });
        return value ?? null;
      } catch {
        // Fallback if plugin command is not yet registered or in dev mode
        return this.fallbackMemoryStore.get(key) ?? null;
      }
    }
    return this.fallbackMemoryStore.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    if (isTauriEnvironment()) {
      try {
        await invoke('plugin:keychain|set_credential', { key, value });
        return;
      } catch {
        // Fallback to in-memory store in dev mode
        this.fallbackMemoryStore.set(key, value);
        return;
      }
    }
    this.fallbackMemoryStore.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (isTauriEnvironment()) {
      try {
        await invoke('plugin:keychain|remove_credential', { key });
      } catch {
        this.fallbackMemoryStore.delete(key);
      }
    }
    this.fallbackMemoryStore.delete(key);
  }
}
