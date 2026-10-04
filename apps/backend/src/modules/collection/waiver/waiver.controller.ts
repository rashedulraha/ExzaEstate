import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequestWaiverDto, WaiverResponseDto } from './dto/waiver.dto.js';
import { WaiverService } from './waiver.service.js';

@ApiTags('Collection - Installment Waivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('collection/waivers')
export class WaiverController {
  constructor(private readonly waiverService: WaiverService) {}

  @Post('installments/:installmentId/waive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.PAYMENT_REVERSE)
  @ApiOperation({ summary: 'Waive installment principal with adjustment posting' })
  async waiveInstallment(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('installmentId') installmentId: string,
    @Body() dto: RequestWaiverDto,
  ): Promise<WaiverResponseDto> {
    return this.waiverService.waiveInstallment(companyId, userId, installmentId, dto);
  }
}
