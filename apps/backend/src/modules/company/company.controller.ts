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
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { CompanyService } from './company.service.js';
import { UpdateCompanyProfileDto } from './dto/company-profile.dto.js';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto.js';
import {
  CreateDepartmentDto,
  QueryDepartmentDto,
  UpdateDepartmentDto,
} from './dto/department.dto.js';

@Controller('company')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // ---------------------------------------------------------------------------
  // Company Profile Endpoints
  // ---------------------------------------------------------------------------

  @Get('profile')
  @RequirePermission(PERMISSIONS.COMPANY_VIEW)
  async getProfile() {
    return this.companyService.getProfile();
  }

  @Patch('profile')
  @RequirePermission(PERMISSIONS.COMPANY_EDIT)
  async updateProfile(@Body() dto: UpdateCompanyProfileDto) {
    return this.companyService.updateProfile(dto);
  }

  // ---------------------------------------------------------------------------
  // Branches Endpoints
  // ---------------------------------------------------------------------------

  @Get('branches')
  @RequirePermission(PERMISSIONS.BRANCH_VIEW)
  async listBranches(@CurrentUser('userId') userId: string) {
    return this.companyService.listBranches(userId);
  }

  @Post('branches')
  @RequirePermission(PERMISSIONS.BRANCH_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async createBranch(@Body() dto: CreateBranchDto) {
    return this.companyService.createBranch(dto);
  }

  @Get('branches/:id')
  @RequirePermission(PERMISSIONS.BRANCH_VIEW)
  async getBranch(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.companyService.getBranch(id, userId);
  }

  @Patch('branches/:id')
  @RequirePermission(PERMISSIONS.BRANCH_EDIT)
  async updateBranch(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.companyService.updateBranch(id, dto, userId);
  }

  @Delete('branches/:id')
  @RequirePermission(PERMISSIONS.BRANCH_DELETE)
  async deleteBranch(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.companyService.deleteBranch(id, userId);
  }

  // ---------------------------------------------------------------------------
  // Departments Endpoints
  // ---------------------------------------------------------------------------

  @Get('departments')
  @RequirePermission(PERMISSIONS.DEPARTMENT_VIEW)
  async listDepartments(@Query() query: QueryDepartmentDto) {
    return this.companyService.listDepartments(query);
  }

  @Post('departments')
  @RequirePermission(PERMISSIONS.DEPARTMENT_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.companyService.createDepartment(dto);
  }

  @Get('departments/:id')
  @RequirePermission(PERMISSIONS.DEPARTMENT_VIEW)
  async getDepartment(@Param('id') id: string) {
    return this.companyService.getDepartment(id);
  }

  @Patch('departments/:id')
  @RequirePermission(PERMISSIONS.DEPARTMENT_EDIT)
  async updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.companyService.updateDepartment(id, dto);
  }

  @Delete('departments/:id')
  @RequirePermission(PERMISSIONS.DEPARTMENT_DELETE)
  async deleteDepartment(@Param('id') id: string) {
    return this.companyService.deleteDepartment(id);
  }
}
