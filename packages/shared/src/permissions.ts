/**
 * permissions.ts — ExzaEstate System Permissions Catalog
 * Defined in permissions-matrix.md §1/§3 and architecture.md §4.1, §4.4
 */

export const PERMISSIONS = {
  // Platform / System Realm (Super Admin)
  TENANT_ONBOARD: 'tenant:onboard',
  TENANT_SUSPEND: 'tenant:suspend',
  LICENSE_GENERATE: 'license:generate',
  LICENSE_VERIFY: 'license:verify',
  PLATFORM_HEALTH: 'platform:health',
  AUDIT_VIEW_SYSTEM: 'audit:view-system',

  // Administration & Security
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_EDIT: 'user:edit',
  USER_DELETE: 'user:delete',
  USER_MANAGE: 'user:manage',

  ROLE_VIEW: 'role:view',
  ROLE_CREATE: 'role:create',
  ROLE_EDIT: 'role:edit',
  ROLE_DELETE: 'role:delete',
  ROLE_MANAGE: 'role:manage',

  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',
  SETTINGS_MANAGE: 'settings:manage',

  AUDIT_VIEW: 'audit:view',
  AUDIT_VIEW_SENSITIVE: 'audit:view-sensitive',
  AUDIT_EXPORT: 'audit:export',

  APPROVAL_OVERRIDE: 'approval:override',

  // Organization Master Data
  COMPANY_VIEW: 'company:view',
  COMPANY_CREATE: 'company:create',
  COMPANY_EDIT: 'company:edit',
  COMPANY_DELETE: 'company:delete',

  BRANCH_VIEW: 'branch:view',
  BRANCH_CREATE: 'branch:create',
  BRANCH_EDIT: 'branch:edit',
  BRANCH_DELETE: 'branch:delete',

  DEPARTMENT_VIEW: 'department:view',
  DEPARTMENT_CREATE: 'department:create',
  DEPARTMENT_EDIT: 'department:edit',
  DEPARTMENT_DELETE: 'department:delete',

  NUMBERING_VIEW: 'numbering:view',
  NUMBERING_EDIT: 'numbering:edit',
  NUMBERING_MANAGE: 'numbering:manage',

  APPROVAL_RULE_VIEW: 'approval-rule:view',
  APPROVAL_RULE_MANAGE: 'approval-rule:manage',

  // Property & Land Master Data
  LAND_VIEW: 'land:view',
  LAND_CREATE: 'land:create',
  LAND_EDIT: 'land:edit',
  LAND_DELETE: 'land:delete',

  PROJECT_VIEW: 'project:view',
  PROJECT_CREATE: 'project:create',
  PROJECT_EDIT: 'project:edit',
  PROJECT_DELETE: 'project:delete',

  PROPERTY_VIEW: 'property:view',
  PROPERTY_CREATE: 'property:create',
  PROPERTY_EDIT: 'property:edit',
  PROPERTY_DELETE: 'property:delete',
  PROPERTY_OVERRIDE_STATUS: 'property:override-status',

  // CRM, Leads, Follow-ups, Customers
  LEAD_VIEW: 'lead:view',
  LEAD_CREATE: 'lead:create',
  LEAD_EDIT: 'lead:edit',
  LEAD_DELETE: 'lead:delete',

  FOLLOW_UP_VIEW: 'follow-up:view',
  FOLLOW_UP_CREATE: 'follow-up:create',
  FOLLOW_UP_EDIT: 'follow-up:edit',

  CUSTOMER_VIEW: 'customer:view',
  CUSTOMER_CREATE: 'customer:create',
  CUSTOMER_EDIT: 'customer:edit',
  CUSTOMER_DELETE: 'customer:delete',

  // Sales & Bookings
  QUOTATION_VIEW: 'quotation:view',
  QUOTATION_CREATE: 'quotation:create',
  QUOTATION_EDIT: 'quotation:edit',
  QUOTATION_APPROVE: 'quotation:approve',
  QUOTATION_REJECT: 'quotation:reject',

  DISCOUNT_APPROVE_TIER1: 'discount:approve-tier1',
  DISCOUNT_APPROVE_TIER2: 'discount:approve-tier2',
  DISCOUNT_APPROVE_TIER3: 'discount:approve-tier3',

  BOOKING_VIEW: 'booking:view',
  BOOKING_CREATE: 'booking:create',
  BOOKING_EDIT: 'booking:edit',
  BOOKING_CANCEL: 'booking:cancel',
  BOOKING_APPROVE: 'booking:approve',
  BOOKING_REJECT: 'booking:reject',

  AGREEMENT_VIEW: 'agreement:view',
  AGREEMENT_CREATE: 'agreement:create',
  AGREEMENT_EDIT: 'agreement:edit',
  AGREEMENT_SIGN: 'agreement:sign',

  CANCELLATION_VIEW: 'cancellation:view',
  CANCELLATION_CREATE: 'cancellation:create',
  CANCELLATION_APPROVE: 'cancellation:approve',
  CANCELLATION_REJECT: 'cancellation:reject',

  REFUND_VIEW: 'refund:view',
  REFUND_CREATE: 'refund:create',
  REFUND_APPROVE: 'refund:approve',
  REFUND_REJECT: 'refund:reject',

  // Collection, Payments & Receipts
  INSTALLMENT_VIEW: 'installment:view',
  INSTALLMENT_CREATE: 'installment:create',
  INSTALLMENT_EDIT: 'installment:edit',

  PAYMENT_VIEW: 'payment:view',
  PAYMENT_CREATE: 'payment:create',
  PAYMENT_CREATE_DRAFT: 'payment:create-draft',
  PAYMENT_EDIT: 'payment:edit',
  PAYMENT_POST: 'payment:post',
  PAYMENT_REFUND: 'payment:refund',
  PAYMENT_REVERSE: 'payment:reverse',
  PAYMENT_CANCEL: 'payment:cancel',

  RECEIPT_VIEW: 'receipt:view',
  RECEIPT_PRINT: 'receipt:print',

  STATEMENT_VIEW: 'statement:view',
  STATEMENT_EXPORT: 'statement:export',
  STATEMENT_PRINT: 'statement:print',

  // Accounting Core
  COA_VIEW: 'coa:view',
  COA_CREATE: 'coa:create',
  COA_EDIT: 'coa:edit',

  JOURNAL_VIEW: 'journal:view',
  JOURNAL_CREATE: 'journal:create',
  JOURNAL_EDIT: 'journal:edit',
  JOURNAL_REVIEW: 'journal:review',
  JOURNAL_POST: 'journal:post',
  JOURNAL_REVERSE: 'journal:reverse',
  JOURNAL_APPROVE: 'journal:approve',
  JOURNAL_REJECT: 'journal:reject',

  LEDGER_VIEW: 'ledger:view',
  LEDGER_EXPORT: 'ledger:export',
  LEDGER_PRINT: 'ledger:print',

  TRIAL_BALANCE_VIEW: 'trial-balance:view',
  TRIAL_BALANCE_EXPORT: 'trial-balance:export',
  TRIAL_BALANCE_PRINT: 'trial-balance:print',

  ARAP_VIEW: 'arap:view',
  ARAP_EXPORT: 'arap:export',
  ARAP_PRINT: 'arap:print',

  PERIOD_VIEW: 'period:view',
  PERIOD_CLOSE: 'period:close',
  PERIOD_REOPEN: 'period:reopen',

  CASHBANK_VIEW: 'cashbank:view',
  CASHBANK_CREATE: 'cashbank:create',
  CASHBANK_EDIT: 'cashbank:edit',

  // Operations: Expenses, Procurement, Development, Assets, Maintenance, Commission
  EXPENSE_VIEW: 'expense:view',
  EXPENSE_CREATE: 'expense:create',
  EXPENSE_EDIT: 'expense:edit',
  EXPENSE_SUBMIT: 'expense:submit',
  EXPENSE_VERIFY: 'expense:verify',
  EXPENSE_APPROVE: 'expense:approve',
  EXPENSE_REJECT: 'expense:reject',
  EXPENSE_PAY: 'expense:pay',

  BUDGET_VIEW: 'budget:view',
  BUDGET_CREATE: 'budget:create',
  BUDGET_EDIT: 'budget:edit',

  VENDOR_VIEW: 'vendor:view',
  VENDOR_CREATE: 'vendor:create',
  VENDOR_EDIT: 'vendor:edit',
  VENDOR_DELETE: 'vendor:delete',

  VENDOR_BILL_VIEW: 'vendor-bill:view',
  VENDOR_BILL_CREATE: 'vendor-bill:create',
  VENDOR_BILL_EDIT: 'vendor-bill:edit',

  PROCUREMENT_VIEW: 'procurement:view',
  PROCUREMENT_CREATE: 'procurement:create',
  PROCUREMENT_EDIT: 'procurement:edit',
  PROCUREMENT_APPROVE: 'procurement:approve',
  PROCUREMENT_REJECT: 'procurement:reject',

  DEVELOPMENT_VIEW: 'development:view',
  DEVELOPMENT_CREATE: 'development:create',
  DEVELOPMENT_EDIT: 'development:edit',

  SITE_TASK_VIEW: 'site-task:view',
  SITE_TASK_CREATE: 'site-task:create',
  SITE_TASK_EDIT: 'site-task:edit',

  MAINTENANCE_VIEW: 'maintenance:view',
  MAINTENANCE_CREATE: 'maintenance:create',
  MAINTENANCE_EDIT: 'maintenance:edit',
  MAINTENANCE_APPROVE: 'maintenance:approve',
  MAINTENANCE_REJECT: 'maintenance:reject',

  ASSET_VIEW: 'asset:view',
  ASSET_CREATE: 'asset:create',
  ASSET_EDIT: 'asset:edit',
  ASSET_DELETE: 'asset:delete',

  EMPLOYEE_VIEW: 'employee:view',
  EMPLOYEE_CREATE: 'employee:create',
  EMPLOYEE_EDIT: 'employee:edit',
  EMPLOYEE_DELETE: 'employee:delete',

  COMMISSION_VIEW: 'commission:view',
  COMMISSION_CREATE: 'commission:create',
  COMMISSION_APPROVE: 'commission:approve',
  COMMISSION_PAY: 'commission:pay',

  // Documents, Reporting, Dashboard, Notifications, Search
  DOCUMENT_VIEW: 'document:view',
  DOCUMENT_CREATE: 'document:create',
  DOCUMENT_DELETE: 'document:delete',

  REPORT_VIEW: 'report:view',
  REPORT_EXPORT: 'report:export',
  REPORT_PRINT: 'report:print',

  DASHBOARD_VIEW: 'dashboard:view',

  NOTIFICATION_VIEW: 'notification:view',

  SEARCH_VIEW: 'search:view',

  LICENSE_VIEW: 'license:view',
  LICENSE_MANAGE: 'license:manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Mandatory 2FA permissions list from architecture.md §4.1:
 * TOTP two-factor authentication is mandatory for any user holding any of these permissions.
 */
export const MANDATORY_2FA_PERMISSIONS: readonly Permission[] = [
  PERMISSIONS.JOURNAL_POST,
  PERMISSIONS.PAYMENT_REFUND,
  PERMISSIONS.PAYMENT_REVERSE,
  PERMISSIONS.PERIOD_CLOSE,
  PERMISSIONS.PERIOD_REOPEN,
  PERMISSIONS.AUDIT_VIEW,
  PERMISSIONS.USER_MANAGE,
  PERMISSIONS.ROLE_MANAGE,
  PERMISSIONS.SETTINGS_MANAGE,
  PERMISSIONS.APPROVAL_OVERRIDE,
] as const;

export const DATA_SCOPES = {
  OWN: 'OWN',
  TEAM: 'TEAM',
  BRANCH: 'BRANCH',
  ALL: 'ALL',
} as const;

export type DataScope = (typeof DATA_SCOPES)[keyof typeof DATA_SCOPES];
