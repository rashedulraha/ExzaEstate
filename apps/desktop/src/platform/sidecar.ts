import type { SidecarControl, SidecarStatus } from '@exzaestate/app-core';
import { invoke } from '@tauri-apps/api/core';
import { apiClient } from '@exzaestate/api-client';

function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export const MAX_RESTART_RETRIES = 3;
export const HEALTH_TIMEOUT_MS = 30000;

export function computeRestartBackoff(attempt: number): number {
  if (attempt <= 1) return 1000;
  if (attempt === 2) return 2000;
  return 4000;
}

export class DesktopSidecarControl implements SidecarControl {
  private restartAttempts = 0;
  private currentPort = 3000;

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
    if (this.restartAttempts >= MAX_RESTART_RETRIES) {
      throw new Error(`Sidecar exceeded maximum of ${MAX_RESTART_RETRIES} restart attempts`);
    }

    this.restartAttempts += 1;
    const backoffMs = computeRestartBackoff(this.restartAttempts);
    await new Promise((resolve) => setTimeout(resolve, backoffMs));

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
      port: this.currentPort,
    };
  }

  async pollHealth(port: number, secret?: string, timeoutMs = HEALTH_TIMEOUT_MS): Promise<boolean> {
    const startTime = Date.now();
    const headers: Record<string, string> = {};
    if (secret) {
      headers['X-Local-Secret'] = secret;
    }

    while (Date.now() - startTime < timeoutMs) {
      try {
        const res = await apiClient.get(`http://127.0.0.1:${port}/api/v1/health`, {
          headers,
          timeout: 2000,
        });
        if (res.status === 200) {
          this.currentPort = port;
          this.restartAttempts = 0;
          return true;
        }
      } catch {
        // Retry after short delay
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return false;
  }

  async getLogDir(): Promise<string> {
    if (isTauriEnvironment()) {
      return invoke<string>('get_log_dir');
    }
    return 'AppData/ExzaEstate/logs';
  }

  async openLogDir(): Promise<void> {
    if (isTauriEnvironment()) {
      await invoke('open_log_dir');
    }
  }
}
