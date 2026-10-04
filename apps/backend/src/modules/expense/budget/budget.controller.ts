import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { BudgetService } from './budget.service.js';
import { BudgetQueryDto, CreateBudgetDto } from './dto/index.js';

@ApiTags('Budgets')
@ApiBearerAuth()
@Controller('budgets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  @RequirePermission(PERMISSIONS.BUDGET_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create project or category budget' })
  async createBudget(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateBudgetDto,
  ) {
    return this.budgetService.createBudget(companyId, userId, dto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.BUDGET_VIEW)
  @ApiOperation({ summary: 'List budgets with spend metrics' })
  async listBudgets(
    @CurrentUser('companyId') companyId: string,
    @Query() query: BudgetQueryDto,
  ) {
    return this.budgetService.listBudgets(companyId, query);
  }
}
