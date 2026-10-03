import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import {
  InAppNotificationResponseDto,
  NotificationPreferenceResponseDto,
  QueryInboxDto,
  UnreadCountResponseDto,
  UpdatePreferencesDto,
} from './dto/index.js';
import { NotificationService } from './notification.service.js';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @RequirePermission(PERMISSIONS.NOTIFICATION_VIEW)
  @ApiOperation({ summary: 'List in-app notifications for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Paginated user notifications' })
  async getInbox(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Query() query: QueryInboxDto,
  ): Promise<{
    items: InAppNotificationResponseDto[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    return this.notificationService.queryInbox(companyId, userId, query);
  }

  @Get('unread-count')
  @RequirePermission(PERMISSIONS.NOTIFICATION_VIEW)
  @ApiOperation({ summary: 'Get total unread notification count for authenticated user' })
  @ApiResponse({ status: 200, type: UnreadCountResponseDto })
  async getUnreadCount(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<UnreadCountResponseDto> {
    return this.notificationService.getUnreadCount(companyId, userId);
  }

  @Get('preferences')
  @RequirePermission(PERMISSIONS.NOTIFICATION_VIEW)
  @ApiOperation({ summary: 'Get notification delivery preferences for authenticated user' })
  @ApiResponse({ status: 200, type: [NotificationPreferenceResponseDto] })
  async getPreferences(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<NotificationPreferenceResponseDto[]> {
    return this.notificationService.getPreferences(companyId, userId);
  }

  @Put('preferences')
  @RequirePermission(PERMISSIONS.NOTIFICATION_VIEW)
  @ApiOperation({ summary: 'Update notification delivery preferences for authenticated user' })
  @ApiResponse({ status: 200, type: [NotificationPreferenceResponseDto] })
  async updatePreferences(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<NotificationPreferenceResponseDto[]> {
    return this.notificationService.updatePreferences(companyId, userId, dto);
  }

  @Patch(':id/read')
  @RequirePermission(PERMISSIONS.NOTIFICATION_VIEW)
  @ApiOperation({ summary: 'Mark a specific in-app notification as read' })
  @ApiResponse({ status: 200, type: InAppNotificationResponseDto })
  async markAsRead(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<InAppNotificationResponseDto> {
    return this.notificationService.markAsRead(companyId, userId, id);
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.NOTIFICATION_VIEW)
  @ApiOperation({ summary: 'Mark all unread in-app notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllRead(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<{ updatedCount: number }> {
    return this.notificationService.markAllAsRead(companyId, userId);
  }
}
