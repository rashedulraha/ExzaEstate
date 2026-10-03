import { describe, it, expect } from 'vitest';
import { PERMISSIONS, MANDATORY_2FA_PERMISSIONS, DATA_SCOPES } from './permissions.js';

describe('Permissions Catalog & Matrices', () => {
  it('contains all mandatory 2FA permissions from architecture.md §4.1', () => {
    const expectedMandatory2FA = [
      'journal:post',
      'payment:refund',
      'payment:reverse',
      'period:close',
      'period:reopen',
      'audit:view',
      'user:manage',
      'role:manage',
      'settings:manage',
      'approval:override',
    ];

    for (const perm of expectedMandatory2FA) {
      expect(MANDATORY_2FA_PERMISSIONS).toContain(perm);
    }
    expect(MANDATORY_2FA_PERMISSIONS.length).toBe(expectedMandatory2FA.length);
  });

  it('contains all core roles permissions from permissions-matrix.md §1 & §3', () => {
    const requiredPermissions = [
      // Platform / Super Admin
      'tenant:onboard',
      'tenant:suspend',
      'license:generate',
      'license:verify',
      'platform:health',
      'audit:view-system',

      // Administration & Organization
      'user:manage',
      'role:manage',
      'settings:manage',
      'audit:view',
      'approval:override',
      'company:view',
      'company:create',
      'company:edit',
      'company:delete',
      'branch:view',
      'branch:create',
      'branch:edit',
      'branch:delete',
      'department:view',
      'department:create',
      'department:edit',
      'department:delete',
      'numbering:manage',
      'approval-rule:manage',

      // Discounts
      'discount:approve-tier1',
      'discount:approve-tier2',
      'discount:approve-tier3',

      // Approvals / Rejections
      'booking:approve',
      'booking:reject',
      'cancellation:approve',
      'cancellation:reject',
      'refund:approve',
      'refund:reject',
      'expense:approve',
      'expense:reject',
      'procurement:approve',
      'procurement:reject',
      'journal:approve',
      'journal:reject',

      // Finance & Accounts
      'payment:create-draft',
      'payment:post',
      'payment:refund',
      'payment:reverse',
      'receipt:view',
      'receipt:print',
      'statement:view',
      'statement:export',
      'statement:print',
      'ledger:view',
      'ledger:export',
      'ledger:print',
      'trial-balance:view',
      'trial-balance:export',
      'trial-balance:print',
      'arap:view',
      'arap:export',
      'arap:print',
      'journal:review',
      'journal:post',
      'period:close',
      'period:reopen',
      'expense:verify',
      'cashbank:view',
      'cashbank:create',
      'cashbank:edit',
      'vendor:view',
      'vendor-bill:view',
      'vendor-bill:create',

      // CRM, Leads, Follow-ups, Properties
      'lead:view',
      'lead:create',
      'lead:edit',
      'follow-up:view',
      'follow-up:create',
      'follow-up:edit',
      'customer:view',
      'customer:create',
      'customer:edit',
      'quotation:view',
      'quotation:create',
      'quotation:approve',
      'booking:view',
      'booking:create',
      'property:view',
      'property:override-status',
      'site-task:view',
      'site-task:create',
      'agreement:create',
      'agreement:view',

      // Reports & Dashboard
      'report:view',
      'report:export',
      'report:print',
      'dashboard:view',
    ];

    const values = Object.values(PERMISSIONS);
    for (const required of requiredPermissions) {
      expect(values).toContain(required);
    }
  });

  it('defines all four data scopes', () => {
    expect(DATA_SCOPES).toEqual({
      OWN: 'OWN',
      TEAM: 'TEAM',
      BRANCH: 'BRANCH',
      ALL: 'ALL',
    });
  });
});
