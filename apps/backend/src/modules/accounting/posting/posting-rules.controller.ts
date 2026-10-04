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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { PostingRulesService } from './posting-rules.service.js';
import { UpdatePostingRuleDto } from './dto/update-posting-rule.dto.js';
import { PostingRuleResponseDto } from './dto/posting-rule-response.dto.js';

@ApiTags('Accounting - Posting Rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('accounting/posting-rules')
export class PostingRulesController {
  constructor(private readonly postingRulesService: PostingRulesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.POSTING_RULE_VIEW)
  @ApiOperation({ summary: 'List all financial posting rules for current company' })
  @ApiResponse({ status: 200, type: [PostingRuleResponseDto] })
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<PostingRuleResponseDto[]> {
    return this.postingRulesService.findAll(user.companyId);
  }

  @Get(':eventType')
  @RequirePermission(PERMISSIONS.POSTING_RULE_VIEW)
  @ApiOperation({ summary: 'Get specific posting rule mapping by event type' })
  @ApiResponse({ status: 200, type: PostingRuleResponseDto })
  async findByEventType(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventType') eventType: string,
  ): Promise<PostingRuleResponseDto> {
    return this.postingRulesService.findByEventType(user.companyId, eventType);
  }

  @Patch(':eventType')
  @RequirePermission(PERMISSIONS.POSTING_RULE_EDIT)
  @ApiOperation({ summary: 'Update posting rule account mappings without a deploy' })
  @ApiResponse({ status: 200, type: PostingRuleResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventType') eventType: string,
    @Body() dto: UpdatePostingRuleDto,
  ): Promise<PostingRuleResponseDto> {
    return this.postingRulesService.update(user.companyId, user.userId, eventType, dto);
  }

  @Delete(':eventType')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(PERMISSIONS.POSTING_RULE_EDIT)
  @ApiOperation({
    summary: 'Delete a posting rule mapping (blocks transactions with POSTING_RULE_MISSING)',
  })
  @ApiResponse({ status: 204 })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventType') eventType: string,
  ): Promise<void> {
    return this.postingRulesService.delete(user.companyId, user.userId, eventType);
  }

  @Post('reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(PERMISSIONS.POSTING_RULE_EDIT)
  @ApiOperation({ summary: 'Reset posting rules to system defaults' })
  @ApiResponse({ status: 204 })
  async resetToDefaults(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.postingRulesService.resetToDefaults(user.companyId, user.userId);
  }
}
