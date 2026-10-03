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
import { CreateProjectDto, QueryProjectDto, UpdateProjectDto } from './dto/project.dto.js';
import { ProjectService } from './project.service.js';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @RequirePermission(PERMISSIONS.PROJECT_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new project with cost center and optional land link' })
  async createProject(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectService.createProject(companyId, dto, userId);
  }

  @Get()
  @RequirePermission(PERMISSIONS.PROJECT_VIEW)
  @ApiOperation({ summary: 'List projects with filters and pagination' })
  async listProjects(@CurrentUser('companyId') companyId: string, @Query() query: QueryProjectDto) {
    return this.projectService.listProjects(companyId, query);
  }

  @Get(':id/summary')
  @RequirePermission(PERMISSIONS.PROJECT_VIEW)
  @ApiOperation({ summary: 'Get project summary counts and linked master data' })
  async getProjectSummary(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.projectService.getProjectSummary(companyId, id);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PROJECT_VIEW)
  @ApiOperation({ summary: 'Get project details by ID with cost center and linked land' })
  async getProjectById(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.projectService.getProjectById(companyId, id);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.PROJECT_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update project details' })
  async updateProject(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectService.updateProject(companyId, id, dto, userId);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.PROJECT_DELETE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete project and its linked cost center' })
  async deleteProject(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    await this.projectService.deleteProject(companyId, id, userId);
    return { message: 'Project and linked cost center deleted successfully' };
  }
}
