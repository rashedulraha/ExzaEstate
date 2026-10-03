import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { SystemJwtAuthGuard } from '../system-admin/guards/system-jwt-auth.guard.js';
import { CreateLicenseDto } from './dto/license.dto.js';
import { LicenseService } from './license.service.js';

@Controller('system/licenses')
@UseGuards(SystemJwtAuthGuard)
@Public()
export class SystemLicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async issueLicense(@Body() dto: CreateLicenseDto) {
    const data = await this.licenseService.generateLicense(dto);
    return {
      success: true,
      data,
    };
  }
}
