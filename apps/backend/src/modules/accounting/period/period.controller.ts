import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { PeriodService } from './period.service.js';
import { ClosePeriodDto } from './dto/close-period.dto.js';
import { ReopenPeriodDto } from './dto/reopen-period.dto.js';
import { AccountingPeriodResponseDto, FiscalYearResponseDto } from './dto/period-response.dto.js';

@ApiTags('Accounting - Fiscal Years & Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('accounting')
export class PeriodController {
  constructor(private readonly periodService: PeriodService) {}

  @Get('fiscal-years')
  @RequirePermission(PERMISSIONS.PERIOD_VIEW)
  @ApiOperation({ summary: 'List all fiscal years and their accounting periods' })
  @ApiResponse({ status: 200, type: [FiscalYearResponseDto] })
  async getFiscalYears(@CurrentUser() user: AuthenticatedUser): Promise<FiscalYearResponseDto[]> {
    return this.periodService.getFiscalYears(user.companyId);
  }

  @Get('fiscal-years/:id')
  @RequirePermission(PERMISSIONS.PERIOD_VIEW)
  @ApiOperation({ summary: 'Get fiscal year details by ID' })
  @ApiResponse({ status: 200, type: FiscalYearResponseDto })
  async getFiscalYearById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<FiscalYearResponseDto> {
    return this.periodService.getFiscalYearById(user.companyId, id);
  }

  @Get('periods')
  @RequirePermission(PERMISSIONS.PERIOD_VIEW)
  @ApiOperation({ summary: 'List accounting periods' })
  @ApiResponse({ status: 200, type: [AccountingPeriodResponseDto] })
  async getPeriods(
    @CurrentUser() user: AuthenticatedUser,
    @Query('fiscalYearId') fiscalYearId?: string,
  ): Promise<AccountingPeriodResponseDto[]> {
    return this.periodService.getPeriods(user.companyId, fiscalYearId);
  }

  @Get('periods/:id')
  @RequirePermission(PERMISSIONS.PERIOD_VIEW)
  @ApiOperation({ summary: 'Get accounting period by ID' })
  @ApiResponse({ status: 200, type: AccountingPeriodResponseDto })
  async getPeriodById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<AccountingPeriodResponseDto> {
    return this.periodService.getPeriodById(user.companyId, id);
  }

  @Post('periods/:id/close')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.PERIOD_CLOSE)
  @ApiOperation({ summary: 'Close an open accounting period' })
  @ApiResponse({ status: 200, type: AccountingPeriodResponseDto })
  async closePeriod(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ClosePeriodDto,
  ): Promise<AccountingPeriodResponseDto> {
    return this.periodService.closePeriod(user.companyId, id, user.userId, dto);
  }

  @Post('periods/:id/reopen')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.PERIOD_REOPEN)
  @ApiOperation({
    summary: 'Reopen a closed accounting period (Managing Director only, requires justification)',
  })
  @ApiResponse({ status: 200, type: AccountingPeriodResponseDto })
  async reopenPeriod(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReopenPeriodDto,
  ): Promise<AccountingPeriodResponseDto> {
    return this.periodService.reopenPeriod(user.companyId, id, user.userId, dto);
  }

  @Post('periods/:id/lock')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.PERIOD_CLOSE)
  @ApiOperation({ summary: 'Lock a closed accounting period permanently' })
  @ApiResponse({ status: 200, type: AccountingPeriodResponseDto })
  async lockPeriod(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<AccountingPeriodResponseDto> {
    return this.periodService.lockPeriod(user.companyId, id, user.userId);
  }
}
