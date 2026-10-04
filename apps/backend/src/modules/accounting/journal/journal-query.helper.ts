import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantPrisma } from '../../../database/tenant-prisma.js';
import { QueryJournalDto } from './dto/query-journal.dto.js';
import { JournalResponseDto } from './dto/journal-response.dto.js';
import { mapJournalToDto } from './journal.mapper.js';

export async function queryJournals(
  tx: TenantPrisma,
  companyId: string,
  query: QueryJournalDto,
): Promise<{ data: JournalResponseDto[]; total: number; page: number; limit: number }> {
  const where: Prisma.JournalWhereInput = { companyId };

  if (query.status) where.status = query.status;
  if (query.type) where.type = query.type;
  if (query.startDate || query.endDate) {
    where.postingDate = {
      ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
      ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
    };
  }
  if (query.accountId) {
    where.lines = { some: { accountId: query.accountId } };
  }
  if (query.projectId) {
    where.lines = { some: { projectId: query.projectId } };
  }
  if (query.search) {
    where.OR = [
      { journalNumber: { contains: query.search, mode: 'insensitive' } },
      { narration: { contains: query.search, mode: 'insensitive' } },
      { reference: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const [total, items] = await Promise.all([
    tx.journal.count({ where }),
    tx.journal.findMany({
      where,
      include: {
        lines: {
          include: { account: { select: { code: true, name: true } } },
          orderBy: { lineNumber: 'asc' },
        },
        reversalRecord: true,
      },
      orderBy: { postingDate: 'desc' },
      skip,
      take: query.limit,
    }),
  ]);

  return {
    data: items.map(mapJournalToDto),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function findJournalById(
  tx: TenantPrisma,
  companyId: string,
  id: string,
): Promise<JournalResponseDto> {
  const journal = await tx.journal.findFirst({
    where: { id, companyId },
    include: {
      lines: {
        include: { account: { select: { code: true, name: true } } },
        orderBy: { lineNumber: 'asc' },
      },
      reversalRecord: true,
      reversals: true,
    },
  });

  if (!journal) {
    throw new NotFoundException(`Journal with ID "${id}" not found`);
  }

  return mapJournalToDto(journal);
}
