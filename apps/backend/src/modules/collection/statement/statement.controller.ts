import { Controller, Get, Header, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import type { Response } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import {
  ArReconciliationResponseDto,
  CustomerStatementQueryDto,
  CustomerStatementResponseDto,
} from './dto/statement.dto.js';
import { StatementService } from './statement.service.js';

@ApiTags('Collection - Customer Statements & AR Reconciliation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('collection/statements')
export class StatementController {
  constructor(private readonly statementService: StatementService) {}

  @Get('customer/:customerId')
  @RequirePermission(PERMISSIONS.STATEMENT_VIEW)
  @ApiOperation({ summary: 'Generate customer statement of account' })
  async getCustomerStatement(
    @CurrentUser('companyId') companyId: string,
    @Param('customerId') customerId: string,
    @Query() query: CustomerStatementQueryDto,
  ): Promise<CustomerStatementResponseDto> {
    return this.statementService.generateCustomerStatement(companyId, customerId, query);
  }

  @Get('customer/:customerId/pdf')
  @RequirePermission(PERMISSIONS.STATEMENT_EXPORT)
  @ApiOperation({ summary: 'Export customer statement as PDF' })
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'inline; filename="statement.pdf"')
  async getCustomerStatementPdf(
    @CurrentUser('companyId') companyId: string,
    @Param('customerId') customerId: string,
    @Query() query: CustomerStatementQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.statementService.generateStatementPdf(
      companyId,
      customerId,
      query,
    );
    res.end(pdfBuffer);
  }

  @Get('customer/:customerId/reconciliation')
  @RequirePermission(PERMISSIONS.STATEMENT_VIEW)
  @ApiOperation({ summary: 'Reconcile customer statement against AR ledger and AR aging' })
  async getArReconciliation(
    @CurrentUser('companyId') companyId: string,
    @Param('customerId') customerId: string,
  ): Promise<ArReconciliationResponseDto> {
    return this.statementService.reconcileCustomerAr(companyId, customerId);
  }
}
