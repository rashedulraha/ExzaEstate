import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PostingModule } from '../accounting/posting/posting.module.js';
import { ExpenseController } from './expense.controller.js';
import { ExpenseService } from './expense.service.js';
import { ExpenseCategoryService } from './expense-category.service.js';
import { BudgetController } from './budget/budget.controller.js';
import { BudgetService } from './budget/budget.service.js';

@Module({
  imports: [DatabaseModule, PlatformModule, AuthModule, PostingModule],
  controllers: [ExpenseController, BudgetController],
  providers: [ExpenseService, ExpenseCategoryService, BudgetService],
  exports: [ExpenseService, ExpenseCategoryService, BudgetService],
})
export class ExpenseModule {}
