import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import {
  BankReconciliationResponseDto,
  CreateBankReconciliationDto,
  MatchReconciliationItemsRequestDto,
  UnreconciledLineDto,
} from './dto/bank-reconciliation.dto.js';
import { computeBalancePaisa } from './cashbank.helper.js';
import { mapBankReconciliationToDto } from './bank-reconciliation.mapper.js';

@Injectable()
export class BankReconciliationService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
  ) {}

  async create(
    companyId: string,
    _userId: string,
    dto: CreateBankReconciliationDto,
  ): Promise<BankReconciliationResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const bankAccount = await tx.bankAccount.findFirst({
        where: { companyId, id: dto.bankAccountId },
      });
      if (!bankAccount) {
        throw new NotFoundException(`Bank account "${dto.bankAccountId}" not found`);
      }

      const statementDateObj = new Date(dto.statementDate);
      statementDateObj.setUTCHours(23, 59, 59, 999);

      const lines = await tx.journalLine.findMany({
        where: {
          companyId,
          accountId: bankAccount.coaAccountId,
          journal: {
            status: 'Posted',
            postingDate: { lte: statementDateObj },
          },
        },
        select: { debitPaisa: true, creditPaisa: true },
      });

      const bookBalance = computeBalancePaisa(lines, bankAccount.initialBalancePaisa);
      const statementBalance = BigInt(dto.statementBalancePaisa);
      const difference = statementBalance - bookBalance;

      const created = await tx.bankReconciliation.create({
        data: {
          companyId,
          bankAccountId: bankAccount.id,
          statementDate: new Date(dto.statementDate),
          statementBalancePaisa: statementBalance,
          bookBalancePaisa: bookBalance,
          reconciledBalancePaisa: bookBalance,
          differencePaisa: difference,
          status: 'Draft',
          notes: dto.notes,
        },
      });

      await this.auditService.record(tx, {
        action: 'BANK_RECONCILIATION_CREATED',
        module: 'accounting',
        recordType: 'BankReconciliation',
        recordId: created.id,
        after: {
          bankAccountId: bankAccount.id,
          statementDate: dto.statementDate,
          statementBalance: statementBalance.toString(),
          bookBalance: bookBalance.toString(),
        },
      });

      return mapBankReconciliationToDto(created);
    });
  }

  async getUnreconciledLines(
    companyId: string,
    reconciliationId: string,
  ): Promise<UnreconciledLineDto[]> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const recon = await tx.bankReconciliation.findFirst({
        where: { companyId, id: reconciliationId },
        include: { bankAccount: true },
      });
      if (!recon) {
        throw new NotFoundException(`Reconciliation "${reconciliationId}" not found`);
      }

      const statementDateObj = new Date(recon.statementDate);
      statementDateObj.setUTCHours(23, 59, 59, 999);

      const alreadyReconciledLineIds = (
        await tx.bankReconciliationItem.findMany({
          where: {
            companyId,
            isCleared: true,
            reconciliation: { status: 'Completed' },
          },
          select: { journalLineId: true },
        })
      ).map((i) => i.journalLineId);

      const lines = await tx.journalLine.findMany({
        where: {
          companyId,
          accountId: recon.bankAccount.coaAccountId,
          journal: {
            status: 'Posted',
            postingDate: { lte: statementDateObj },
          },
          id: { notIn: alreadyReconciledLineIds.length > 0 ? alreadyReconciledLineIds : undefined },
        },
        include: {
          journal: {
            select: { id: true, journalNumber: true, postingDate: true, narration: true },
          },
        },
        orderBy: { journal: { postingDate: 'asc' } },
      });

      return lines.map((l) => ({
        journalLineId: l.id,
        journalId: l.journal.id,
        journalNumber: l.journal.journalNumber,
        postingDate: l.journal.postingDate.toISOString().split('T')[0] ?? '',
        narration: l.journal.narration,
        description: l.description,
        debitPaisa: l.debitPaisa.toString(),
        creditPaisa: l.creditPaisa.toString(),
      }));
    });
  }

  async matchItems(
    companyId: string,
    _userId: string,
    reconciliationId: string,
    dto: MatchReconciliationItemsRequestDto,
  ): Promise<BankReconciliationResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const recon = await tx.bankReconciliation.findFirst({
        where: { companyId, id: reconciliationId },
        include: { bankAccount: true },
      });
      if (!recon) {
        throw new NotFoundException(`Reconciliation "${reconciliationId}" not found`);
      }
      if (recon.status === 'Completed') {
        throw new ConflictException('Completed reconciliations cannot be modified');
      }

      for (const item of dto.items) {
        await tx.bankReconciliationItem.upsert({
          where: {
            companyId_journalLineId: { companyId, journalLineId: item.journalLineId },
          },
          update: {
            reconciliationId: recon.id,
            clearedDate: new Date(item.clearedDate),
            isCleared: item.isCleared ?? true,
            notes: item.notes,
          },
          create: {
            companyId,
            reconciliationId: recon.id,
            journalLineId: item.journalLineId,
            clearedDate: new Date(item.clearedDate),
            isCleared: item.isCleared ?? true,
            notes: item.notes,
          },
        });
      }

      const allItems = await tx.bankReconciliationItem.findMany({
        where: { companyId, reconciliationId: recon.id, isCleared: true },
        include: {
          journalLine: {
            select: { debitPaisa: true, creditPaisa: true },
          },
        },
      });

      let clearedTotal = recon.bankAccount.initialBalancePaisa;
      for (const i of allItems) {
        if (i.journalLine) {
          clearedTotal += i.journalLine.debitPaisa - i.journalLine.creditPaisa;
        }
      }

      const reconciledBalance = clearedTotal;
      const difference = recon.statementBalancePaisa - reconciledBalance;

      const updated = await tx.bankReconciliation.update({
        where: { id: recon.id },
        data: {
          reconciledBalancePaisa: reconciledBalance,
          differencePaisa: difference,
        },
        include: {
          items: {
            include: {
              journalLine: {
                include: {
                  journal: { select: { journalNumber: true, postingDate: true } },
                },
              },
            },
          },
        },
      });

      return mapBankReconciliationToDto(updated);
    });
  }

  async complete(
    companyId: string,
    userId: string,
    reconciliationId: string,
  ): Promise<BankReconciliationResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const recon = await tx.bankReconciliation.findFirst({
        where: { companyId, id: reconciliationId },
        include: { items: true },
      });
      if (!recon) {
        throw new NotFoundException(`Reconciliation "${reconciliationId}" not found`);
      }
      if (recon.status === 'Completed') {
        throw new ConflictException('Reconciliation is already completed');
      }
      if (recon.differencePaisa !== 0n) {
        throw new BadRequestException(
          `Reconciliation has an unresolved difference of ৳${(Number(recon.differencePaisa) / 100).toFixed(2)}. Difference must be zero to complete.`,
        );
      }

      const completed = await tx.bankReconciliation.update({
        where: { id: recon.id },
        data: {
          status: 'Completed',
          completedAt: new Date(),
          completedById: userId,
        },
        include: {
          items: {
            include: {
              journalLine: {
                include: {
                  journal: { select: { journalNumber: true, postingDate: true } },
                },
              },
            },
          },
        },
      });

      await this.auditService.record(tx, {
        action: 'BANK_RECONCILIATION_COMPLETED',
        module: 'accounting',
        recordType: 'BankReconciliation',
        recordId: completed.id,
        after: {
          statementDate: completed.statementDate,
          reconciledBalance: completed.reconciledBalancePaisa.toString(),
          itemsCount: completed.items.length,
        },
      });

      return mapBankReconciliationToDto(completed);
    });
  }

  async findAll(
    companyId: string,
    bankAccountId?: string,
  ): Promise<BankReconciliationResponseDto[]> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const records = await tx.bankReconciliation.findMany({
        where: { companyId, bankAccountId },
        orderBy: { statementDate: 'desc' },
      });
      return records.map((r) => mapBankReconciliationToDto(r));
    });
  }

  async findById(companyId: string, id: string): Promise<BankReconciliationResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const record = await tx.bankReconciliation.findFirst({
        where: { companyId, id },
        include: {
          items: {
            include: {
              journalLine: {
                include: {
                  journal: { select: { journalNumber: true, postingDate: true } },
                },
              },
            },
          },
        },
      });
      if (!record) {
        throw new NotFoundException(`Reconciliation "${id}" not found`);
      }
      return mapBankReconciliationToDto(record);
    });
  }
}
