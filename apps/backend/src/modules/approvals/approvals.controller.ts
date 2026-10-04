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
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequestContext } from '../../common/context/request-context.service.js';
import {
  ApprovalListResponseDto,
  ApprovalResponseDto,
  ApprovalRuleResponseDto,
  ApproveApprovalDto,
  CreateApprovalRuleDto,
  OverrideApprovalDto,
  QueryApprovalsDto,
  RejectApprovalDto,
  UpdateApprovalRuleDto,
} from './dto/index.js';
import { ApprovalsDecisionService } from './approvals-decision.service.js';
import { ApprovalsInboxService } from './approvals-inbox.service.js';
import { ApprovalsOverrideService } from './approvals-override.service.js';
import { ApprovalsRulesService } from './approvals-rules.service.js';

@ApiTags('Approvals Engine')
@ApiBearerAuth()
@Controller('approvals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ApprovalsController {
  constructor(
    private readonly inboxService: ApprovalsInboxService,
    private readonly decisionService: ApprovalsDecisionService,
    private readonly overrideService: ApprovalsOverrideService,
    private readonly rulesService: ApprovalsRulesService,
    private readonly requestContext: RequestContext,
  ) {}

  @Get('inbox')
  @RequirePermission(PERMISSIONS.APPROVAL_VIEW)
  @ApiOperation({ summary: 'List pending approval requests waiting for current user action' })
  async getInbox(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Query() query: QueryApprovalsDto,
  ): Promise<ApprovalListResponseDto> {
    return this.inboxService.getInbox(companyId, userId, this.requestContext.permissions, query);
  }

  @Get('sent')
  @RequirePermission(PERMISSIONS.APPROVAL_VIEW)
  @ApiOperation({ summary: 'List approval requests created by current user' })
  async getSent(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Query() query: QueryApprovalsDto,
  ): Promise<ApprovalListResponseDto> {
    return this.inboxService.getSent(companyId, userId, query);
  }

  @Post('check-expiry')
  @RequirePermission(PERMISSIONS.APPROVAL_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger background check to mark overdue requests Expired' })
  async checkExpiry(
    @CurrentUser('companyId') companyId: string,
  ): Promise<{ expiredCount: number }> {
    return this.inboxService.expireOverdueApprovals(companyId);
  }

  @Get('rules')
  @RequirePermission(PERMISSIONS.APPROVAL_RULE_VIEW)
  @ApiOperation({ summary: 'List approval matrix rules configured for the company' })
  async getRules(
    @CurrentUser('companyId') companyId: string,
    @Query('type') type?: string,
  ): Promise<ApprovalRuleResponseDto[]> {
    return this.rulesService.getRules(companyId, type);
  }

  @Post('rules')
  @RequirePermission(PERMISSIONS.APPROVAL_RULE_MANAGE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new approval matrix threshold rule' })
  async createRule(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateApprovalRuleDto,
  ): Promise<ApprovalRuleResponseDto> {
    return this.rulesService.createRule(companyId, dto);
  }

  @Patch('rules/:id')
  @RequirePermission(PERMISSIONS.APPROVAL_RULE_MANAGE)
  @ApiOperation({ summary: 'Update approval matrix rule' })
  async updateRule(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateApprovalRuleDto,
  ): Promise<ApprovalRuleResponseDto> {
    return this.rulesService.updateRule(companyId, id, dto);
  }

  @Delete('rules/:id')
  @RequirePermission(PERMISSIONS.APPROVAL_RULE_MANAGE)
  @ApiOperation({ summary: 'Soft-delete approval matrix rule' })
  async deleteRule(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.rulesService.deleteRule(companyId, id);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.APPROVAL_VIEW)
  @ApiOperation({ summary: 'Get approval request details and step history' })
  async getApprovalById(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ): Promise<ApprovalResponseDto> {
    return this.inboxService.getApprovalById(companyId, id);
  }

  @Post(':id/approve')
  @RequirePermission(PERMISSIONS.APPROVAL_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve current step of the approval request' })
  async approve(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: ApproveApprovalDto,
  ): Promise<ApprovalResponseDto> {
    return this.decisionService.approve(
      companyId,
      id,
      userId,
      this.requestContext.permissions,
      dto.comments || dto.comment,
    );
  }

  @Post(':id/reject')
  @RequirePermission(PERMISSIONS.APPROVAL_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject approval request with mandatory reason' })
  async reject(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: RejectApprovalDto,
  ): Promise<ApprovalResponseDto> {
    return this.decisionService.reject(
      companyId,
      id,
      userId,
      this.requestContext.permissions,
      dto.reason,
    );
  }

  @Post(':id/override')
  @RequirePermission(PERMISSIONS.APPROVAL_OVERRIDE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Joint control executive override (requires two distinct users)' })
  async override(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: OverrideApprovalDto,
  ): Promise<ApprovalResponseDto> {
    return this.overrideService.override(
      companyId,
      id,
      userId,
      dto.reason || dto.overrideReason || '',
    );
  }
}
