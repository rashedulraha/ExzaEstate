import type { SidecarControl, SidecarStatus } from '@exzaestate/app-core';
import { invoke } from '@tauri-apps/api/core';

function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export class DesktopSidecarControl implements SidecarControl {
  async start(): Promise<void> {
    if (isTauriEnvironment()) {
      await invoke('start_local_sidecar');
    }
  }

  async stop(): Promise<void> {
    if (isTauriEnvironment()) {
      await invoke('stop_local_sidecar');
    }
  }

  async restart(): Promise<void> {
    if (isTauriEnvironment()) {
      await invoke('restart_local_sidecar');
    }
  }

  async getStatus(): Promise<SidecarStatus> {
    if (isTauriEnvironment()) {
      try {
        return await invoke<SidecarStatus>('get_sidecar_status');
      } catch (err) {
        return {
          running: false,
          error: String(err),
        };
      }
    }
    return {
      running: true,
      port: 3000,
    };
  }
}
