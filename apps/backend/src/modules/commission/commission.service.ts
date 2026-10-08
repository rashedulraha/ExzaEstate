import { HttpStatus, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../common/exceptions/app.exception.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { SequenceService } from '../../platform/sequence/sequence.service.js';
import { FieldCryptoService } from '../../platform/security/field-crypto.service.js';
import { PostingService } from '../accounting/posting/posting.service.js';
import { COMMISSION_STATUS, COMMISSION_TRIGGER_EVENT } from './domain/commission.constants.js';
import { calculateCommissionAmount } from './domain/commission-calc.engine.js';
import { generateBrokerNumber, generateCommissionNumber } from './commission.helper.js';
import type { CreateBrokerDto, CreateCommissionRuleDto, PayCommissionDto } from './dto/index.js';

@Injectable()
export class CommissionService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
    private readonly fieldCrypto: FieldCryptoService,
    private readonly postingService: PostingService,
  ) {}

  async createBroker(companyId: string, userId: string, dto: CreateBrokerDto, tx?: TenantPrisma) {
    const runner = async (db: TenantPrisma) => {
      const brokerNumber = await generateBrokerNumber(db, this.sequenceService);

      let encryptedBankNo: string | undefined;
      if (dto.bankAccountNumber) {
        encryptedBankNo = this.fieldCrypto.encrypt(dto.bankAccountNumber);
      }

      const broker = await db.broker.create({
        data: {
          companyId,
          brokerNumber,
          name: dto.name,
          phone: dto.phone,
          email: dto.email,
          nid: dto.nid,
          tin: dto.tin,
          bankName: dto.bankName,
          bankBranch: dto.bankBranch,
          bankAccountNumber: encryptedBankNo,
          routingNumber: dto.routingNumber,
          isActive: dto.isActive ?? true,
        },
      });

      await this.auditService.record(db, {
        action: 'BROKER_CREATED',
        module: 'commission',
        recordType: 'Broker',
        recordId: broker.id,
        after: {
          brokerNumber: broker.brokerNumber,
          name: broker.name,
          createdById: userId,
        },
      });

      return broker;
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async createRule(
    companyId: string,
    userId: string,
    dto: CreateCommissionRuleDto,
    tx?: TenantPrisma,
  ) {
    const runner = async (db: TenantPrisma) => {
      const rule = await db.commissionRule.create({
        data: {
          companyId,
          name: dto.name,
          projectId: dto.projectId,
          calculationType: dto.calculationType ?? 'PERCENT_NET_PRICE',
          percentage: dto.percentage,
          fixedAmountPaisa: dto.fixedAmountPaisa ? BigInt(dto.fixedAmountPaisa) : null,
          triggerEvent: dto.triggerEvent ?? COMMISSION_TRIGGER_EVENT.ON_CONFIRMED,
          isActive: dto.isActive ?? true,
        },
      });

      await this.auditService.record(db, {
        action: 'COMMISSION_RULE_CREATED',
        module: 'commission',
        recordType: 'CommissionRule',
        recordId: rule.id,
        after: { name: rule.name, createdById: userId },
      });

      return rule;
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async accrueCommissionOnConfirmation(
    companyId: string,
    userId: string,
    bookingId: string,
    tx?: TenantPrisma,
  ) {
    const runner = async (db: TenantPrisma) => {
      const booking = await db.booking.findFirst({
        where: { id: bookingId, companyId, deletedAt: null },
      });

      if (!booking || !booking.brokerId) {
        return null;
      }

      const broker = await db.broker.findFirst({
        where: { id: booking.brokerId, companyId, deletedAt: null },
      });

      if (!broker || !broker.isActive) {
        return null;
      }

      // Find rule
      const rule = await db.commissionRule.findFirst({
        where: {
          companyId,
          isActive: true,
          deletedAt: null,
          triggerEvent: COMMISSION_TRIGGER_EVENT.ON_CONFIRMED,
        },
        orderBy: { createdAt: 'desc' },
      });

      const amountPaisa = rule
        ? calculateCommissionAmount({
            calculationType: rule.calculationType,
            percentage: rule.percentage ? Number(rule.percentage) : null,
            fixedAmountPaisa: rule.fixedAmountPaisa,
            netPricePaisa: booking.netPricePaisa,
            totalPaidPaisa: booking.totalPaidPaisa,
          })
        : (booking.netPricePaisa * 200n) / 10000n; // Default 2%

      if (amountPaisa <= 0n) return null;

      const commissionNumber = await generateCommissionNumber(db, this.sequenceService);

      const record = await db.commissionRecord.create({
        data: {
          companyId,
          commissionNumber,
          brokerId: broker.id,
          bookingId: booking.id,
          ruleId: rule?.id,
          amountPaisa,
          status: COMMISSION_STATUS.EARNED, // Strictly NO journal on Earned
        },
      });

      await db.broker.update({
        where: { id: broker.id },
        data: { totalEarnedPaisa: { increment: amountPaisa } },
      });

      await this.auditService.record(db, {
        action: 'COMMISSION_EARNED',
        module: 'commission',
        recordType: 'CommissionRecord',
        recordId: record.id,
        after: {
          commissionNumber,
          amountPaisa: amountPaisa.toString(),
          status: record.status,
          accruedById: userId,
        },
      });

      return record;
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async approveCommission(
    companyId: string,
    userId: string,
    commissionId: string,
    tx?: TenantPrisma,
  ) {
    const runner = async (db: TenantPrisma) => {
      const record = await db.commissionRecord.findFirst({
        where: { id: commissionId, companyId, deletedAt: null },
      });

      if (!record) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          `Commission record not found: ${commissionId}`,
          { commissionId },
          HttpStatus.NOT_FOUND,
        );
      }

      if (record.status !== COMMISSION_STATUS.EARNED) {
        throw new AppException(
          ERROR_CODES.INVALID_STATE_TRANSITION,
          `Only EARNED commissions can be approved (current: ${record.status})`,
          { currentStatus: record.status },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Post COMMISSION_APPROVED: Dr 5400 Commission Expense / Cr 2300 Commission Payable
      const postingPayload = {
        brokerId: record.brokerId,
        amountPaisa: record.amountPaisa.toString(),
        projectId: record.projectId ?? undefined,
        reference: record.commissionNumber,
        postingDate: new Date().toISOString(),
      };

      const journals = await this.postingService.post(
        companyId,
        userId,
        'COMMISSION_APPROVED',
        postingPayload,
        db,
      );

      const approvalJournalId = journals[0]?.id ?? null;

      const updated = await db.commissionRecord.update({
        where: { id: commissionId },
        data: {
          status: COMMISSION_STATUS.APPROVED,
          approvalJournalId,
          approvedAt: new Date(),
        },
      });

      await this.auditService.record(db, {
        action: 'COMMISSION_APPROVED',
        module: 'commission',
        recordType: 'CommissionRecord',
        recordId: commissionId,
        after: {
          status: updated.status,
          approvalJournalId,
          approvedById: userId,
        },
      });

      return updated;
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async payCommission(
    companyId: string,
    userId: string,
    commissionId: string,
    dto?: PayCommissionDto,
    tx?: TenantPrisma,
  ) {
    const runner = async (db: TenantPrisma) => {
      const record = await db.commissionRecord.findFirst({
        where: { id: commissionId, companyId, deletedAt: null },
      });

      if (!record) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          `Commission record not found: ${commissionId}`,
          { commissionId },
          HttpStatus.NOT_FOUND,
        );
      }

      if (record.status !== COMMISSION_STATUS.APPROVED) {
        throw new AppException(
          ERROR_CODES.INVALID_STATE_TRANSITION,
          `Only APPROVED commissions can be paid (current: ${record.status})`,
          { currentStatus: record.status },
          HttpStatus.BAD_REQUEST,
        );
      }

      const paymentMethod = dto?.paymentMethod ?? 'BANK_TRANSFER';
      const bankAccountCode = dto?.bankAccountCode ?? (paymentMethod === 'CASH' ? '1010' : '1020');

      // Post COMMISSION_PAID: Dr 2300 Commission Payable / Cr cash-bank
      const postingPayload = {
        brokerId: record.brokerId,
        amountPaisa: record.amountPaisa.toString(),
        paymentMethod,
        bankAccountCode,
        reference: dto?.reference ?? record.commissionNumber,
        postingDate: new Date().toISOString(),
      };

      const journals = await this.postingService.post(
        companyId,
        userId,
        'COMMISSION_PAID',
        postingPayload,
        db,
      );

      const paymentJournalId = journals[0]?.id ?? null;

      const updated = await db.commissionRecord.update({
        where: { id: commissionId },
        data: {
          status: COMMISSION_STATUS.PAID,
          paymentMethod,
          bankAccountCode,
          reference: dto?.reference,
          paymentJournalId,
          paidAt: new Date(),
        },
      });

      await db.broker.update({
        where: { id: record.brokerId },
        data: { totalPaidPaisa: { increment: record.amountPaisa } },
      });

      await this.auditService.record(db, {
        action: 'COMMISSION_PAID',
        module: 'commission',
        recordType: 'CommissionRecord',
        recordId: commissionId,
        after: {
          status: updated.status,
          paymentJournalId,
          paidById: userId,
        },
      });

      return updated;
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async clawbackCommissionOnCancellation(
    companyId: string,
    userId: string,
    bookingId: string,
    tx?: TenantPrisma,
  ) {
    const runner = async (db: TenantPrisma) => {
      const records = await db.commissionRecord.findMany({
        where: {
          companyId,
          bookingId,
          status: { not: COMMISSION_STATUS.REVERSED },
          deletedAt: null,
        },
      });

      for (const record of records) {
        if (record.status === COMMISSION_STATUS.EARNED) {
          // Unpaid, never journaled: simply reverse without double posting
          await db.commissionRecord.update({
            where: { id: record.id },
            data: { status: COMMISSION_STATUS.REVERSED, reversedAt: new Date() },
          });

          await db.broker.update({
            where: { id: record.brokerId },
            data: { totalEarnedPaisa: { decrement: record.amountPaisa } },
          });
        } else if (record.status === COMMISSION_STATUS.APPROVED) {
          // Approved but not paid: mark reversed, reverse accrued payable
          await db.commissionRecord.update({
            where: { id: record.id },
            data: { status: COMMISSION_STATUS.REVERSED, reversedAt: new Date() },
          });

          await db.broker.update({
            where: { id: record.brokerId },
            data: { totalEarnedPaisa: { decrement: record.amountPaisa } },
          });
        } else if (record.status === COMMISSION_STATUS.PAID) {
          // Paid: creates broker receivable for clawback recovery
          await db.commissionRecord.update({
            where: { id: record.id },
            data: {
              status: COMMISSION_STATUS.REVERSED,
              reversedAt: new Date(),
              clawbackReceivableCreated: true,
            },
          });

          await db.broker.update({
            where: { id: record.brokerId },
            data: {
              totalEarnedPaisa: { decrement: record.amountPaisa },
              receivablePaisa: { increment: record.amountPaisa },
            },
          });
        }

        await this.auditService.record(db, {
          action: 'COMMISSION_CLAWBACK',
          module: 'commission',
          recordType: 'CommissionRecord',
          recordId: record.id,
          after: {
            status: COMMISSION_STATUS.REVERSED,
            clawbackInitiatedById: userId,
          },
        });
      }

      return records;
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }
}
