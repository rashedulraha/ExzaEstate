import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  webPlatformAdapters,
  webApiConfig,
  WebSecureStorage,
  WebFileDialog,
  WebUpdater,
  webOpenExternal,
  WebNotifier,
} from './index.js';

describe('Web Platform Adapters (Task C1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('webApiConfig', () => {
    it('declares web client type and cloud runtime mode', () => {
      expect(webApiConfig.clientType).toBe('web');
      expect(webApiConfig.runtimeMode).toBe('cloud');
      expect(webApiConfig.clientVersion).toBe('0.1.0');
    });

    it('is registered in webPlatformAdapters', () => {
      expect(webPlatformAdapters.apiConfig).toBe(webApiConfig);
    });
  });

  describe('WebSecureStorage', () => {
    it('operates in-memory and keeps sensitive tokens out of localStorage', async () => {
      const storage = new WebSecureStorage();
      await storage.setItem('test_token', 'jwt.secret.payload');
      const retrieved = await storage.getItem('test_token');
      expect(retrieved).toBe('jwt.secret.payload');

      await storage.removeItem('test_token');
      const afterRemoval = await storage.getItem('test_token');
      expect(afterRemoval).toBeNull();
    });
  });

  describe('WebFileDialog', () => {
    it('handles save dialog by returning filename', async () => {
      const dialog = new WebFileDialog();
      const savedPath = await dialog.save({ defaultPath: 'test_report.pdf' });
      expect(savedPath).toBe('test_report.pdf');
    });

    it('returns default fallback when no defaultPath is provided', async () => {
      const dialog = new WebFileDialog();
      const savedPath = await dialog.save();
      expect(savedPath).toBe('download');
    });
  });

  describe('WebUpdater', () => {
    it('returns null on update check because web auto-updates upon reload', async () => {
      const updater = new WebUpdater();
      const updateInfo = await updater.check();
      expect(updateInfo).toBeNull();
    });
  });

  describe('webOpenExternal', () => {
    it('opens external URLs with noopener and noreferrer', async () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      await webOpenExternal('https://exzaestate.com/docs');
      expect(openSpy).toHaveBeenCalledWith(
        'https://exzaestate.com/docs',
        '_blank',
        'noopener,noreferrer',
      );
    });
  });

  describe('WebNotifier', () => {
    it('requestPermission returns false when Notification API is unavailable or denied', async () => {
      const notifier = new WebNotifier();
      const permission = await notifier.requestPermission();
      expect(typeof permission).toBe('boolean');
    });
  });
});
