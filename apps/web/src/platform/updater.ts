import type { Updater, UpdateInfo } from '@exzaestate/app-core';

export class WebUpdater implements Updater {
  async check(): Promise<UpdateInfo | null> {
    // Web application automatically fetches updated assets upon browser reload/navigation
    return null;
  }

  async install(): Promise<void> {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  onStatusChange?(_callback: (status: string) => void): () => void {
    return () => {};
  }
}
