import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { PostingService } from '../posting/posting.service.js';
import { CashTransferResponseDto, CreateCashTransferDto } from './dto/cash-transfer.dto.js';

interface RawTransfer {
  id: string;
  companyId: string;
  transferNumber: string;
  sourceBankAccountId: string;
  destinationBankAccountId: string;
  amountPaisa: bigint;
  transferDate: Date;
  referenceNumber: string | null;
  narration: string | null;
  journalId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CashTransferService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly postingService: PostingService,
    private readonly auditService: AuditService,
  ) {}

  async transfer(
    companyId: string,
    userId: string,
    dto: CreateCashTransferDto,
  ): Promise<CashTransferResponseDto> {
    if (dto.sourceBankAccountId === dto.destinationBankAccountId) {
      throw new BadRequestException('Source and destination accounts must be different');
    }

    const amount = BigInt(dto.amountPaisa);
    if (amount <= 0n) {
      throw new BadRequestException('Transfer amount must be greater than zero');
    }

    return this.tenantDb.withCompany(companyId, async (tx) => {
      const source = await tx.bankAccount.findFirst({
        where: { companyId, id: dto.sourceBankAccountId },
      });
      if (!source) {
        throw new NotFoundException(`Source bank account "${dto.sourceBankAccountId}" not found`);
      }
      if (!source.isActive) {
        throw new BadRequestException(`Source account "${source.name}" is deactivated`);
      }

      const destination = await tx.bankAccount.findFirst({
        where: { companyId, id: dto.destinationBankAccountId },
      });
      if (!destination) {
        throw new NotFoundException(
          `Destination bank account "${dto.destinationBankAccountId}" not found`,
        );
      }
      if (!destination.isActive) {
        throw new BadRequestException(`Destination account "${destination.name}" is deactivated`);
      }

      const [journal] = await this.postingService.post(
        companyId,
        userId,
        'CASH_TRANSFER',
        {
          sourceAccountCode: source.coaAccountCode,
          destinationAccountCode: destination.coaAccountCode,
          amountPaisa: amount,
          postingDate: dto.transferDate,
          reference: dto.referenceNumber,
          narration:
            dto.narration ??
            `Transfer from ${source.name} (${source.coaAccountCode}) to ${destination.name} (${destination.coaAccountCode})`,
        },
        tx,
      );

      if (!journal) {
        throw new BadRequestException('Failed to generate cash transfer journal');
      }

      const count = await tx.cashTransfer.count({ where: { companyId } });
      const seq = (count + 1).toString().padStart(4, '0');
      const year = new Date(dto.transferDate).getFullYear();
      const transferNumber = `TRF-${year}-${seq}`;

      const transfer = await tx.cashTransfer.create({
        data: {
          companyId,
          transferNumber,
          sourceBankAccountId: source.id,
          destinationBankAccountId: destination.id,
          amountPaisa: amount,
          transferDate: new Date(dto.transferDate),
          referenceNumber: dto.referenceNumber,
          narration: dto.narration,
          journalId: journal.id,
          createdById: userId,
        },
      });

      await this.auditService.record(tx, {
        action: 'CASH_TRANSFER_POSTED',
        module: 'accounting',
        recordType: 'CashTransfer',
        recordId: transfer.id,
        after: {
          transferNumber,
          amountPaisa: amount.toString(),
          source: source.coaAccountCode,
          destination: destination.coaAccountCode,
          journalId: journal.id,
        },
      });

      return this.mapToDto(transfer);
    });
  }

  async findAll(companyId: string): Promise<CashTransferResponseDto[]> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const records = await tx.cashTransfer.findMany({
        where: { companyId },
        orderBy: { transferDate: 'desc' },
      });
      return records.map((r) => this.mapToDto(r));
    });
  }

  async findById(companyId: string, id: string): Promise<CashTransferResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const record = await tx.cashTransfer.findFirst({
        where: { companyId, id },
      });
      if (!record) {
        throw new NotFoundException(`Cash transfer "${id}" not found`);
      }
      return this.mapToDto(record);
    });
  }

  private mapToDto(t: RawTransfer): CashTransferResponseDto {
    return {
      id: t.id,
      companyId: t.companyId,
      transferNumber: t.transferNumber,
      sourceBankAccountId: t.sourceBankAccountId,
      destinationBankAccountId: t.destinationBankAccountId,
      amountPaisa: t.amountPaisa.toString(),
      transferDate: t.transferDate.toISOString().split('T')[0] ?? '',
      referenceNumber: t.referenceNumber,
      narration: t.narration,
      journalId: t.journalId,
      createdById: t.createdById,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}
