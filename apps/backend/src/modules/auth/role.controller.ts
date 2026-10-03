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
  Put,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { StepUp } from '../../common/decorators/step-up.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import {
  CloneRoleDto,
  CreateRoleDto,
  UpdateRoleDto,
  UpdateRolePermissionsDto,
} from './dto/role.dto.js';
import { RoleService } from './role.service.js';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ROLE_VIEW)
  async listRoles(@CurrentUser('companyId') companyId: string) {
    return this.roleService.listRoles(companyId);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.ROLE_VIEW)
  async getRole(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.roleService.getRole(companyId, id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.ROLE_MANAGE)
  @StepUp()
  @HttpCode(HttpStatus.CREATED)
  async createRole(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateRoleDto,
  ) {
    return this.roleService.createRole(companyId, dto, userId);
  }

  @Post(':id/clone')
  @RequirePermission(PERMISSIONS.ROLE_MANAGE)
  @StepUp()
  @HttpCode(HttpStatus.CREATED)
  async cloneRole(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CloneRoleDto,
  ) {
    return this.roleService.cloneRole(companyId, id, dto, userId);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.ROLE_MANAGE)
  @StepUp()
  async updateRole(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roleService.updateRole(companyId, id, dto, userId);
  }

  @Put(':id/permissions')
  @RequirePermission(PERMISSIONS.ROLE_MANAGE)
  @StepUp()
  async updateRolePermissions(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.roleService.updateRolePermissions(companyId, id, dto, userId);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.ROLE_MANAGE)
  @StepUp()
  async deleteRole(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    await this.roleService.deleteRole(companyId, id, userId);
    return { success: true };
  }
}
