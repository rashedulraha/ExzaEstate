import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuditMapper } from './audit.mapper.js';
import type {
  AuditLogResponseDto,
  EntityHistoryResponseDto,
  PaginatedCursorResponseDto,
  QueryAuditLogDto,
  QuerySecurityEventsDto,
  SecurityEventResponseDto,
} from './dto/index.js';

function buildDateFilter(startDate?: string, endDate?: string): Prisma.DateTimeFilter | undefined {
  if (!startDate && !endDate) {
    return undefined;
  }
  const filter: Prisma.DateTimeFilter = {};
  if (startDate) {
    filter.gte = new Date(startDate);
  }
  if (endDate) {
    filter.lte = new Date(endDate);
  }
  return filter;
}

function buildAuditWhere(companyId: string, query: QueryAuditLogDto): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = { companyId };
  if (query.actorId) where.actorId = query.actorId;
  if (query.module) where.module = query.module;
  if (query.recordType) where.recordType = query.recordType;
  if (query.recordId) where.recordId = query.recordId;
  if (query.action) where.action = query.action;
  const dateFilter = buildDateFilter(query.startDate, query.endDate);
  if (dateFilter) where.createdAt = dateFilter;
  return where;
}

function buildSecurityWhere(
  companyId: string,
  query: QuerySecurityEventsDto,
): Prisma.SecurityEventWhereInput {
  const where: Prisma.SecurityEventWhereInput = { companyId };
  if (query.userId) where.userId = query.userId;
  if (query.eventType) where.eventType = query.eventType;
  if (query.severity) where.severity = query.severity;
  const dateFilter = buildDateFilter(query.startDate, query.endDate);
  if (dateFilter) where.createdAt = dateFilter;
  return where;
}

@Injectable()
export class AuditQueryService {
  constructor(private readonly tenantDb: TenantDb) {}

  async queryAuditLogs(
    companyId: string,
    query: QueryAuditLogDto,
  ): Promise<PaginatedCursorResponseDto<AuditLogResponseDto>> {
    const limit = query.limit ?? 20;
    const where = buildAuditWhere(companyId, query);
    const cursor = AuditMapper.decodeCursor(query.cursor);
    const skip = cursor ? cursor.offset : 0;

    const rows = await this.tenantDb.withCompany(companyId, (tx) =>
      tx.auditLog.findMany({
        where,
        skip,
        take: limit + 1,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? AuditMapper.encodeCursor(skip + limit) : null;

    return {
      items: items.map(AuditMapper.toAuditLogDto),
      nextCursor,
      hasMore,
    };
  }

  async getEntityHistory(
    companyId: string,
    recordType: string,
    recordId: string,
    limit: number = 50,
  ): Promise<EntityHistoryResponseDto<AuditLogResponseDto>> {
    const rows = await this.tenantDb.withCompany(companyId, (tx) =>
      tx.auditLog.findMany({
        where: { companyId, recordType, recordId },
        take: limit,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    );

    return {
      recordType,
      recordId,
      history: rows.map(AuditMapper.toAuditLogDto),
    };
  }

  async querySecurityEvents(
    companyId: string,
    query: QuerySecurityEventsDto,
  ): Promise<PaginatedCursorResponseDto<SecurityEventResponseDto>> {
    const limit = query.limit ?? 20;
    const where = buildSecurityWhere(companyId, query);
    const cursor = AuditMapper.decodeCursor(query.cursor);
    const skip = cursor ? cursor.offset : 0;

    const rows = await this.tenantDb.withCompany(companyId, (tx) =>
      tx.securityEvent.findMany({
        where,
        skip,
        take: limit + 1,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? AuditMapper.encodeCursor(skip + limit) : null;

    return {
      items: items.map(AuditMapper.toSecurityEventDto),
      nextCursor,
      hasMore,
    };
  }

  async exportSecurityEventsCsv(companyId: string, query: QuerySecurityEventsDto): Promise<string> {
    const where = buildSecurityWhere(companyId, query);

    const rows = await this.tenantDb.withCompany(companyId, (tx) =>
      tx.securityEvent.findMany({
        where,
        take: 1000,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );

    const headers = [
      'Timestamp',
      'Event Type',
      'Severity',
      'User ID',
      'IP Address',
      'User Agent',
      'Request ID',
      'Details',
    ];

    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(
        [
          AuditMapper.escapeCsvValue(row.createdAt.toISOString()),
          AuditMapper.escapeCsvValue(row.eventType),
          AuditMapper.escapeCsvValue(row.severity),
          AuditMapper.escapeCsvValue(row.userId),
          AuditMapper.escapeCsvValue(row.ipAddress),
          AuditMapper.escapeCsvValue(row.userAgent),
          AuditMapper.escapeCsvValue(row.requestId),
          AuditMapper.escapeCsvValue(row.details),
        ].join(','),
      );
    }

    return lines.join('\n');
  }

  async exportAuditLogsCsv(companyId: string, query: QueryAuditLogDto): Promise<string> {
    const where = buildAuditWhere(companyId, query);

    const rows = await this.tenantDb.withCompany(companyId, (tx) =>
      tx.auditLog.findMany({
        where,
        take: 1000,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );

    const headers = [
      'Timestamp',
      'Module',
      'Record Type',
      'Record ID',
      'Action',
      'Actor ID',
      'Reason',
      'IP Address',
      'Request ID',
      'Old Value',
      'New Value',
    ];

    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(
        [
          AuditMapper.escapeCsvValue(row.createdAt.toISOString()),
          AuditMapper.escapeCsvValue(row.module),
          AuditMapper.escapeCsvValue(row.recordType),
          AuditMapper.escapeCsvValue(row.recordId),
          AuditMapper.escapeCsvValue(row.action),
          AuditMapper.escapeCsvValue(row.actorId),
          AuditMapper.escapeCsvValue(row.reason),
          AuditMapper.escapeCsvValue(row.ipAddress),
          AuditMapper.escapeCsvValue(row.requestId),
          AuditMapper.escapeCsvValue(row.oldValue),
          AuditMapper.escapeCsvValue(row.newValue),
        ].join(','),
      );
    }

    return lines.join('\n');
  }
}
