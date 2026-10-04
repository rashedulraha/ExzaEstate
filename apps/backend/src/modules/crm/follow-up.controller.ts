import {
  Body,
  Controller,
  Delete,
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
import { FollowUpService } from './follow-up.service.js';
import { FollowUpQueryService } from './follow-up-query.service.js';
import { OverdueFollowUpService } from './overdue-follow-up.service.js';
import {
  CompleteFollowUpDto,
  CreateFollowUpDto,
  QueryFollowUpsDto,
  UpdateFollowUpDto,
} from './dto/index.js';

@ApiTags('CRM - Follow-ups')
@ApiBearerAuth()
@Controller('crm/follow-ups')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FollowUpController {
  constructor(
    private readonly followUpService: FollowUpService,
    private readonly followUpQueryService: FollowUpQueryService,
    private readonly overdueFollowUpService: OverdueFollowUpService,
    private readonly clsService: ClsService,
  ) {}

  @Post()
  @RequirePermission(PERMISSIONS.FOLLOW_UP_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new follow-up task/call/visit' })
  async createFollowUp(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateFollowUpDto,
  ) {
    return this.followUpService.createFollowUp(companyId, dto, userId);
  }

  @Get()
  @RequirePermission(PERMISSIONS.FOLLOW_UP_VIEW)
  @ApiOperation({
    summary:
      'List follow-ups with scope enforcement (OWN/TEAM/BRANCH/ALL), overdue filtering, and pagination',
  })
  async listFollowUps(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Query() query: QueryFollowUpsDto,
  ) {
    const context = this.getScopeContext(PERMISSIONS.FOLLOW_UP_VIEW, userId);
    return this.followUpQueryService.listFollowUps(companyId, query, context);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.FOLLOW_UP_VIEW)
  @ApiOperation({ summary: 'Get follow-up details by ID with scope validation' })
  async getFollowUpById(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    const context = this.getScopeContext(PERMISSIONS.FOLLOW_UP_VIEW, userId);
    return this.followUpQueryService.getFollowUpById(companyId, id, context);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.FOLLOW_UP_EDIT)
  @ApiOperation({ summary: 'Update follow-up details' })
  async updateFollowUp(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFollowUpDto,
  ) {
    const context = this.getScopeContext(PERMISSIONS.FOLLOW_UP_EDIT, userId);
    return this.followUpService.updateFollowUp(companyId, id, dto, context);
  }

  @Post(':id/complete')
  @RequirePermission(PERMISSIONS.FOLLOW_UP_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete follow-up with outcome and optionally schedule next follow-up',
  })
  async completeFollowUp(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CompleteFollowUpDto,
  ) {
    const context = this.getScopeContext(PERMISSIONS.FOLLOW_UP_EDIT, userId);
    return this.followUpService.completeFollowUp(companyId, id, dto, context);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.FOLLOW_UP_EDIT)
  @ApiOperation({ summary: 'Soft delete a follow-up' })
  async deleteFollowUp(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    const context = this.getScopeContext(PERMISSIONS.FOLLOW_UP_EDIT, userId);
    return this.followUpService.deleteFollowUp(companyId, id, context);
  }

  @Post('process-overdue')
  @RequirePermission(PERMISSIONS.FOLLOW_UP_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process overdue follow-ups in company timezone and send in-app alerts',
  })
  async processOverdue(@CurrentUser('companyId') companyId: string) {
    return this.overdueFollowUpService.processCompanyOverdue(companyId);
  }

  private getScopeContext(permission: string, userId: string) {
    const scopes = this.clsService.get<Record<string, DataScope> | undefined>('scopes');
    const scope = scopes?.[permission] ?? 'OWN';
    const branchIds = this.clsService.get<string[] | undefined>('branchIds') ?? [];
    const teamUserIds = this.clsService.get<string[] | undefined>('teamUserIds') ?? [];
    return { userId, scope, branchIds, teamUserIds };
  }
}
