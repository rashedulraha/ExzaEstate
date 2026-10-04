import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { ExpenseService } from './expense.service.js';
import { ExpenseCategoryService } from './expense-category.service.js';
import {
  CreateCategoryDto,
  CreateExpenseDto,
  PayExpenseDto,
  RejectExpenseDto,
} from './dto/index.js';

@ApiTags('Expenses')
@ApiBearerAuth()
@Controller('expenses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpenseController {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly categoryService: ExpenseCategoryService,
  ) {}

  @Post('categories')
  @RequirePermission(PERMISSIONS.EXPENSE_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an expense category' })
  async createCategory(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoryService.createCategory(companyId, userId, dto);
  }

  @Get('categories')
  @RequirePermission(PERMISSIONS.EXPENSE_VIEW)
  @ApiOperation({ summary: 'List active expense categories' })
  async listCategories(
    @CurrentUser('companyId') companyId: string,
    @Query('activeOnly') activeOnly?: boolean,
  ) {
    return this.categoryService.listCategories(companyId, activeOnly !== false);
  }

  @Post('vouchers')
  @RequirePermission(PERMISSIONS.EXPENSE_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new expense voucher (draft)' })
  async createVoucher(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expenseService.createVoucher(companyId, userId, dto);
  }

  @Get('vouchers/:id')
  @RequirePermission(PERMISSIONS.EXPENSE_VIEW)
  @ApiOperation({ summary: 'Get an expense voucher by ID' })
  async getVoucher(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.expenseService.getVoucherById(companyId, id);
  }

  @Post('vouchers/:id/submit')
  @RequirePermission(PERMISSIONS.EXPENSE_SUBMIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit expense voucher for approval' })
  async submitVoucher(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.expenseService.submitVoucher(companyId, userId, id);
  }

  @Post('vouchers/:id/approve')
  @RequirePermission(PERMISSIONS.EXPENSE_APPROVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve expense voucher (GM or MD based on threshold)' })
  async approveVoucher(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.expenseService.approveVoucher(companyId, userId, id);
  }

  @Post('vouchers/:id/verify')
  @RequirePermission(PERMISSIONS.EXPENSE_VERIFY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accounts verification of approved expense voucher' })
  async verifyVoucher(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.expenseService.verifyVoucher(companyId, userId, id);
  }

  @Post('vouchers/:id/pay')
  @RequirePermission(PERMISSIONS.EXPENSE_PAY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disburse payment and post EXPENSE_APPROVED_PAID journal' })
  async payVoucher(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto?: PayExpenseDto,
  ) {
    return this.expenseService.payVoucher(companyId, userId, id, dto);
  }

  @Post('vouchers/:id/reject')
  @RequirePermission(PERMISSIONS.EXPENSE_REJECT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject an expense voucher' })
  async rejectVoucher(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: RejectExpenseDto,
  ) {
    return this.expenseService.rejectVoucher(companyId, userId, id, dto);
  }

  @Get('projects/:projectId/rollup')
  @RequirePermission(PERMISSIONS.EXPENSE_VIEW)
  @ApiOperation({ summary: 'Get total paid expense rollup for a project' })
  async getProjectRollup(
    @CurrentUser('companyId') companyId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.expenseService.getProjectExpensesRollup(companyId, projectId);
  }
}
