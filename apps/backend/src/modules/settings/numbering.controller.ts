import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@exzaestate/shared';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { NumberingService } from './numbering.service.js';
import { PreviewNumberingQueryDto, UpdateNumberingPatternDto } from './dto/numbering.dto.js';

@Controller('numbering')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NumberingController {
  constructor(private readonly numberingService: NumberingService) {}

  @Get('preview')
  @RequirePermission(PERMISSIONS.NUMBERING_VIEW)
  async preview(@Query() query: PreviewNumberingQueryDto) {
    return this.numberingService.preview(query);
  }

  @Get('patterns')
  @RequirePermission(PERMISSIONS.NUMBERING_VIEW)
  async listPatterns() {
    return this.numberingService.listPatterns();
  }

  @Get('patterns/:documentType')
  @RequirePermission(PERMISSIONS.NUMBERING_VIEW)
  async getPattern(@Param('documentType') documentType: string) {
    return this.numberingService.getPattern(documentType);
  }

  @Put('patterns/:documentType')
  @RequirePermission(PERMISSIONS.NUMBERING_EDIT)
  async updatePattern(
    @Param('documentType') documentType: string,
    @Body() dto: UpdateNumberingPatternDto,
  ) {
    return this.numberingService.updatePattern(documentType, dto);
  }
}
