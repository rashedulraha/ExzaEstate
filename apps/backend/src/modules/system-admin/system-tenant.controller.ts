import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentSystemAdmin,
  type SystemAdminPayload,
} from './decorators/current-system-admin.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { OnboardTenantDto, SuspendTenantDto } from './dto/tenant-management.dto.js';
import { SystemJwtAuthGuard } from './guards/system-jwt-auth.guard.js';
import { SystemTenantService } from './system-tenant.service.js';

@ApiTags('System Admin - Tenants')
@ApiBearerAuth()
@Controller('system/tenants')
@UseGuards(SystemJwtAuthGuard)
@Public()
export class SystemTenantController {
  constructor(private readonly tenantService: SystemTenantService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Onboard a new company tenant (Super Admin only)' })
  async onboardTenant(
    @Body() dto: OnboardTenantDto,
    @CurrentSystemAdmin() admin?: SystemAdminPayload,
  ) {
    return this.tenantService.onboardTenant(dto, admin?.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all company tenants across the platform' })
  async listTenants(@CurrentSystemAdmin() admin?: SystemAdminPayload) {
    return this.tenantService.listTenants(admin?.id);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'List recent platform audit log events' })
  async listAuditLogs() {
    return this.tenantService.listAuditLogs();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a company tenant by ID' })
  async getTenantById(@Param('id') id: string) {
    return this.tenantService.getTenantById(id);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a company tenant (blocks business access)' })
  async suspendTenant(
    @Param('id') id: string,
    @Body() dto: SuspendTenantDto,
    @CurrentSystemAdmin() admin?: SystemAdminPayload,
  ) {
    return this.tenantService.suspendTenant(id, dto.reason, admin?.id);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a suspended company tenant' })
  async reactivateTenant(
    @Param('id') id: string,
    @CurrentSystemAdmin() admin?: SystemAdminPayload,
  ) {
    return this.tenantService.reactivateTenant(id, admin?.id);
  }
}
