import { ACCOUNT_TYPES } from '@exzaestate/shared';
import {
  DEFAULT_ASSETS_LIAB_ACCOUNTS,
  type DefaultAccountDefinition,
} from './default-coa-assets-liab.data.js';

export type { DefaultAccountDefinition };

const EQUITY_INCOME_EXPENSE_ACCOUNTS: DefaultAccountDefinition[] = [
  // 3000 EQUITY
  {
    code: '3000',
    name: 'Equity',
    type: ACCOUNT_TYPES.EQUITY,
    parentCode: null,
    isGroup: true,
    isSystem: false,
    description: 'Equity group',
  },
  {
    code: '3100',
    name: "Owner's Capital",
    type: ACCOUNT_TYPES.EQUITY,
    parentCode: '3000',
    isGroup: false,
    isSystem: false,
    description: "Owner's equity capital",
  },
  {
    code: '3900',
    name: 'Retained Earnings',
    type: ACCOUNT_TYPES.EQUITY,
    parentCode: '3000',
    isGroup: false,
    isSystem: true,
    description: 'System retained earnings',
  },

  // 4000 INCOME
  {
    code: '4000',
    name: 'Income',
    type: ACCOUNT_TYPES.INCOME,
    parentCode: null,
    isGroup: true,
    isSystem: false,
    description: 'Income group',
  },
  {
    code: '4100',
    name: 'Property Sales Revenue',
    type: ACCOUNT_TYPES.INCOME,
    parentCode: '4000',
    isGroup: false,
    isSystem: true,
    description: 'Property sale revenue',
  },
  {
    code: '4200',
    name: 'Late Fee Income',
    type: ACCOUNT_TYPES.INCOME,
    parentCode: '4000',
    isGroup: false,
    isSystem: true,
    description: 'Late fee charged on overdue payments',
  },
  {
    code: '4300',
    name: 'Cancellation Deduction Income',
    type: ACCOUNT_TYPES.INCOME,
    parentCode: '4000',
    isGroup: false,
    isSystem: true,
    description: 'Forfeited booking fee income on cancellation',
  },
  {
    code: '4900',
    name: 'Other Income',
    type: ACCOUNT_TYPES.INCOME,
    parentCode: '4000',
    isGroup: false,
    isSystem: false,
    description: 'Miscellaneous income',
  },

  // 5000 EXPENSES
  {
    code: '5000',
    name: 'Expenses',
    type: ACCOUNT_TYPES.EXPENSE,
    parentCode: null,
    isGroup: true,
    isSystem: false,
    description: 'Expense group',
  },
  {
    code: '5100',
    name: 'Cost of Land Sold',
    type: ACCOUNT_TYPES.EXPENSE,
    parentCode: '5000',
    isGroup: false,
    isSystem: false,
    description: 'Cost of land sold',
  },
  {
    code: '5200',
    name: 'Development Cost Expense',
    type: ACCOUNT_TYPES.EXPENSE,
    parentCode: '5000',
    isGroup: false,
    isSystem: false,
    description: 'Development cost expense',
  },
  {
    code: '5300',
    name: 'Marketing Expense',
    type: ACCOUNT_TYPES.EXPENSE,
    parentCode: '5000',
    isGroup: false,
    isSystem: false,
    description: 'Marketing and advertising',
  },
  {
    code: '5400',
    name: 'Commission Expense',
    type: ACCOUNT_TYPES.EXPENSE,
    parentCode: '5000',
    isGroup: false,
    isSystem: true,
    description: 'Sales commission expense',
  },
  {
    code: '5500',
    name: 'Administrative Expense',
    type: ACCOUNT_TYPES.EXPENSE,
    parentCode: '5000',
    isGroup: false,
    isSystem: false,
    description: 'General administration',
  },
  {
    code: '5600',
    name: 'Maintenance Expense',
    type: ACCOUNT_TYPES.EXPENSE,
    parentCode: '5000',
    isGroup: false,
    isSystem: false,
    description: 'Property maintenance expense',
  },
  {
    code: '5900',
    name: 'Discounts Allowed',
    type: ACCOUNT_TYPES.EXPENSE,
    parentCode: '5000',
    isGroup: false,
    isSystem: true,
    description: 'Approved customer discounts',
  },
];

export const DEFAULT_CHART_OF_ACCOUNTS: DefaultAccountDefinition[] = [
  ...DEFAULT_ASSETS_LIAB_ACCOUNTS,
  ...EQUITY_INCOME_EXPENSE_ACCOUNTS,
];
