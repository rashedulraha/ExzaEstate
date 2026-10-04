import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { mapFiscalYearToDto, mapPeriodToDto } from './period.mapper.js';
import type {
  AccountingPeriodResponseDto,
  FiscalYearResponseDto,
} from './dto/period-response.dto.js';
import type { ClosePeriodDto } from './dto/close-period.dto.js';
import type { ReopenPeriodDto } from './dto/reopen-period.dto.js';

@Injectable()
export class PeriodService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
  ) {}

  async getFiscalYears(companyId: string): Promise<FiscalYearResponseDto[]> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const fiscalYears = await tx.fiscalYear.findMany({
        where: { companyId },
        include: {
          periods: {
            orderBy: { periodNumber: 'asc' },
          },
        },
        orderBy: { startDate: 'desc' },
      });

      return fiscalYears.map(mapFiscalYearToDto);
    });
  }

  async getFiscalYearById(companyId: string, id: string): Promise<FiscalYearResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const fy = await tx.fiscalYear.findFirst({
        where: { id, companyId },
        include: {
          periods: {
            orderBy: { periodNumber: 'asc' },
          },
        },
      });

      if (!fy) {
        throw new NotFoundException(`Fiscal year with ID "${id}" not found`);
      }

      return mapFiscalYearToDto(fy);
    });
  }

  async getPeriods(
    companyId: string,
    fiscalYearId?: string,
  ): Promise<AccountingPeriodResponseDto[]> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const periods = await tx.accountingPeriod.findMany({
        where: {
          companyId,
          ...(fiscalYearId ? { fiscalYearId } : {}),
        },
        orderBy: [{ fiscalYearId: 'asc' }, { periodNumber: 'asc' }],
      });

      return periods.map(mapPeriodToDto);
    });
  }

  async getPeriodById(companyId: string, id: string): Promise<AccountingPeriodResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const period = await tx.accountingPeriod.findFirst({
        where: { id, companyId },
      });

      if (!period) {
        throw new NotFoundException(`Accounting period with ID "${id}" not found`);
      }

      return mapPeriodToDto(period);
    });
  }

  async closePeriod(
    companyId: string,
    id: string,
    userId: string,
    dto?: ClosePeriodDto,
  ): Promise<AccountingPeriodResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const period = await tx.accountingPeriod.findFirst({
        where: { id, companyId },
      });

      if (!period) {
        throw new NotFoundException(`Accounting period with ID "${id}" not found`);
      }

      if (period.status !== 'Open') {
        throw new AppException(
          ERROR_CODES.INVALID_STATE_TRANSITION,
          `Cannot close period in status "${period.status}"`,
          { currentStatus: period.status },
        );
      }

      const updated = await tx.accountingPeriod.update({
        where: { id: period.id },
        data: {
          status: 'Closed',
          closedAt: new Date(),
          closedById: userId,
        },
      });

      await this.auditService.record(tx, {
        action: 'PERIOD_CLOSED',
        module: 'accounting',
        recordType: 'AccountingPeriod',
        recordId: id,
        before: { status: period.status },
        after: { status: 'Closed', notes: dto?.notes },
      });

      return mapPeriodToDto(updated);
    });
  }

  async reopenPeriod(
    companyId: string,
    id: string,
    userId: string,
    dto: ReopenPeriodDto,
  ): Promise<AccountingPeriodResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const period = await tx.accountingPeriod.findFirst({
        where: { id, companyId },
      });

      if (!period) {
        throw new NotFoundException(`Accounting period with ID "${id}" not found`);
      }

      if (period.status === 'Locked') {
        throw new AppException(
          ERROR_CODES.CONFLICT,
          'Locked period cannot be reopened via API',
          { status: 'Locked' },
          HttpStatus.CONFLICT,
        );
      }

      if (period.status === 'Open') {
        throw new AppException(ERROR_CODES.INVALID_STATE_TRANSITION, 'Period is already Open', {
          status: 'Open',
        });
      }

      const updated = await tx.accountingPeriod.update({
        where: { id: period.id },
        data: {
          status: 'Open',
          reopenedAt: new Date(),
          reopenedById: userId,
          reopenReason: dto.reason,
        },
      });

      await this.auditService.record(tx, {
        action: 'PERIOD_REOPENED',
        module: 'accounting',
        recordType: 'AccountingPeriod',
        recordId: id,
        before: { status: period.status },
        after: { status: 'Open' },
        reason: dto.reason,
      });

      return mapPeriodToDto(updated);
    });
  }

  async lockPeriod(
    companyId: string,
    id: string,
    _userId: string,
  ): Promise<AccountingPeriodResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const period = await tx.accountingPeriod.findFirst({
        where: { id, companyId },
      });

      if (!period) {
        throw new NotFoundException(`Accounting period with ID "${id}" not found`);
      }

      if (period.status === 'Open') {
        throw new AppException(
          ERROR_CODES.INVALID_STATE_TRANSITION,
          'Period must be Closed before it can be Locked',
          { status: period.status },
        );
      }

      if (period.status === 'Locked') {
        throw new AppException(ERROR_CODES.INVALID_STATE_TRANSITION, 'Period is already Locked', {
          status: 'Locked',
        });
      }

      const updated = await tx.accountingPeriod.update({
        where: { id: period.id },
        data: {
          status: 'Locked',
        },
      });

      await this.auditService.record(tx, {
        action: 'PERIOD_LOCKED',
        module: 'accounting',
        recordType: 'AccountingPeriod',
        recordId: id,
        before: { status: period.status },
        after: { status: 'Locked' },
      });

      return mapPeriodToDto(updated);
    });
  }
}
