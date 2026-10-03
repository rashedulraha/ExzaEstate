import { Controller, Get, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@exzaestate/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { SetupChecklistService } from './setup-checklist.service.js';

@Controller('setup')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SetupChecklistController {
  constructor(private readonly setupChecklistService: SetupChecklistService) {}

  @Get('checklist')
  @RequirePermission(PERMISSIONS.SETTINGS_VIEW)
  async getChecklist() {
    return this.setupChecklistService.getChecklist();
  }
}
