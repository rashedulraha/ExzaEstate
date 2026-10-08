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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { CancellationService } from './cancellation.service.js';
import {
  CancellationPreviewDto,
  CancellationResultDto,
  RequestCancellationDto,
} from './dto/cancellation.dto.js';

@ApiTags('Sales - Booking Cancellation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales/bookings/:bookingId/cancellation')
export class CancellationController {
  constructor(private readonly cancellationService: CancellationService) {}

  @Get('preview')
  @RequirePermission(PERMISSIONS.CANCELLATION_VIEW)
  @ApiOperation({ summary: 'Preview booking cancellation deduction and refund amounts' })
  async previewCancellation(
    @CurrentUser('companyId') companyId: string,
    @Param('bookingId') bookingId: string,
    @Query('deductionRatePct') deductionRatePct?: number,
    @Query('deductionPaisa') deductionPaisa?: string,
  ): Promise<CancellationPreviewDto> {
    return this.cancellationService.previewCancellation(companyId, bookingId, {
      deductionRatePct,
      deductionPaisa,
    });
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.CANCELLATION_CREATE)
  @ApiOperation({
    summary: 'Execute booking cancellation (reverses sale, posts deduction, creates refund)',
  })
  async cancelBooking(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('bookingId') bookingId: string,
    @Body() dto: RequestCancellationDto,
  ): Promise<CancellationResultDto> {
    return this.cancellationService.cancelBooking(companyId, userId, bookingId, dto);
  }
}
