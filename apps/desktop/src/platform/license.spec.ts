import { describe, it, expect, beforeEach } from 'vitest';
import { InMemorySecureStorage } from '@exzaestate/app-core';
import { DesktopLicensingService } from './license.js';

describe('DesktopLicensingService', () => {
  let storage: InMemorySecureStorage;
  let service: DesktopLicensingService;

  beforeEach(() => {
    storage = new InMemorySecureStorage();
    service = new DesktopLicensingService(storage);
  });

  it('provides deterministic machine fingerprint with 64-char SHA-256 machine ID', async () => {
    const fp = await service.getMachineFingerprint();
    expect(fp.machineId).toHaveLength(64);
    expect(fp.motherboardUuid).toBeTruthy();
    expect(fp.cpuSerial).toBeTruthy();
    expect(fp.diskSerial).toBeTruthy();
  });

  it('stores and retrieves license in SecureStorage (not in localStorage or plaintext files)', async () => {
    const licenseData = {
      payload: {
        companyId: 'company-uuid-001',
        kid: 'exza-ed25519-v1',
        machineId: '8f4c2b9a7d1e3f5a8b0c4e6d2f1a9b7c5e3d1f9a7b5c3d1e9f7a5b3c1d9e7f5a',
        maxSeats: 10,
        plan: 'ENTERPRISE',
        validUntil: '2027-01-01T00:00:00Z',
      },
      signature: 'VALID_BASE64_SIGNATURE',
    };

    await service.saveStoredLicense(licenseData);
    const retrieved = await service.getStoredLicense();
    expect(retrieved).toEqual(licenseData);

    // Verify key in secure storage
    const raw = await storage.getItem('exza_desktop_offline_license');
    expect(raw).toBeTruthy();

    await service.removeStoredLicense();
    const afterDelete = await service.getStoredLicense();
    expect(afterDelete).toBeNull();
  });

  it('verifies active license without write-lock', async () => {
    const futureDate = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
    const result = await service.verifyOfflineLicense(
      {
        companyId: 'company-uuid-001',
        kid: 'exza-ed25519-v1',
        machineId: '8f4c2b9a7d1e3f5a8b0c4e6d2f1a9b7c5e3d1f9a7b5c3d1e9f7a5b3c1d9e7f5a',
        maxSeats: 5,
        plan: 'PRO',
        validUntil: futureDate,
      },
      'VALID_SIGNATURE',
    );

    expect(result.status).toBe('ACTIVE');
    expect(result.isWriteLocked).toBe(false);
    expect(result.canExport).toBe(true);
  });

  it('evaluates grace period (<= 7 days after expiry) with write access intact', async () => {
    // 3 days ago (within 7d grace)
    const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000).toISOString();
    const result = await service.verifyOfflineLicense(
      {
        companyId: 'company-uuid-001',
        kid: 'exza-ed25519-v1',
        machineId: '8f4c2b9a7d1e3f5a8b0c4e6d2f1a9b7c5e3d1f9a7b5c3d1e9f7a5b3c1d9e7f5a',
        maxSeats: 5,
        plan: 'PRO',
        validUntil: threeDaysAgo,
      },
      'VALID_SIGNATURE',
    );

    expect(result.status).toBe('GRACE');
    expect(result.isWriteLocked).toBe(false);
    expect(result.canExport).toBe(true);
    expect(result.daysRemaining).toBeLessThanOrEqual(5);
  });

  it('locks writes when expired (> 7 days) but ALWAYS preserves data export (BR-20)', async () => {
    // 15 days ago
    const fifteenDaysAgo = new Date(Date.now() - 15 * 86400 * 1000).toISOString();
    const result = await service.verifyOfflineLicense(
      {
        companyId: 'company-uuid-001',
        kid: 'exza-ed25519-v1',
        machineId: '8f4c2b9a7d1e3f5a8b0c4e6d2f1a9b7c5e3d1f9a7b5c3d1e9f7a5b3c1d9e7f5a',
        maxSeats: 5,
        plan: 'PRO',
        validUntil: fifteenDaysAgo,
      },
      'VALID_SIGNATURE',
    );

    expect(result.status).toBe('EXPIRED');
    expect(result.isWriteLocked).toBe(true);
    expect(result.canExport).toBe(true); // BR-20: data never held hostage
  });

  it('locks writes on invalid signature or tampered valid_until', async () => {
    const result = await service.verifyOfflineLicense(
      {
        companyId: 'company-uuid-001',
        kid: 'exza-ed25519-v1',
        machineId: '8f4c2b9a7d1e3f5a8b0c4e6d2f1a9b7c5e3d1f9a7b5c3d1e9f7a5b3c1d9e7f5a',
        maxSeats: 5,
        plan: 'PRO',
        validUntil: '2029-01-01T00:00:00Z-TAMPERED',
      },
      'INVALID_SIGNATURE',
    );

    expect(result.status).toBe('INVALID');
    expect(result.isWriteLocked).toBe(true);
    expect(result.canExport).toBe(true);
  });

  it('locks writes on machine hardware mismatch', async () => {
    const result = await service.verifyOfflineLicense(
      {
        companyId: 'company-uuid-001',
        kid: 'exza-ed25519-v1',
        machineId: 'FOREIGN_MACHINE_ID_DIFFERENT_HARDWARE',
        maxSeats: 5,
        plan: 'PRO',
        validUntil: new Date(Date.now() + 86400000).toISOString(),
      },
      'VALID_SIGNATURE',
    );

    expect(result.status).toBe('INVALID');
    expect(result.isWriteLocked).toBe(true);
    expect(result.message).toContain('Hardware binding mismatch');
    expect(result.canExport).toBe(true);
  });

  it('generates machine-specific renewal request code', async () => {
    const code = await service.generateRenewalRequestCode('COMPANY-UUID-1234', 'ENTERPRISE');
    expect(code).toMatch(/^EXZA-REQ-[A-Z0-9]{8}-[A-Z0-9]{8}-ENTERPRISE-RNW01$/);
  });

  it('detects clock rollback tampering (> 1 hour backwards)', async () => {
    // Initial check advances high-water mark
    const initialCheck = await service.checkClockIntegrity();
    expect(initialCheck.isTampered).toBe(false);

    // Simulate clock high-water mark recorded 2 hours in the future
    const futureEpoch = Math.floor(Date.now() / 1000) + 7200;
    await storage.setItem('exza_desktop_clock_high_water_mark', futureEpoch.toString());

    // Current time is now < highWater - 3600 -> CLOCK_TAMPERED
    const tamperCheck = await service.checkClockIntegrity();
    expect(tamperCheck.isTampered).toBe(true);
    expect(tamperCheck.message).toContain('CLOCK_TAMPERED');
  });
});
