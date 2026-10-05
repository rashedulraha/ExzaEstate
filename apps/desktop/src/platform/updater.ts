import type { Updater, UpdateInfo } from '@exzaestate/app-core';
import { check } from '@tauri-apps/plugin-updater';

function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export type UpdateStatus =
  | 'IDLE'
  | 'CHECKING'
  | 'AVAILABLE'
  | 'DOWNLOADING'
  | 'DOWNLOADED'
  | 'INSTALLING'
  | 'ERROR';

export class DesktopUpdater implements Updater {
  private activeUpdate: Awaited<ReturnType<typeof check>> | null = null;
  private readonly listeners = new Set<(status: string) => void>();

  onStatusChange(callback: (status: string) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyStatus(status: UpdateStatus): void {
    for (const listener of this.listeners) {
      listener(status);
    }
  }

  async check(): Promise<UpdateInfo | null> {
    if (!isTauriEnvironment()) {
      return null;
    }
    this.notifyStatus('CHECKING');
    try {
      // Query release manifest with target architecture and current version only
      // Zero business, customer, or financial data is transmitted
      const update = await check();
      this.activeUpdate = update;
      if (update?.available) {
        this.notifyStatus('AVAILABLE');
        return {
          version: update.version,
          date: update.date,
          body: update.body,
        };
      }
      this.notifyStatus('IDLE');
      return null;
    } catch (err) {
      this.notifyStatus('ERROR');
      console.warn('Update check failed or signature verification rejected update:', err);
      return null;
    }
  }

  async install(): Promise<void> {
    if (!this.activeUpdate) {
      return;
    }
    this.notifyStatus('DOWNLOADING');
    try {
      await this.activeUpdate.downloadAndInstall((event) => {
        if (event.event === 'Finished') {
          this.notifyStatus('DOWNLOADED');
        }
      });
      this.notifyStatus('INSTALLING');
    } catch (err) {
      this.notifyStatus('ERROR');
      throw err;
    }
  }
}
