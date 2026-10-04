import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClsService } from 'nestjs-cls';
import { type DataScope, PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { CrmQueryService } from './crm-query.service.js';
import { CrmService } from './crm.service.js';
import { LeadConversionService } from './lead-conversion.service.js';
import { AssignLeadDto } from './dto/assign-lead.dto.js';
import { ChangeLeadStatusDto } from './dto/change-lead-status.dto.js';
import { ConvertLeadDto } from './dto/convert-lead.dto.js';
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { QueryLeadsDto } from './dto/query-leads.dto.js';
import { UpdateLeadDto } from './dto/update-lead.dto.js';

@ApiTags('CRM')
@ApiBearerAuth()
@Controller('crm/leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CrmController {
  constructor(
    private readonly crmService: CrmService,
    private readonly crmQueryService: CrmQueryService,
    private readonly leadConversionService: LeadConversionService,
    private readonly clsService: ClsService,
  ) {}

  @Post()
  @RequirePermission(PERMISSIONS.LEAD_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new lead with duplicate phone detection' })
  async createLead(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateLeadDto,
  ) {
    return this.crmService.createLead(companyId, dto, userId);
  }

  @Get()
  @RequirePermission(PERMISSIONS.LEAD_VIEW)
  @ApiOperation({
    summary: 'List leads with scope enforcement (OWN/TEAM/BRANCH/ALL) and filtering/search',
  })
  async listLeads(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Query() query: QueryLeadsDto,
  ) {
    const context = this.getScopeContext(PERMISSIONS.LEAD_VIEW, userId);
    return this.crmQueryService.listLeads(companyId, query, context);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.LEAD_VIEW)
  @ApiOperation({ summary: 'Get lead details by ID with scope validation' })
  async getLeadById(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    const context = this.getScopeContext(PERMISSIONS.LEAD_VIEW, userId);
    return this.crmQueryService.getLeadById(companyId, id, context);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.LEAD_EDIT)
  @ApiOperation({ summary: 'Update lead information' })
  async updateLead(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    const context = this.getScopeContext(PERMISSIONS.LEAD_EDIT, userId);
    return this.crmService.updateLead(companyId, id, dto, userId, context);
  }

  @Patch(':id/status')
  @RequirePermission(PERMISSIONS.LEAD_EDIT)
  @ApiOperation({ summary: 'Advance or transition lead pipeline status' })
  async changeLeadStatus(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: ChangeLeadStatusDto,
  ) {
    const context = this.getScopeContext(PERMISSIONS.LEAD_EDIT, userId);
    return this.crmService.changeLeadStatus(companyId, id, dto, userId, context);
  }

  @Post(':id/assign')
  @RequirePermission(PERMISSIONS.LEAD_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign lead to sales executive' })
  async assignLead(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: AssignLeadDto,
  ) {
    const context = this.getScopeContext(PERMISSIONS.LEAD_EDIT, userId);
    return this.crmService.assignLead(companyId, id, dto, userId, context);
  }

  @Post(':id/convert')
  @RequirePermission(PERMISSIONS.CUSTOMER_CREATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert lead to customer idempotently in one atomic transaction' })
  async convertLead(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: ConvertLeadDto,
  ) {
    const context = this.getScopeContext(PERMISSIONS.LEAD_VIEW, userId);
    return this.leadConversionService.convertLead(companyId, id, dto, userId, context);
  }

  private getScopeContext(permission: string, userId: string) {
    const scopes = this.clsService.get<Record<string, DataScope> | undefined>('scopes');
    const scope = scopes?.[permission] ?? scopes?.[PERMISSIONS.LEAD_VIEW] ?? 'OWN';
    const branchIds = this.clsService.get<string[] | undefined>('branchIds') ?? [];
    const teamUserIds = this.clsService.get<string[] | undefined>('teamUserIds') ?? [];
    return { userId, scope, branchIds, teamUserIds };
  }
}
