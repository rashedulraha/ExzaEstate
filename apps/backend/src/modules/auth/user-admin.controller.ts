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
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { StepUp } from '../../common/decorators/step-up.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import {
  AdminResetPasswordDto,
  CreateUserAdminDto,
  InviteUserDto,
  QueryUsersDto,
  UpdateUserBranchesDto,
  UpdateUserRolesDto,
} from './dto/user-admin.dto.js';
import { UserAdminService } from './user-admin.service.js';
import { UserLifecycleService } from './user-lifecycle.service.js';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserAdminController {
  constructor(
    private readonly userAdminService: UserAdminService,
    private readonly userLifecycleService: UserLifecycleService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.USER_VIEW)
  async listUsers(@CurrentUser('companyId') companyId: string, @Query() query: QueryUsersDto) {
    return this.userAdminService.listUsers(companyId, query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.USER_VIEW)
  async getUser(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.userAdminService.getUser(companyId, id);
  }

  @Post('invite')
  @RequirePermission(PERMISSIONS.USER_MANAGE)
  @StepUp()
  @HttpCode(HttpStatus.CREATED)
  async inviteUser(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') actorUserId: string,
    @Body() dto: InviteUserDto,
  ) {
    return this.userAdminService.inviteUser(companyId, dto, actorUserId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.USER_MANAGE)
  @StepUp()
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') actorUserId: string,
    @Body() dto: CreateUserAdminDto,
  ) {
    return this.userAdminService.createUser(companyId, dto, actorUserId);
  }

  @Post(':id/deactivate')
  @RequirePermission(PERMISSIONS.USER_MANAGE)
  @StepUp()
  @HttpCode(HttpStatus.OK)
  async deactivateUser(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') actorUserId: string,
    @Param('id') id: string,
  ) {
    return this.userLifecycleService.deactivateUser(companyId, id, actorUserId);
  }

  @Post(':id/reactivate')
  @RequirePermission(PERMISSIONS.USER_MANAGE)
  @StepUp()
  @HttpCode(HttpStatus.OK)
  async reactivateUser(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') actorUserId: string,
    @Param('id') id: string,
  ) {
    return this.userLifecycleService.reactivateUser(companyId, id, actorUserId);
  }

  @Put(':id/roles')
  @RequirePermission(PERMISSIONS.USER_MANAGE)
  @StepUp()
  async updateUserRoles(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') actorUserId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserRolesDto,
  ) {
    return this.userLifecycleService.updateUserRoles(companyId, id, dto, actorUserId);
  }

  @Put(':id/branches')
  @RequirePermission(PERMISSIONS.USER_MANAGE)
  @StepUp()
  async updateUserBranches(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') actorUserId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserBranchesDto,
  ) {
    return this.userLifecycleService.updateUserBranches(companyId, id, dto, actorUserId);
  }

  @Post(':id/reset-password')
  @RequirePermission(PERMISSIONS.USER_MANAGE)
  @StepUp()
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') actorUserId: string,
    @Param('id') id: string,
    @Body() dto: AdminResetPasswordDto,
  ) {
    return this.userLifecycleService.adminResetPassword(companyId, id, dto, actorUserId);
  }

  @Post(':id/reset-2fa')
  @RequirePermission(PERMISSIONS.USER_MANAGE)
  @StepUp()
  @HttpCode(HttpStatus.OK)
  async reset2Fa(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') actorUserId: string,
    @Param('id') id: string,
  ) {
    return this.userLifecycleService.adminReset2Fa(companyId, id, actorUserId);
  }
}
