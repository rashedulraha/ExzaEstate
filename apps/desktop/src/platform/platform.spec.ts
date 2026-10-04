import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  desktopPlatformAdapters,
  DesktopKeychainSecureStorage,
  DesktopFileDialog,
  DesktopUpdater,
  desktopOpenExternal,
  DesktopNotifier,
  DesktopSidecarControl,
} from './index.js';

describe('Desktop Platform Adapters', () => {
  beforeEach(() => {
    //
  });

  it('exposes all required platform adapters', () => {
    expect(desktopPlatformAdapters.secureStorage).toBeInstanceOf(DesktopKeychainSecureStorage);
    expect(desktopPlatformAdapters.fileDialog).toBeInstanceOf(DesktopFileDialog);
    expect(desktopPlatformAdapters.updater).toBeInstanceOf(DesktopUpdater);
    expect(desktopPlatformAdapters.notifier).toBeInstanceOf(DesktopNotifier);
    expect(desktopPlatformAdapters.sidecarControl).toBeInstanceOf(DesktopSidecarControl);
    expect(typeof desktopPlatformAdapters.openExternal).toBe('function');
    expect(desktopPlatformAdapters.apiConfig.clientType).toBe('desktop');
  });

  it('secure storage persists in memory when outside native Tauri environment', async () => {
    const storage = new DesktopKeychainSecureStorage();
    await storage.setItem('refresh_token', 'desktop_secret_refresh');
    expect(await storage.getItem('refresh_token')).toBe('desktop_secret_refresh');

    await storage.removeItem('refresh_token');
    expect(await storage.getItem('refresh_token')).toBeNull();
  });

  it('openExternal function executes safely', async () => {
    const originalOpen = window.open;
    window.open = vi.fn();
    await expect(desktopOpenExternal('https://example.com')).resolves.not.toThrow();
    expect(window.open).toHaveBeenCalledWith(
      'https://example.com',
      '_blank',
      'noopener,noreferrer',
    );
    window.open = originalOpen;
  });

  it('sidecar control reports status', async () => {
    const sidecar = new DesktopSidecarControl();
    const status = await sidecar.getStatus();
    expect(status.running).toBe(true);
    expect(status.port).toBe(3000);
  });
});
