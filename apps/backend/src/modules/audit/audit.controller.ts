import { Controller, Get, Param, ParseUUIDPipe, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { AuditQueryService } from './audit-query.service.js';
import {
  AuditLogResponseDto,
  EntityHistoryResponseDto,
  PaginatedCursorResponseDto,
  QueryAuditLogDto,
  QuerySecurityEventsDto,
  SecurityEventResponseDto,
} from './dto/index.js';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditQueryService) {}

  @Get('export')
  @RequirePermission(PERMISSIONS.AUDIT_EXPORT)
  @ApiOperation({
    summary: 'Export audit logs as CSV',
    description: 'Generates a CSV export of filtered audit records (max 1000).',
  })
  async exportAuditLogs(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryAuditLogDto,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.auditService.exportAuditLogsCsv(companyId, query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    res.send(csv);
  }

  @Get('security-events/export')
  @RequirePermission(PERMISSIONS.AUDIT_EXPORT)
  @ApiOperation({
    summary: 'Export security events as CSV (S2)',
    description: 'Generates a CSV export of filtered security events (max 1000).',
  })
  async exportSecurityEvents(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QuerySecurityEventsDto,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.auditService.exportSecurityEventsCsv(companyId, query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="security-events-${Date.now()}.csv"`,
    );
    res.send(csv);
  }

  @Get('security-events')
  @RequirePermission(PERMISSIONS.AUDIT_VIEW)
  @ApiOperation({
    summary: 'Query security events (S2)',
    description: 'Cursor-paginated viewer for security events with severity/date filters.',
  })
  @ApiResponse({ status: 200, type: PaginatedCursorResponseDto })
  async getSecurityEvents(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QuerySecurityEventsDto,
  ): Promise<PaginatedCursorResponseDto<SecurityEventResponseDto>> {
    return this.auditService.querySecurityEvents(companyId, query);
  }

  @Get('entity/:recordType/:recordId')
  @RequirePermission(PERMISSIONS.AUDIT_VIEW)
  @ApiOperation({
    summary: 'Get chronological entity history (S1)',
    description: 'Returns the full chronological mutation trail for a specific entity.',
  })
  @ApiResponse({ status: 200, type: EntityHistoryResponseDto })
  async getEntityHistory(
    @CurrentUser('companyId') companyId: string,
    @Param('recordType') recordType: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ): Promise<EntityHistoryResponseDto<AuditLogResponseDto>> {
    return this.auditService.getEntityHistory(companyId, recordType, recordId);
  }

  @Get()
  @RequirePermission(PERMISSIONS.AUDIT_VIEW)
  @ApiOperation({
    summary: 'Query audit logs (S1)',
    description: 'Cursor-paginated audit trail query filtered by actor, entity, action, date.',
  })
  @ApiResponse({ status: 200, type: PaginatedCursorResponseDto })
  async getAuditLogs(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryAuditLogDto,
  ): Promise<PaginatedCursorResponseDto<AuditLogResponseDto>> {
    return this.auditService.queryAuditLogs(companyId, query);
  }
}
