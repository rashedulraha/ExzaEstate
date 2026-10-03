import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { SettingsService } from './settings.service.js';
import { BatchUpdateSettingsDto, UpdateSettingDto } from './dto/settings.dto.js';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.SETTINGS_VIEW)
  async getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Get(':key')
  @RequirePermission(PERMISSIONS.SETTINGS_VIEW)
  async getSetting(@Param('key') key: string) {
    return this.settingsService.getSetting(key);
  }

  @Put(':key')
  @RequirePermission(PERMISSIONS.SETTINGS_EDIT)
  async updateSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('sessionId') sessionId: string,
  ) {
    return this.settingsService.updateSetting(key, dto.value, userId, sessionId);
  }

  @Put()
  @RequirePermission(PERMISSIONS.SETTINGS_EDIT)
  async updateBatch(
    @Body() dto: BatchUpdateSettingsDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('sessionId') sessionId: string,
  ) {
    return this.settingsService.updateBatch(dto.settings, userId, sessionId);
  }
}
