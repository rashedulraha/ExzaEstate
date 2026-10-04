import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { formatMoney } from '@exzaestate/shared';
import { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { QueryAccountDto } from './dto/query-account.dto.js';
import { UpdateAccountDto } from './dto/update-account.dto.js';
import { AccountBalanceResponseDto, AccountResponseDto } from './dto/account-response.dto.js';
import { mapAccountToDto } from './coa.mapper.js';

@Injectable()
export class CoaService {
  constructor(private readonly tenantDb: TenantDb) {}

  async getAccounts(companyId: string, query: QueryAccountDto): Promise<AccountResponseDto[]> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const where: Prisma.AccountWhereInput = { companyId };

      if (query.type) where.type = query.type;
      if (query.isActive !== undefined) where.isActive = query.isActive;
      if (query.parentId !== undefined) where.parentId = query.parentId;
      if (query.search) {
        where.OR = [
          { code: { contains: query.search, mode: 'insensitive' } },
          { name: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const accounts = await tx.account.findMany({
        where,
        orderBy: { code: 'asc' },
      });

      return accounts.map(mapAccountToDto);
    });
  }

  async getAccountById(companyId: string, id: string): Promise<AccountResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const account = await tx.account.findFirst({
        where: { id, companyId },
      });
      if (!account) {
        throw new NotFoundException(`Account with ID "${id}" not found`);
      }
      return mapAccountToDto(account);
    });
  }

  async getAccountBalance(companyId: string, id: string): Promise<AccountBalanceResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const account = await tx.account.findFirst({
        where: { id, companyId },
      });
      if (!account) {
        throw new NotFoundException(`Account with ID "${id}" not found`);
      }

      const lines = await tx.journalLine.findMany({
        where: {
          companyId,
          accountId: account.id,
          journal: { status: { in: ['Posted', 'Locked'] } },
        },
        select: { debitPaisa: true, creditPaisa: true },
      });

      let totalDebit = 0n;
      let totalCredit = 0n;
      for (const line of lines) {
        totalDebit += line.debitPaisa;
        totalCredit += line.creditPaisa;
      }

      const isDebitNormal = account.type === 'ASSET' || account.type === 'EXPENSE';
      const balancePaisa = isDebitNormal ? totalDebit - totalCredit : totalCredit - totalDebit;

      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        balancePaisa: balancePaisa.toString(),
        formattedBalance: formatMoney(balancePaisa),
      };
    });
  }

  async createAccount(companyId: string, dto: CreateAccountDto): Promise<AccountResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.account.findFirst({
        where: { companyId, code: dto.code },
      });
      if (existing) {
        throw new ConflictException(`Account with code "${dto.code}" already exists in company`);
      }

      if (dto.parentId) {
        const parent = await tx.account.findFirst({
          where: { id: dto.parentId, companyId },
        });
        if (!parent) {
          throw new NotFoundException(`Parent account "${dto.parentId}" not found`);
        }
      }

      const account = await tx.account.create({
        data: {
          companyId,
          code: dto.code,
          name: dto.name,
          type: dto.type,
          parentId: dto.parentId ?? null,
          isGroup: dto.isGroup ?? false,
          isSystem: false,
          partyType: dto.partyType ?? null,
          description: dto.description ?? null,
          isActive: true,
        },
      });

      return mapAccountToDto(account);
    });
  }

  async updateAccount(
    companyId: string,
    id: string,
    dto: UpdateAccountDto,
  ): Promise<AccountResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const account = await tx.account.findFirst({
        where: { id, companyId },
      });
      if (!account) {
        throw new NotFoundException(`Account with ID "${id}" not found`);
      }

      await validateAccountUpdate(tx, companyId, id, account, dto);

      const updated = await tx.account.update({
        where: { id },
        data: {
          code: dto.code,
          name: dto.name,
          parentId: dto.parentId !== undefined ? dto.parentId : account.parentId,
          isActive: dto.isActive !== undefined ? dto.isActive : account.isActive,
          description: dto.description !== undefined ? dto.description : account.description,
        },
      });

      return mapAccountToDto(updated);
    });
  }
}

async function validateAccountUpdate(
  tx: TenantPrisma,
  companyId: string,
  id: string,
  account: { isSystem: boolean; code: string },
  dto: UpdateAccountDto,
): Promise<void> {
  if (account.isSystem && dto.isActive === false) {
    throw new ConflictException('System accounts cannot be deactivated while mapped');
  }

  if (dto.code && dto.code !== account.code) {
    const codeConflict = await tx.account.findFirst({
      where: { companyId, code: dto.code },
    });
    if (codeConflict) {
      throw new ConflictException(`Account with code "${dto.code}" already exists in company`);
    }
  }

  if (dto.parentId) {
    if (dto.parentId === id) {
      throw new ConflictException('Account cannot be its own parent');
    }
    const parent = await tx.account.findFirst({
      where: { id: dto.parentId, companyId },
    });
    if (!parent) {
      throw new NotFoundException(`Parent account "${dto.parentId}" not found`);
    }
  }
}
