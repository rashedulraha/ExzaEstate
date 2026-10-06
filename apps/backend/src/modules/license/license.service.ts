import { HttpStatus, Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException, NotFoundException } from '../../common/exceptions/app.exception.js';
import { SystemPrisma } from '../../database/system-prisma.service.js';
import {
  CreateLicenseDto,
  HardwareFingerprintDto,
  TransferLicenseDto,
  VerifyLicenseDto,
} from './dto/license.dto.js';
import { DEFAULT_KID, signLicensePayload, verifyLicenseSignature } from './ed25519.util.js';

export interface LicenseStatusResult {
  status: 'ACTIVE' | 'GRACE' | 'EXPIRED';
  plan: string;
  maxSeats: number;
  maxBranches: number;
  maxProjects: number;
  validUntil: string;
  graceDaysRemaining?: number;
}

@Injectable()
export class LicenseService {
  constructor(private readonly systemPrisma: SystemPrisma) {}

  async generateLicense(dto: CreateLicenseDto) {
    const rawKey = crypto.randomBytes(16).toString('hex').toUpperCase();
    const licenseKey = `EXZA-${dto.plan.toUpperCase()}-${rawKey.slice(0, 4)}-${rawKey.slice(4, 8)}-${rawKey.slice(8, 12)}`;

    const { signature, kid } = signLicensePayload({
      companyId: dto.companyId,
      kid: DEFAULT_KID,
      machineId: dto.machineId ?? null,
      maxSeats: dto.maxSeats,
      plan: dto.plan,
      validUntil: dto.validUntil,
    });

    const license = await this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Create and issue tenant license',
      async (client) => {
        return client.license.create({
          data: {
            companyId: dto.companyId,
            plan: dto.plan,
            licenseKey,
            signature,
            kid,
            machineId: dto.machineId ?? null,
            validUntil: new Date(dto.validUntil),
            maxSeats: dto.maxSeats,
            maxBranches: dto.maxBranches ?? 1,
            maxProjects: dto.maxProjects ?? 5,
            status: 'ACTIVE',
          },
        });
      },
    );

    return {
      id: license.id,
      companyId: license.companyId,
      licenseKey: license.licenseKey,
      signature: license.signature,
      kid: license.kid,
      plan: license.plan,
      validUntil: license.validUntil.toISOString(),
      maxSeats: license.maxSeats,
      maxBranches: license.maxBranches,
      maxProjects: license.maxProjects,
      machineId: license.machineId,
      status: license.status,
    };
  }

  async listAllLicenses() {
    return this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: List all issued licenses across platform',
      async (client) => {
        const licenses = await client.license.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        });

        const companyIds = [...new Set(licenses.map((l) => l.companyId))];
        const companies = await client.company.findMany({
          where: { id: { in: companyIds } },
          select: { id: true, name: true, code: true },
        });
        const companyMap = new Map(companies.map((c) => [c.id, c]));

        return licenses.map((l) => ({
          id: l.id,
          companyId: l.companyId,
          companyName: companyMap.get(l.companyId)?.name ?? 'Unknown Company',
          companyCode: companyMap.get(l.companyId)?.code ?? 'N/A',
          licenseKey: l.licenseKey,
          plan: l.plan,
          status: l.status,
          validFrom: l.validFrom.toISOString(),
          validUntil: l.validUntil.toISOString(),
          maxSeats: l.maxSeats,
          maxBranches: l.maxBranches,
          maxProjects: l.maxProjects,
          machineId: l.machineId,
          signature: l.signature,
          createdAt: l.createdAt.toISOString(),
        }));
      },
    );
  }

  async verifyLicense(dto: VerifyLicenseDto): Promise<LicenseStatusResult> {
    const license = await this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Verify license authenticity and validity',
      async (client) => {
        return client.license.findFirst({
          where: {
            companyId: dto.companyId,
            licenseKey: dto.licenseKey,
            deletedAt: null,
          },
        });
      },
    );

    if (!license) {
      throw new AppException(ERROR_CODES.LICENSE_INVALID, 'License not found');
    }

    const isValidSig = verifyLicenseSignature(
      {
        companyId: license.companyId,
        kid: license.kid,
        machineId: license.machineId,
        maxSeats: license.maxSeats,
        plan: license.plan,
        validUntil: license.validUntil.toISOString(),
      },
      dto.signature,
    );

    if (!isValidSig) {
      throw new AppException(ERROR_CODES.LICENSE_INVALID, 'License signature invalid or tampered');
    }

    if (license.machineId && dto.machineId && license.machineId !== dto.machineId) {
      throw new AppException(ERROR_CODES.LICENSE_INVALID, 'Hardware fingerprint mismatch');
    }

    return this.evaluateLicensePeriod(license);
  }

  async getLatestCompanyLicense(companyId: string) {
    return this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Lookup latest active license for company',
      async (client) => {
        return client.license.findFirst({
          where: { companyId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
        });
      },
    );
  }

  async requestLicenseTransfer(dto: TransferLicenseDto) {
    const license = await this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Query license for transfer evaluation',
      async (client) => {
        return client.license.findFirst({
          where: {
            companyId: dto.companyId,
            licenseKey: dto.licenseKey,
            deletedAt: null,
          },
        });
      },
    );

    if (!license) {
      throw new NotFoundException('License not found');
    }

    // Gate D-15: limit 2/yr, fingerprint >= 2 of 3 components
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const recentTransfersCount = await this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Check annual transfer count',
      async (client) => {
        return client.licenseTransfer.count({
          where: {
            companyId: dto.companyId,
            licenseId: license.id,
            createdAt: { gte: oneYearAgo },
          },
        });
      },
    );

    if (recentTransfersCount >= 2) {
      throw new AppException(
        ERROR_CODES.FORBIDDEN,
        'License transfer limit exceeded (maximum 2 transfers per year)',
        {},
        HttpStatus.FORBIDDEN,
      );
    }

    if (dto.previousHardware && dto.newHardware) {
      const matchScore = this.calculateHardwareMatch(dto.previousHardware, dto.newHardware);
      if (matchScore < 2) {
        throw new AppException(
          ERROR_CODES.LICENSE_INVALID,
          'Hardware fingerprint tolerance failure: fewer than 2 matching components',
          { matchScore },
          HttpStatus.FORBIDDEN,
        );
      }
    }

    const previousMachineId = license.machineId ?? 'UNKNOWN_PREVIOUS';
    const newMachineId = dto.newMachineId;

    const { signature } = signLicensePayload({
      companyId: license.companyId,
      kid: license.kid,
      machineId: newMachineId,
      maxSeats: license.maxSeats,
      plan: license.plan,
      validUntil: license.validUntil.toISOString(),
    });

    return this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Commit license transfer and resign',
      async (client) => {
        const updated = await client.license.update({
          where: { id: license.id },
          data: {
            machineId: newMachineId,
            signature,
          },
        });

        await client.licenseTransfer.create({
          data: {
            companyId: dto.companyId,
            licenseId: license.id,
            previousMachineId,
            newMachineId,
            status: 'COMPLETED',
            reason: dto.reason ?? 'Hardware migration',
          },
        });

        return updated;
      },
    );
  }

  private calculateHardwareMatch(
    prev: HardwareFingerprintDto,
    next: HardwareFingerprintDto,
  ): number {
    let score = 0;
    if (prev.motherboardSerial && prev.motherboardSerial === next.motherboardSerial) score++;
    if (prev.cpuId && prev.cpuId === next.cpuId) score++;
    if (prev.diskSerial && prev.diskSerial === next.diskSerial) score++;
    return score;
  }

  private evaluateLicensePeriod(license: {
    plan: string;
    maxSeats: number;
    maxBranches: number;
    maxProjects: number;
    validUntil: Date;
    graceDays: number;
  }): LicenseStatusResult {
    const now = Date.now();
    const expiryTime = license.validUntil.getTime();

    if (now <= expiryTime) {
      return {
        status: 'ACTIVE',
        plan: license.plan,
        maxSeats: license.maxSeats,
        maxBranches: license.maxBranches,
        maxProjects: license.maxProjects,
        validUntil: license.validUntil.toISOString(),
      };
    }

    const graceDays = license.graceDays ?? 15;
    const graceEndTime = expiryTime + graceDays * 24 * 60 * 60 * 1000;

    if (now <= graceEndTime) {
      const remainingMs = graceEndTime - now;
      const graceDaysRemaining = Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));

      return {
        status: 'GRACE',
        plan: license.plan,
        maxSeats: license.maxSeats,
        maxBranches: license.maxBranches,
        maxProjects: license.maxProjects,
        validUntil: license.validUntil.toISOString(),
        graceDaysRemaining,
      };
    }

    throw new AppException(
      ERROR_CODES.LICENSE_EXPIRED,
      'License has expired and past grace period',
      {},
      HttpStatus.FORBIDDEN,
    );
  }
}
