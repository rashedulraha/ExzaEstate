import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DesktopUpdater } from './updater.js';
import { check } from '@tauri-apps/plugin-updater';

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn(),
}));

describe('DesktopUpdater Platform Adapter (Task B11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null and does not throw when outside Tauri environment', async () => {
    const updater = new DesktopUpdater();
    const result = await updater.check();
    expect(result).toBeNull();
  });

  it('notifies status listeners across lifecycle', async () => {
    // Simulate Tauri environment
    (window as unknown as { __TAURI_INTERNALS__: Record<string, unknown> }).__TAURI_INTERNALS__ =
      {};

    const statuses: string[] = [];
    const updater = new DesktopUpdater();
    const unsubscribe = updater.onStatusChange((status) => {
      statuses.push(status);
    });

    vi.mocked(check).mockResolvedValueOnce(null);

    const result = await updater.check();
    expect(result).toBeNull();
    expect(statuses).toEqual(['CHECKING', 'IDLE']);

    unsubscribe();
    // Subsequent calls should not notify unsubscribed listener
    await updater.check();
    expect(statuses).toEqual(['CHECKING', 'IDLE']);

    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it('returns UpdateInfo and notifies AVAILABLE when valid update with signature is found', async () => {
    (window as unknown as { __TAURI_INTERNALS__: Record<string, unknown> }).__TAURI_INTERNALS__ =
      {};

    const statuses: string[] = [];
    const updater = new DesktopUpdater();
    updater.onStatusChange((status) => {
      statuses.push(status);
    });

    const mockUpdate = {
      available: true,
      version: '0.2.0',
      date: '2026-10-15T00:00:00Z',
      body: 'Release 0.2.0 with enhanced performance and security.',
      downloadAndInstall: vi
        .fn()
        .mockImplementation(async (callback?: (event: { event: string }) => void) => {
          if (callback) callback({ event: 'Finished' });
        }),
    };

    vi.mocked(check).mockResolvedValueOnce(
      mockUpdate as unknown as Awaited<ReturnType<typeof check>>,
    );

    const updateInfo = await updater.check();
    expect(updateInfo).toEqual({
      version: '0.2.0',
      date: '2026-10-15T00:00:00Z',
      body: 'Release 0.2.0 with enhanced performance and security.',
    });
    expect(statuses).toContain('AVAILABLE');

    // Test install
    await updater.install();
    expect(mockUpdate.downloadAndInstall).toHaveBeenCalled();
    expect(statuses).toContain('DOWNLOADING');
    expect(statuses).toContain('DOWNLOADED');
    expect(statuses).toContain('INSTALLING');

    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it('transitions to ERROR when cryptographic signature verification or check fails', async () => {
    (window as unknown as { __TAURI_INTERNALS__: Record<string, unknown> }).__TAURI_INTERNALS__ =
      {};

    const statuses: string[] = [];
    const updater = new DesktopUpdater();
    updater.onStatusChange((status) => {
      statuses.push(status);
    });

    vi.mocked(check).mockRejectedValueOnce(
      new Error('SIGNATURE_VERIFICATION_FAILED: signature mismatch or untrusted key'),
    );

    const result = await updater.check();
    expect(result).toBeNull();
    expect(statuses).toEqual(['CHECKING', 'ERROR']);

    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it('install does not throw when called with no active update', async () => {
    const updater = new DesktopUpdater();
    await expect(updater.install()).resolves.not.toThrow();
  });
});
