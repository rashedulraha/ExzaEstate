import { describe, it, expect, vi } from 'vitest';
import { DesktopSidecarControl, computeRestartBackoff, MAX_RESTART_RETRIES } from './sidecar.js';

describe('DesktopSidecarControl', () => {
  it('computes exponential backoff delays', () => {
    expect(computeRestartBackoff(1)).toBe(1000);
    expect(computeRestartBackoff(2)).toBe(2000);
    expect(computeRestartBackoff(3)).toBe(4000);
    expect(computeRestartBackoff(4)).toBe(4000);
  });

  it('initializes in non-Tauri browser/test mode with running status', async () => {
    const sidecar = new DesktopSidecarControl();
    const status = await sidecar.getStatus();
    expect(status.running).toBe(true);
    expect(status.port).toBe(3000);
  });

  it('enforces maximum 3 restart attempts before erroring', async () => {
    vi.useFakeTimers();
    const sidecar = new DesktopSidecarControl();

    const p1 = sidecar.restart();
    await vi.advanceTimersByTimeAsync(1000);
    await p1;

    const p2 = sidecar.restart();
    await vi.advanceTimersByTimeAsync(2000);
    await p2;

    const p3 = sidecar.restart();
    await vi.advanceTimersByTimeAsync(4000);
    await p3;

    await expect(sidecar.restart()).rejects.toThrow(
      `Sidecar exceeded maximum of ${MAX_RESTART_RETRIES} restart attempts`,
    );

    vi.useRealTimers();
  });

  it('returns default log directory in non-Tauri environment', async () => {
    const sidecar = new DesktopSidecarControl();
    const logDir = await sidecar.getLogDir();
    expect(logDir).toContain('logs');
  });
});
