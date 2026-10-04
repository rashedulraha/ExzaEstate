import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import type { QuotationResponseDto, UpdateQuotationDto } from '../dto/index.js';
import { mapQuotationToDto } from './quotation.mapper.js';

@Injectable()
export class QuotationLifecycleService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
  ) {}

  async updateQuotation(
    companyId: string,
    id: string,
    dto: UpdateQuotationDto,
    userId?: string,
  ): Promise<QuotationResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.quotation.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Quotation "${id}" not found`,
        });
      }

      if (existing.status !== 'Draft' && existing.status !== 'Pending Approval') {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: `Cannot edit quotation in "${existing.status}" status. Only Draft quotations may be updated.`,
        });
      }

      const data: Record<string, unknown> = {
        updatedById: userId || null,
      };

      if (dto.validUntil) data.validUntil = new Date(dto.validUntil);
      if (dto.notes !== undefined) data.notes = dto.notes ? dto.notes.trim() : null;
      if (dto.terms !== undefined) data.terms = dto.terms ? dto.terms.trim() : null;

      const updated = await tx.quotation.update({
        where: { id },
        data,
      });

      await this.auditService.record(tx, {
        action: 'QUOTATION_UPDATED',
        module: 'sales',
        recordType: 'Quotation',
        recordId: id,
        before: { notes: existing.notes },
        after: { notes: updated.notes },
      });

      return mapQuotationToDto(updated);
    });
  }

  async sendQuotation(
    companyId: string,
    id: string,
    userId?: string,
  ): Promise<QuotationResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.quotation.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Quotation "${id}" not found`,
        });
      }

      if (new Date(existing.validUntil).getTime() < Date.now()) {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Quotation has expired and cannot be sent',
        });
      }

      if (existing.status === 'Converted' || existing.status === 'Rejected') {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: `Cannot send quotation in "${existing.status}" status`,
        });
      }

      const updated = await tx.quotation.update({
        where: { id },
        data: {
          status: 'Sent',
          updatedById: userId || null,
        },
      });

      await this.auditService.record(tx, {
        action: 'QUOTATION_SENT',
        module: 'sales',
        recordType: 'Quotation',
        recordId: id,
        after: { status: 'Sent' },
      });

      return mapQuotationToDto(updated);
    });
  }

  async approveQuotation(
    companyId: string,
    id: string,
    userId: string,
  ): Promise<QuotationResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.quotation.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Quotation "${id}" not found`,
        });
      }

      if (new Date(existing.validUntil).getTime() < Date.now()) {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Quotation has expired and cannot be approved',
        });
      }

      const updated = await tx.quotation.update({
        where: { id },
        data: {
          status: 'Approved',
          approvalStatus: 'APPROVED',
          approvedById: userId,
          approvedAt: new Date(),
          updatedById: userId,
        },
      });

      await this.auditService.record(tx, {
        action: 'QUOTATION_APPROVED',
        module: 'sales',
        recordType: 'Quotation',
        recordId: id,
        after: { status: 'Approved', approvedById: userId },
      });

      return mapQuotationToDto(updated);
    });
  }

  async rejectQuotation(
    companyId: string,
    id: string,
    reason: string,
    userId: string,
  ): Promise<QuotationResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.quotation.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Quotation "${id}" not found`,
        });
      }

      const updated = await tx.quotation.update({
        where: { id },
        data: {
          status: 'Rejected',
          approvalStatus: 'REJECTED',
          rejectionReason: reason.trim(),
          updatedById: userId,
        },
      });

      await this.auditService.record(tx, {
        action: 'QUOTATION_REJECTED',
        module: 'sales',
        recordType: 'Quotation',
        recordId: id,
        after: { status: 'Rejected', rejectionReason: reason },
      });

      return mapQuotationToDto(updated);
    });
  }

  async expireOverdueQuotations(companyId: string): Promise<{ expiredCount: number }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const result = await tx.quotation.updateMany({
        where: {
          companyId,
          deletedAt: null,
          status: { in: ['Draft', 'Pending Approval', 'Approved', 'Sent'] },
          validUntil: { lt: new Date() },
        },
        data: { status: 'Expired' },
      });
      return { expiredCount: result.count };
    });
  }

  async deleteQuotation(
    companyId: string,
    id: string,
    userId?: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.quotation.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Quotation "${id}" not found`,
        });
      }

      await tx.quotation.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedById: userId || null,
        },
      });

      await this.auditService.record(tx, {
        action: 'QUOTATION_DELETED',
        module: 'sales',
        recordType: 'Quotation',
        recordId: id,
        before: { quotationNumber: existing.quotationNumber, status: existing.status },
      });

      return { success: true, id };
    });
  }
}
