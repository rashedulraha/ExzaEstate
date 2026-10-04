import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@exzaestate/shared';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../../../common/decorators/current-user.decorator.js';
import { CsvMigrationService } from './csv-migration.service.js';
import type {
  CsvImportResult,
  CsvMigrationEntity,
  CsvTemplateDefinition,
  CsvValidationReport,
} from './csv-migration.types.js';

export class CsvPayloadDto {
  csvContent!: string;
}

@Controller('migration/csv')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CsvMigrationController {
  constructor(private readonly csvService: CsvMigrationService) {}

  @Get('template/:entity')
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  getTemplate(@Param('entity') entity: string): CsvTemplateDefinition {
    return this.csvService.getTemplate(entity.toUpperCase() as CsvMigrationEntity);
  }

  @Post('validate/:entity')
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  async validate(
    @CurrentUser('companyId') companyId: string,
    @Param('entity') entity: string,
    @Body() body: CsvPayloadDto,
  ): Promise<CsvValidationReport> {
    return this.csvService.validateCsv(
      companyId,
      entity.toUpperCase() as CsvMigrationEntity,
      body.csvContent,
    );
  }

  @Post('import/:entity')
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  async import(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entity') entity: string,
    @Body() body: CsvPayloadDto,
  ): Promise<CsvImportResult> {
    return this.csvService.importCsv(
      user.companyId,
      user.userId,
      entity.toUpperCase() as CsvMigrationEntity,
      body.csvContent,
    );
  }
}
