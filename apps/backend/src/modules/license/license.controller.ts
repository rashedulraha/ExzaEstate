import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { PERMISSIONS } from '@exzaestate/shared';
import { TransferLicenseDto, VerifyLicenseDto } from './dto/license.dto.js';
import { LicenseService } from './license.service.js';

@Controller('license')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyLicense(@Body() dto: VerifyLicenseDto) {
    const data = await this.licenseService.verifyLicense(dto);
    return {
      success: true,
      data,
    };
  }

  @Public()
  @Post('transfer-request')
  @HttpCode(HttpStatus.OK)
  async transferLicense(@Body() dto: TransferLicenseDto) {
    const data = await this.licenseService.requestLicenseTransfer(dto);
    return {
      success: true,
      data,
    };
  }

  @Get('current')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(PERMISSIONS.LICENSE_VIEW)
  async getCurrentLicense(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.licenseService.getLatestCompanyLicense(user.companyId);
    return {
      success: true,
      data,
    };
  }
}
