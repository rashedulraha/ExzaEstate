import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { AgreementLifecycleService } from './agreement-lifecycle.service.js';
import { AgreementService } from './agreement.service.js';
import {
  AgreementResponseDto,
  AgreementTemplateResponseDto,
  CreateAgreementTemplateDto,
  GenerateAgreementDto,
  QueryAgreementsDto,
  SignAndLockAgreementDto,
  UpdateAgreementDto,
  VersionAgreementDto,
} from './dto/index.js';

@ApiTags('Sales - Agreements')
@ApiBearerAuth()
@Controller('sales/agreements')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AgreementController {
  constructor(
    private readonly agreementService: AgreementService,
    private readonly agreementLifecycleService: AgreementLifecycleService,
  ) {}

  @Post('templates')
  @RequirePermission(PERMISSIONS.SETTINGS_EDIT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new agreement template' })
  async createTemplate(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateAgreementTemplateDto,
  ): Promise<AgreementTemplateResponseDto> {
    return this.agreementService.createTemplate(companyId, userId, dto);
  }

  @Get('templates')
  @RequirePermission(PERMISSIONS.AGREEMENT_VIEW)
  @ApiOperation({ summary: 'List available agreement templates' })
  async getTemplates(
    @CurrentUser('companyId') companyId: string,
  ): Promise<AgreementTemplateResponseDto[]> {
    return this.agreementService.getTemplates(companyId);
  }

  @Post('generate')
  @RequirePermission(PERMISSIONS.AGREEMENT_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate agreement for a confirmed booking' })
  async generateAgreement(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: GenerateAgreementDto,
  ): Promise<AgreementResponseDto> {
    return this.agreementLifecycleService.generateAgreement(companyId, userId, dto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.AGREEMENT_VIEW)
  @ApiOperation({ summary: 'List and filter agreements with pagination' })
  async listAgreements(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryAgreementsDto,
  ): Promise<{ items: AgreementResponseDto[]; total: number; page: number; limit: number }> {
    return this.agreementService.listAgreements(companyId, query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.AGREEMENT_VIEW)
  @ApiOperation({ summary: 'Get single agreement details by ID' })
  async getAgreement(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ): Promise<AgreementResponseDto> {
    return this.agreementService.getAgreement(companyId, id);
  }

  @Put(':id')
  @RequirePermission(PERMISSIONS.AGREEMENT_EDIT)
  @ApiOperation({ summary: 'Update agreement content (only before signed & locked)' })
  async updateAgreement(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAgreementDto,
  ): Promise<AgreementResponseDto> {
    return this.agreementService.updateAgreement(companyId, userId, id, dto);
  }

  @Post(':id/sign-and-lock')
  @RequirePermission(PERMISSIONS.AGREEMENT_SIGN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark agreement signed and locked, advancing booking to AGREEMENT_COMPLETED',
  })
  async signAndLockAgreement(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: SignAndLockAgreementDto,
  ): Promise<AgreementResponseDto> {
    return this.agreementLifecycleService.signAndLockAgreement(companyId, userId, id, dto);
  }

  @Post(':id/version')
  @RequirePermission(PERMISSIONS.AGREEMENT_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new superseded version from a signed & locked agreement' })
  async createVersion(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: VersionAgreementDto,
  ): Promise<AgreementResponseDto> {
    return this.agreementLifecycleService.createVersion(companyId, userId, id, dto);
  }

  @Get(':id/pdf')
  @RequirePermission(PERMISSIONS.AGREEMENT_VIEW)
  @ApiOperation({ summary: 'Download institutional branded PDF agreement' })
  async getPdf(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.agreementService.getPdf(companyId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="agreement-${id}.pdf"`);
    res.send(buffer);
  }
}
