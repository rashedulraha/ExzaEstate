import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { SystemPrisma } from '../../../database/system-prisma.service.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { FieldCryptoService } from '../../../platform/security/field-crypto.service.js';
import {
  BankAccountResponseDto,
  BankBranchRefDto,
  BankRefDto,
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from './dto/bank-account.dto.js';
import {
  computeBalancePaisa,
  maskAccountNumber,
  resolveNextChildCode,
  resolveParentCode,
} from './cashbank.helper.js';
import { mapBankAccountToDto } from './cashbank.mapper.js';

@Injectable()
export class CashBankService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly systemPrisma: SystemPrisma,
    private readonly auditService: AuditService,
    private readonly fieldCrypto: FieldCryptoService,
  ) {}

  async listGlobalBanks(): Promise<BankRefDto[]> {
    return this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Read global banks catalog',
      async (client) => {
        const banks = await client.bank.findMany({
          where: { isActive: true },
          include: {
            branches: { where: { isActive: true }, orderBy: { name: 'asc' } },
          },
          orderBy: { name: 'asc' },
        });

        return banks.map((b) => ({
          id: b.id,
          name: b.name,
          code: b.code,
          swiftCode: b.swiftCode,
          branches: b.branches.map((br) => ({
            id: br.id,
            name: br.name,
            routingNumber: br.routingNumber,
            district: br.district,
          })),
        }));
      },
    );
  }

  async listBranches(bankId: string): Promise<BankBranchRefDto[]> {
    return this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Read branches for global bank',
      async (client) => {
        const branches = await client.bankBranch.findMany({
          where: { bankId, isActive: true },
          orderBy: { name: 'asc' },
        });
        return branches.map((br) => ({
          id: br.id,
          name: br.name,
          routingNumber: br.routingNumber,
          district: br.district,
        }));
      },
    );
  }

  async create(
    companyId: string,
    _userId: string,
    dto: CreateBankAccountDto,
  ): Promise<BankAccountResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      let coaAccountId: string;
      let coaAccountCode: string;

      if (dto.coaAccountCode) {
        const existingAccount = await tx.account.findUnique({
          where: { companyId_code: { companyId, code: dto.coaAccountCode } },
        });
        if (!existingAccount) {
          throw new NotFoundException(`COA account "${dto.coaAccountCode}" not found`);
        }
        if (!existingAccount.isActive) {
          throw new BadRequestException(`COA account "${dto.coaAccountCode}" is deactivated`);
        }
        const alreadyLinked = await tx.bankAccount.findFirst({
          where: { companyId, coaAccountId: existingAccount.id },
        });
        if (alreadyLinked) {
          throw new ConflictException(`COA account "${dto.coaAccountCode}" is already linked`);
        }
        coaAccountId = existingAccount.id;
        coaAccountCode = existingAccount.code;
      } else {
        const auto = await this.autoCreateCoaAccount(tx, companyId, dto);
        coaAccountId = auto.id;
        coaAccountCode = auto.code;
      }

      let accountNumberEnc: string | null = null;
      let accountNumberBidx: string | null = null;
      let accountNumberMasked: string | null = null;

      if (dto.accountNumber) {
        accountNumberEnc = this.fieldCrypto.encrypt(dto.accountNumber);
        accountNumberBidx = this.fieldCrypto.blindIndex(dto.accountNumber, companyId);
        accountNumberMasked = maskAccountNumber(dto.accountNumber);
      }

      const initialPaisa = dto.initialBalancePaisa ? BigInt(dto.initialBalancePaisa) : 0n;

      const created = await tx.bankAccount.create({
        data: {
          companyId,
          accountType: dto.accountType,
          name: dto.name,
          accountNumberEnc,
          accountNumberBidx,
          accountNumberMasked,
          bankId: dto.bankId,
          branchId: dto.branchId,
          routingNumber: dto.routingNumber,
          swiftCode: dto.swiftCode,
          currency: dto.currency ?? 'BDT',
          coaAccountId,
          coaAccountCode,
          initialBalancePaisa: initialPaisa,
          isActive: true,
        },
        include: { bank: true, branch: true },
      });

      await this.auditService.record(tx, {
        action: 'BANK_ACCOUNT_CREATED',
        module: 'accounting',
        recordType: 'BankAccount',
        recordId: created.id,
        after: {
          accountType: created.accountType,
          name: created.name,
          coaAccountCode: created.coaAccountCode,
        },
      });

      return mapBankAccountToDto(created, initialPaisa);
    });
  }

  async findAll(
    companyId: string,
    filter?: { accountType?: string; isActive?: boolean },
  ): Promise<BankAccountResponseDto[]> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const accounts = await tx.bankAccount.findMany({
        where: {
          companyId,
          accountType: filter?.accountType,
          isActive: filter?.isActive,
        },
        include: { bank: true, branch: true },
        orderBy: [{ accountType: 'asc' }, { coaAccountCode: 'asc' }],
      });

      const dtos: BankAccountResponseDto[] = [];
      for (const acc of accounts) {
        const lines = await tx.journalLine.findMany({
          where: {
            companyId,
            accountId: acc.coaAccountId,
            journal: { status: 'Posted' },
          },
          select: { debitPaisa: true, creditPaisa: true },
        });
        const currentBalance = computeBalancePaisa(lines, acc.initialBalancePaisa);
        dtos.push(mapBankAccountToDto(acc, currentBalance));
      }
      return dtos;
    });
  }

  async findById(companyId: string, id: string): Promise<BankAccountResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const acc = await tx.bankAccount.findFirst({
        where: { companyId, id },
        include: { bank: true, branch: true },
      });
      if (!acc) {
        throw new NotFoundException(`Bank account "${id}" not found`);
      }

      const lines = await tx.journalLine.findMany({
        where: {
          companyId,
          accountId: acc.coaAccountId,
          journal: { status: 'Posted' },
        },
        select: { debitPaisa: true, creditPaisa: true },
      });
      const currentBalance = computeBalancePaisa(lines, acc.initialBalancePaisa);
      return mapBankAccountToDto(acc, currentBalance);
    });
  }

  async update(
    companyId: string,
    _userId: string,
    id: string,
    dto: UpdateBankAccountDto,
  ): Promise<BankAccountResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.bankAccount.findFirst({
        where: { companyId, id },
      });
      if (!existing) {
        throw new NotFoundException(`Bank account "${id}" not found`);
      }

      const updated = await tx.bankAccount.update({
        where: { id: existing.id },
        data: {
          name: dto.name,
          routingNumber: dto.routingNumber,
          swiftCode: dto.swiftCode,
          isActive: dto.isActive,
        },
        include: { bank: true, branch: true },
      });

      await this.auditService.record(tx, {
        action: 'BANK_ACCOUNT_UPDATED',
        module: 'accounting',
        recordType: 'BankAccount',
        recordId: updated.id,
        before: { name: existing.name, isActive: existing.isActive },
        after: { name: updated.name, isActive: updated.isActive },
      });

      const lines = await tx.journalLine.findMany({
        where: { companyId, accountId: updated.coaAccountId },
        select: { debitPaisa: true, creditPaisa: true },
      });
      const currentBalance = computeBalancePaisa(lines, updated.initialBalancePaisa);
      return mapBankAccountToDto(updated, currentBalance);
    });
  }

  private async autoCreateCoaAccount(
    tx: Parameters<Parameters<TenantDb['withCompany']>[1]>[0],
    companyId: string,
    dto: CreateBankAccountDto,
  ): Promise<{ id: string; code: string }> {
    const parentCode = resolveParentCode(dto.accountType);
    const parent = await tx.account.findUnique({
      where: { companyId_code: { companyId, code: parentCode } },
    });
    if (!parent) {
      throw new NotFoundException(`Parent account "${parentCode}" not found in COA`);
    }

    if (dto.accountType === 'CASH') {
      const alreadyLinked = await tx.bankAccount.findFirst({
        where: { companyId, coaAccountId: parent.id },
      });
      if (!alreadyLinked) {
        return { id: parent.id, code: parent.code };
      }
    }

    const siblings = await tx.account.findMany({
      where: { companyId, parentId: parent.id },
      select: { code: true },
    });
    const nextCode = resolveNextChildCode(
      parentCode,
      siblings.map((s) => s.code),
    );

    const child = await tx.account.create({
      data: {
        companyId,
        code: nextCode,
        name: dto.name,
        type: 'ASSET',
        parentId: parent.id,
        isGroup: false,
        isSystem: false,
        isActive: true,
      },
    });

    return { id: child.id, code: child.code };
  }
}
