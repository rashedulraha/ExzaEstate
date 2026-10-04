import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { InstallmentService } from './installment.service.js';
import {
  GenerateScheduleDto,
  InstallmentResponseDto,
  InstallmentScheduleSummaryDto,
  QueryInstallmentsDto,
} from './dto/index.js';

@ApiTags('Collection - Installments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('collection/installments')
export class InstallmentController {
  constructor(private readonly installmentService: InstallmentService) {}

  @Get()
  @RequirePermission(PERMISSIONS.INSTALLMENT_VIEW)
  @ApiOperation({
    summary: 'Query installments with pagination, filters, and dynamic timing states',
  })
  @ApiResponse({ status: 200, description: 'Filtered installments list' })
  async query(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: QueryInstallmentsDto,
  ): Promise<{ items: InstallmentResponseDto[]; total: number }> {
    return this.installmentService.query(user.companyId, dto);
  }

  @Get('booking/:bookingId')
  @RequirePermission(PERMISSIONS.INSTALLMENT_VIEW)
  @ApiOperation({ summary: 'Get installment schedule summary for a booking' })
  @ApiResponse({ status: 200, type: InstallmentScheduleSummaryDto })
  async findByBookingId(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
    @Query('referenceDate') referenceDate?: string,
  ): Promise<InstallmentScheduleSummaryDto> {
    return this.installmentService.findByBookingId(user.companyId, bookingId, referenceDate);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.INSTALLMENT_VIEW)
  @ApiOperation({ summary: 'Get single installment details by ID' })
  @ApiResponse({ status: 200, type: InstallmentResponseDto })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('referenceDate') referenceDate?: string,
  ): Promise<InstallmentResponseDto> {
    return this.installmentService.findById(user.companyId, id, referenceDate);
  }

  @Post('generate')
  @RequirePermission(PERMISSIONS.INSTALLMENT_CREATE)
  @ApiOperation({ summary: 'Generate and persist installment schedule for a booking' })
  @ApiResponse({ status: 201, type: InstallmentScheduleSummaryDto })
  async generateSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateScheduleDto,
  ): Promise<InstallmentScheduleSummaryDto> {
    return this.installmentService.createScheduleForBooking(user.companyId, dto, user.userId);
  }
}
