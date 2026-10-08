import { HttpStatus, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import { FieldCryptoService } from '../../../platform/security/field-crypto.service.js';
import type { CreateVendorDto, UpdateVendorDto, VendorQueryDto } from '../dto/index.js';

@Injectable()
export class VendorService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
    private readonly fieldCrypto: FieldCryptoService,
  ) {}

  private async generateVendorNumber(tx: TenantPrisma): Promise<string> {
    const fiscalYear = new Date().getFullYear().toString();
    const seq = await this.sequenceService.next(tx, {
      type: 'VENDOR',
      fiscalYear,
    });
    return this.sequenceService.format({
      prefix: 'VND',
      fiscalYear,
      value: seq,
      padding: 5,
    });
  }

  async createVendor(companyId: string, userId: string, dto: CreateVendorDto, tx?: TenantPrisma) {
    const runner = async (db: TenantPrisma) => {
      const vendorNumber = await this.generateVendorNumber(db);

      let encryptedBankNo: string | undefined;
      if (dto.bankAccountNumber) {
        encryptedBankNo = this.fieldCrypto.encrypt(dto.bankAccountNumber);
      }

      const vendor = await db.vendor.create({
        data: {
          companyId,
          vendorNumber,
          name: dto.name,
          contactPerson: dto.contactPerson,
          phone: dto.phone,
          email: dto.email,
          address: dto.address,
          tradeLicenseNo: dto.tradeLicenseNo,
          tin: dto.tin,
          bin: dto.bin,
          bankName: dto.bankName,
          bankBranch: dto.bankBranch,
          bankAccountNumber: encryptedBankNo,
          routingNumber: dto.routingNumber,
          isActive: dto.isActive ?? true,
        },
      });

      await this.auditService.record(db, {
        action: 'VENDOR_CREATED',
        module: 'procurement',
        recordType: 'Vendor',
        recordId: vendor.id,
        after: {
          vendorNumber: vendor.vendorNumber,
          name: vendor.name,
          createdById: userId,
        },
      });

      return this.transformVendor(vendor);
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async listVendors(companyId: string, query?: VendorQueryDto, tx?: TenantPrisma) {
    const runner = async (db: TenantPrisma) => {
      const where: import('@prisma/client').Prisma.VendorWhereInput = {
        companyId,
        deletedAt: null,
      };

      if (query?.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      if (query?.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { vendorNumber: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const vendors = await db.vendor.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return vendors.map((v) => this.transformVendor(v));
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async getVendorById(companyId: string, vendorId: string, tx?: TenantPrisma) {
    const runner = async (db: TenantPrisma) => {
      const vendor = await db.vendor.findFirst({
        where: { id: vendorId, companyId, deletedAt: null },
      });

      if (!vendor) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          `Vendor not found: ${vendorId}`,
          { vendorId },
          HttpStatus.NOT_FOUND,
        );
      }

      return this.transformVendor(vendor);
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async updateVendor(
    companyId: string,
    userId: string,
    vendorId: string,
    dto: UpdateVendorDto,
    tx?: TenantPrisma,
  ) {
    const runner = async (db: TenantPrisma) => {
      await this.getVendorById(companyId, vendorId, db);

      let encryptedBankNo: string | undefined;
      if (dto.bankAccountNumber) {
        encryptedBankNo = this.fieldCrypto.encrypt(dto.bankAccountNumber);
      }

      const updated = await db.vendor.update({
        where: { id: vendorId },
        data: {
          name: dto.name,
          contactPerson: dto.contactPerson,
          phone: dto.phone,
          email: dto.email,
          address: dto.address,
          tradeLicenseNo: dto.tradeLicenseNo,
          tin: dto.tin,
          bin: dto.bin,
          bankName: dto.bankName,
          bankBranch: dto.bankBranch,
          bankAccountNumber: encryptedBankNo,
          routingNumber: dto.routingNumber,
          isActive: dto.isActive,
        },
      });

      await this.auditService.record(db, {
        action: 'VENDOR_UPDATED',
        module: 'procurement',
        recordType: 'Vendor',
        recordId: vendorId,
        after: { name: updated.name, updatedById: userId },
      });

      return this.transformVendor(updated);
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  private transformVendor(vendor: import('@prisma/client').Vendor) {
    let decryptedBankNo = vendor.bankAccountNumber;
    if (vendor.bankAccountNumber && vendor.bankAccountNumber.startsWith('enc:v1:')) {
      try {
        decryptedBankNo = this.fieldCrypto.decrypt(vendor.bankAccountNumber);
      } catch {
        decryptedBankNo = '***ENCRYPTED***';
      }
    }

    return {
      ...vendor,
      bankAccountNumber: decryptedBankNo,
    };
  }
}
