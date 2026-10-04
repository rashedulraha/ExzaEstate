import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { ExportLedgerDto } from './dto/export-ledger.dto.js';
import { ExportJobResponseDto, LedgerReportDto } from './dto/ledger-response.dto.js';
import { QueryLedgerDto } from './dto/query-ledger.dto.js';
import { LedgerService } from './ledger.service.js';

@ApiTags('Accounting - General Ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('accounting/ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get()
  @RequirePermission(PERMISSIONS.LEDGER_VIEW)
  @ApiOperation({
    summary: 'Query general ledger entries with cursor pagination and running balance',
  })
  @ApiResponse({ status: 200, type: LedgerReportDto })
  async getLedger(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryLedgerDto,
  ): Promise<LedgerReportDto> {
    return this.ledgerService.getLedger(user.companyId, query);
  }

  @Get('accounts/:accountId')
  @RequirePermission(PERMISSIONS.LEDGER_VIEW)
  @ApiOperation({
    summary: 'Query ledger entries for a specific account UUID',
  })
  @ApiResponse({ status: 200, type: LedgerReportDto })
  async getAccountLedger(
    @CurrentUser() user: AuthenticatedUser,
    @Param('accountId') accountId: string,
    @Query() query: QueryLedgerDto,
  ): Promise<LedgerReportDto> {
    return this.ledgerService.getLedger(user.companyId, {
      ...query,
      accountId,
    });
  }

  @Post('export')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermission(PERMISSIONS.LEDGER_EXPORT)
  @ApiOperation({
    summary: 'Queue asynchronous export of the general ledger (PDF, Excel, CSV)',
  })
  @ApiResponse({ status: 202, type: ExportJobResponseDto })
  async exportLedger(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ExportLedgerDto,
  ): Promise<ExportJobResponseDto> {
    return this.ledgerService.exportLedger(user.companyId, user.userId, dto);
  }
}
