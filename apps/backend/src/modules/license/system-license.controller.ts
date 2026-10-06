import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { SystemJwtAuthGuard } from '../system-admin/guards/system-jwt-auth.guard.js';
import { CreateLicenseDto } from './dto/license.dto.js';
import { LicenseService } from './license.service.js';

@ApiTags('System Admin - Licenses')
@Controller('system/licenses')
@UseGuards(SystemJwtAuthGuard)
@Public()
export class SystemLicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Issue an Ed25519 cryptographic license for a tenant' })
  async issueLicense(@Body() dto: CreateLicenseDto) {
    const data = await this.licenseService.generateLicense(dto);
    return {
      success: true,
      data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all issued platform licenses' })
  async listLicenses() {
    return this.licenseService.listAllLicenses();
  }
}
