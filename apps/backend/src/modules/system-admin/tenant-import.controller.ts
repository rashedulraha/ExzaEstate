import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { StepUp } from '../../common/decorators/step-up.decorator.js';
import type { ExzaExportBundle } from '../local-data/local-export.service.js';
import { TenantImportService } from './tenant-import.service.js';

@ApiTags('Tenant Import (Local to Cloud Pipeline)')
@ApiBearerAuth()
@Controller('tenant')
export class TenantImportController {
  constructor(private readonly importService: TenantImportService) {}

  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.TENANT_IMPORT)
  @StepUp()
  @ApiOperation({
    summary: 'Import a local standalone .exzaexport bundle into Cloud platform (Task A10.4 / AT-34)',
  })
  async importTenant(
    @Body() bundle: ExzaExportBundle,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.importService.importTenant(bundle, user?.userId);
  }
}
