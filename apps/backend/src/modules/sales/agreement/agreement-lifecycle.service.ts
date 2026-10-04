import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BOOKING_STATUSES, DOMAIN_EVENTS, ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { OutboxService } from '../../../platform/outbox/outbox.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import {
  assertCanGenerateAgreement,
  renderAgreementContent,
  resolveAgreementTemplateBody,
} from './agreement.helper.js';
import { mapAgreementToDto } from './agreement.mapper.js';
import type {
  AgreementResponseDto,
  GenerateAgreementDto,
  SignAndLockAgreementDto,
  VersionAgreementDto,
} from './dto/index.js';

@Injectable()
export class AgreementLifecycleService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
  ) {}

  async generateAgreement(
    companyId: string,
    userId: string,
    dto: GenerateAgreementDto,
  ): Promise<AgreementResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: dto.bookingId, companyId, deletedAt: null },
      });
      if (!booking) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Booking "${dto.bookingId}" not found`,
        });
      }

      assertCanGenerateAgreement(booking.status);

      const [customer, property] = await Promise.all([
        tx.customer.findFirstOrThrow({ where: { id: booking.customerId, companyId } }),
        tx.property.findFirstOrThrow({ where: { id: booking.propertyId, companyId } }),
      ]);

      const project = await tx.project.findFirst({
        where: { id: property.projectId, companyId },
      });

      const fiscalYear = new Date().getFullYear().toString();
      const seqVal = await this.sequenceService.next(tx, { type: 'AGREEMENT', fiscalYear });
      const agreementNumber = this.sequenceService.format({
        prefix: 'AGR',
        fiscalYear,
        value: seqVal,
        padding: 5,
      });

      const { templateBody, templateId } = await resolveAgreementTemplateBody(
        tx,
        companyId,
        dto.templateId,
      );

      const content =
        dto.customContent ??
        renderAgreementContent(templateBody, {
          agreementNumber,
          bookingNumber: booking.bookingNumber,
          customerName: customer.name,
          customerPhone: customer.phone,
          propertyCode: property.code,
          propertyTitle: property.title ?? 'Property',
          projectName: project?.name ?? 'Main Project',
          netPricePaisa: booking.netPricePaisa,
          bookingDate: booking.bookingDate,
          terms: dto.terms ?? booking.terms,
        });

      const agreement = await tx.agreement.create({
        data: {
          companyId,
          agreementNumber,
          bookingId: booking.id,
          templateId,
          version: 1,
          status: 'Generated',
          title: dto.title ?? 'Agreement for Allotment & Sale',
          content,
          terms: dto.terms ?? booking.terms,
          createdById: userId,
          updatedById: userId,
        },
      });

      if (booking.status === BOOKING_STATUSES.CONFIRMED) {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: BOOKING_STATUSES.AGREEMENT_PENDING },
        });

        await tx.bookingStatusHistory.create({
          data: {
            companyId,
            bookingId: booking.id,
            fromStatus: BOOKING_STATUSES.CONFIRMED,
            toStatus: BOOKING_STATUSES.AGREEMENT_PENDING,
            reason: `Agreement ${agreementNumber} generated`,
            changedById: userId,
          },
        });
      }

      await this.auditService.record(tx, {
        action: 'AGREEMENT_GENERATED',
        module: 'sales',
        recordType: 'Agreement',
        recordId: agreement.id,
        after: {
          agreementNumber,
          bookingNumber: booking.bookingNumber,
          status: agreement.status,
          version: agreement.version,
        },
      });

      await this.outboxService.emit(tx, DOMAIN_EVENTS.BOOKING_AGREEMENT_GENERATED, {
        agreementId: agreement.id,
        agreementNumber,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
      });

      return mapAgreementToDto(agreement);
    });
  }

  async signAndLockAgreement(
    companyId: string,
    userId: string,
    id: string,
    dto: SignAndLockAgreementDto,
  ): Promise<AgreementResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const agreement = await tx.agreement.findFirst({
        where: { id, companyId, deletedAt: null },
        include: { booking: true },
      });
      if (!agreement) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Agreement "${id}" not found`,
        });
      }

      if (agreement.status === 'Signed & Locked' || agreement.status === 'Superseded') {
        throw new ConflictException({
          code: ERROR_CODES.INVALID_STATE_TRANSITION,
          message: `Agreement is already in "${agreement.status}" state`,
        });
      }

      const signedAt = new Date();
      const updatedAgreement = await tx.agreement.update({
        where: { id },
        data: {
          status: 'Signed & Locked',
          signedAt,
          signedById: userId,
          documentId: dto.documentId ?? agreement.documentId,
          notes: dto.notes ?? agreement.notes,
          updatedById: userId,
        },
      });

      if (agreement.booking.status === BOOKING_STATUSES.AGREEMENT_PENDING) {
        await tx.booking.update({
          where: { id: agreement.bookingId },
          data: { status: BOOKING_STATUSES.AGREEMENT_COMPLETED },
        });

        await tx.bookingStatusHistory.create({
          data: {
            companyId,
            bookingId: agreement.bookingId,
            fromStatus: BOOKING_STATUSES.AGREEMENT_PENDING,
            toStatus: BOOKING_STATUSES.AGREEMENT_COMPLETED,
            reason: `Agreement ${agreement.agreementNumber} signed & locked`,
            changedById: userId,
          },
        });
      }

      await this.auditService.record(tx, {
        action: 'AGREEMENT_SIGNED_AND_LOCKED',
        module: 'sales',
        recordType: 'Agreement',
        recordId: id,
        after: {
          agreementNumber: agreement.agreementNumber,
          signedAt: signedAt.toISOString(),
          status: 'Signed & Locked',
        },
      });

      await this.outboxService.emit(tx, DOMAIN_EVENTS.BOOKING_AGREEMENT_SIGNED, {
        agreementId: agreement.id,
        agreementNumber: agreement.agreementNumber,
        bookingId: agreement.bookingId,
        signedAt: signedAt.toISOString(),
      });

      return mapAgreementToDto(updatedAgreement);
    });
  }

  async createVersion(
    companyId: string,
    userId: string,
    id: string,
    dto: VersionAgreementDto,
  ): Promise<AgreementResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const current = await tx.agreement.findFirst({
        where: { id, companyId, deletedAt: null },
        include: { booking: true },
      });
      if (!current) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Agreement "${id}" not found`,
        });
      }

      if (current.status !== 'Signed & Locked') {
        throw new ConflictException({
          code: ERROR_CODES.INVALID_STATE_TRANSITION,
          message: 'Only signed and locked agreements can be superseded by a new version',
        });
      }

      const nextVersion = current.version + 1;
      const newAgreement = await tx.agreement.create({
        data: {
          companyId,
          agreementNumber: current.agreementNumber,
          bookingId: current.bookingId,
          templateId: current.templateId,
          version: nextVersion,
          status: 'Generated',
          title: dto.title ?? current.title,
          content: dto.content ?? current.content,
          terms: dto.terms ?? current.terms,
          notes: dto.notes ?? dto.reason,
          createdById: userId,
          updatedById: userId,
        },
      });

      await tx.agreement.update({
        where: { id: current.id },
        data: {
          status: 'Superseded',
          supersededById: newAgreement.id,
          updatedById: userId,
        },
      });

      if (current.booking.status === BOOKING_STATUSES.AGREEMENT_COMPLETED) {
        await tx.booking.update({
          where: { id: current.bookingId },
          data: { status: BOOKING_STATUSES.AGREEMENT_PENDING },
        });

        await tx.bookingStatusHistory.create({
          data: {
            companyId,
            bookingId: current.bookingId,
            fromStatus: BOOKING_STATUSES.AGREEMENT_COMPLETED,
            toStatus: BOOKING_STATUSES.AGREEMENT_PENDING,
            reason: `Agreement version ${nextVersion} created: ${dto.reason}`,
            changedById: userId,
          },
        });
      }

      await this.auditService.record(tx, {
        action: 'AGREEMENT_VERSION_CREATED',
        module: 'sales',
        recordType: 'Agreement',
        recordId: newAgreement.id,
        after: {
          agreementNumber: current.agreementNumber,
          previousVersion: current.version,
          newVersion: nextVersion,
          reason: dto.reason,
        },
      });

      return mapAgreementToDto(newAgreement);
    });
  }
}
