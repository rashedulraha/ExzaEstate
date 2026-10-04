import type { Updater, UpdateInfo } from '@exzaestate/app-core';
import { check } from '@tauri-apps/plugin-updater';

function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export class DesktopUpdater implements Updater {
  private activeUpdate: Awaited<ReturnType<typeof check>> | null = null;

  async check(): Promise<UpdateInfo | null> {
    if (!isTauriEnvironment()) {
      return null;
    }
    try {
      const update = await check();
      this.activeUpdate = update;
      if (update) {
        return {
          version: update.version,
          date: update.date,
          body: update.body,
        };
      }
      return null;
    } catch (err) {
      console.warn('Update check failed:', err);
      return null;
    }
  }

  async install(): Promise<void> {
    if (this.activeUpdate) {
      await this.activeUpdate.downloadAndInstall();
    }
  }
}
