-- ==============================================================================
-- ExzaEstate Migration 20261003000003: RBAC, Data Scopes, Permissions & 2FA
-- ==============================================================================

-- 1. Create global system_permissions table (ARCH-GLOBAL-DATA)
CREATE TABLE IF NOT EXISTS system_permissions (
  code VARCHAR(64) PRIMARY KEY,
  module VARCHAR(64) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grant SELECT only to exza_app and exza_system
GRANT SELECT ON system_permissions TO exza_app, exza_system;

-- Populate system_permissions catalogue from PERMISSIONS
INSERT INTO system_permissions (code, module, description) VALUES
  ('tenant:onboard', 'platform', 'Onboard new tenant company'),
  ('tenant:suspend', 'platform', 'Suspend tenant company'),
  ('license:generate', 'platform', 'Generate offline license key'),
  ('license:verify', 'platform', 'Verify offline license cryptographic signature'),
  ('platform:health', 'platform', 'View platform health metrics'),
  ('audit:view-system', 'platform', 'View system-wide audit logs'),
  ('user:view', 'user', 'View company users'),
  ('user:create', 'user', 'Invite/create user'),
  ('user:edit', 'user', 'Edit user profile'),
  ('user:delete', 'user', 'Deactivate user'),
  ('user:manage', 'user', 'Full user administration & lockout release'),
  ('role:view', 'role', 'View roles'),
  ('role:create', 'role', 'Create custom role'),
  ('role:edit', 'role', 'Edit role permissions'),
  ('role:delete', 'role', 'Delete custom role'),
  ('role:manage', 'role', 'Manage system & company roles'),
  ('settings:view', 'settings', 'View company settings'),
  ('settings:edit', 'settings', 'Edit company settings'),
  ('settings:manage', 'settings', 'Manage critical system configurations'),
  ('audit:view', 'audit', 'View audit logs'),
  ('audit:view-sensitive', 'audit', 'View sensitive audit log payloads'),
  ('approval:override', 'approval', 'Joint approval override'),
  ('company:view', 'company', 'View company details'),
  ('company:create', 'company', 'Create company profile'),
  ('company:edit', 'company', 'Edit company settings'),
  ('company:delete', 'company', 'Archive company'),
  ('branch:view', 'branch', 'View branches'),
  ('branch:create', 'branch', 'Create new branch'),
  ('branch:edit', 'branch', 'Edit branch'),
  ('branch:delete', 'branch', 'Delete branch'),
  ('department:view', 'department', 'View departments'),
  ('department:create', 'department', 'Create department'),
  ('department:edit', 'department', 'Edit department'),
  ('department:delete', 'department', 'Delete department'),
  ('numbering:view', 'numbering', 'View document numbering patterns'),
  ('numbering:edit', 'numbering', 'Edit document numbering patterns'),
  ('numbering:manage', 'numbering', 'Manage numbering sequences'),
  ('approval-rule:view', 'approval-rule', 'View approval workflow rules'),
  ('approval-rule:manage', 'approval-rule', 'Manage approval workflow matrices'),
  ('land:view', 'land', 'View land banks'),
  ('land:create', 'land', 'Add land master record'),
  ('land:edit', 'land', 'Edit land master record'),
  ('land:delete', 'land', 'Delete land record'),
  ('project:view', 'project', 'View projects'),
  ('project:create', 'project', 'Create real estate project'),
  ('project:edit', 'project', 'Edit project details'),
  ('project:delete', 'project', 'Archive project'),
  ('property:view', 'property', 'View property inventory'),
  ('property:create', 'property', 'Create property unit'),
  ('property:edit', 'property', 'Edit property specifications'),
  ('property:delete', 'property', 'Delete property unit'),
  ('property:override-status', 'property', 'Override locked property status'),
  ('lead:view', 'lead', 'View CRM leads'),
  ('lead:create', 'lead', 'Create CRM lead'),
  ('lead:edit', 'lead', 'Edit lead information'),
  ('lead:delete', 'lead', 'Delete lead'),
  ('follow-up:view', 'follow-up', 'View follow-up notes'),
  ('follow-up:create', 'follow-up', 'Create follow-up activity'),
  ('follow-up:edit', 'follow-up', 'Edit follow-up activity'),
  ('customer:view', 'customer', 'View customer records'),
  ('customer:create', 'customer', 'Create customer record'),
  ('customer:edit', 'customer', 'Edit customer record'),
  ('customer:delete', 'customer', 'Delete customer record'),
  ('quotation:view', 'quotation', 'View quotations'),
  ('quotation:create', 'quotation', 'Create quotation'),
  ('quotation:edit', 'quotation', 'Edit quotation'),
  ('quotation:approve', 'quotation', 'Approve quotation'),
  ('quotation:reject', 'quotation', 'Reject quotation'),
  ('discount:approve-tier1', 'discount', 'Approve discount tier 1 (0-2%)'),
  ('discount:approve-tier2', 'discount', 'Approve discount tier 2 (2-5%)'),
  ('discount:approve-tier3', 'discount', 'Approve discount tier 3 (>5%)'),
  ('booking:view', 'booking', 'View bookings'),
  ('booking:create', 'booking', 'Create booking reservation'),
  ('booking:edit', 'booking', 'Edit booking details'),
  ('booking:cancel', 'booking', 'Cancel booking'),
  ('booking:approve', 'booking', 'Approve booking'),
  ('booking:reject', 'booking', 'Reject booking'),
  ('agreement:view', 'agreement', 'View sales agreements'),
  ('agreement:create', 'agreement', 'Draft sales agreement'),
  ('agreement:edit', 'agreement', 'Edit sales agreement'),
  ('agreement:sign', 'agreement', 'Sign sales agreement'),
  ('cancellation:view', 'cancellation', 'View cancellations'),
  ('cancellation:create', 'cancellation', 'Request booking cancellation'),
  ('cancellation:approve', 'cancellation', 'Approve booking cancellation'),
  ('cancellation:reject', 'cancellation', 'Reject booking cancellation'),
  ('refund:view', 'refund', 'View refund requests'),
  ('refund:create', 'refund', 'Submit refund request'),
  ('refund:approve', 'refund', 'Approve refund request'),
  ('refund:reject', 'refund', 'Reject refund request'),
  ('installment:view', 'installment', 'View installment schedule'),
  ('installment:create', 'installment', 'Generate installment plan'),
  ('installment:edit', 'installment', 'Reschedule installment plan'),
  ('payment:view', 'payment', 'View payments'),
  ('payment:create', 'payment', 'Record payment receipt'),
  ('payment:create-draft', 'payment', 'Draft payment collection request'),
  ('payment:edit', 'payment', 'Edit draft payment receipt'),
  ('payment:post', 'payment', 'Post payment to ledger (irreversible)'),
  ('payment:refund', 'payment', 'Issue payment refund'),
  ('payment:reverse', 'payment', 'Reverse posted payment entry'),
  ('payment:cancel', 'payment', 'Cancel draft payment'),
  ('receipt:view', 'receipt', 'View payment receipts'),
  ('receipt:print', 'receipt', 'Print official receipt money receipt'),
  ('statement:view', 'statement', 'View customer statements'),
  ('statement:export', 'statement', 'Export customer statements'),
  ('statement:print', 'statement', 'Print customer statements'),
  ('coa:view', 'coa', 'View Chart of Accounts'),
  ('coa:create', 'coa', 'Create COA account ledger'),
  ('coa:edit', 'coa', 'Edit COA account parameters'),
  ('journal:view', 'journal', 'View journal entries'),
  ('journal:create', 'journal', 'Draft journal entry'),
  ('journal:edit', 'journal', 'Edit draft journal entry'),
  ('journal:review', 'journal', 'Review unposted journal entry'),
  ('journal:post', 'journal', 'Post journal to general ledger'),
  ('journal:reverse', 'journal', 'Post reversing journal entry'),
  ('journal:approve', 'journal', 'Approve journal entry'),
  ('journal:reject', 'journal', 'Reject journal entry'),
  ('ledger:view', 'ledger', 'View general and subsidiary ledgers'),
  ('ledger:export', 'ledger', 'Export general ledger'),
  ('ledger:print', 'ledger', 'Print general ledger'),
  ('trial-balance:view', 'trial-balance', 'View trial balance statement'),
  ('trial-balance:export', 'trial-balance', 'Export trial balance statement'),
  ('trial-balance:print', 'trial-balance', 'Print trial balance statement'),
  ('arap:view', 'arap', 'View accounts receivable and payable reports'),
  ('arap:export', 'arap', 'Export AR/AP aging schedules'),
  ('arap:print', 'arap', 'Print AR/AP aging schedules'),
  ('period:view', 'period', 'View accounting periods'),
  ('period:close', 'period', 'Close accounting fiscal period'),
  ('period:reopen', 'period', 'Reopen closed accounting period'),
  ('cashbank:view', 'cashbank', 'View cash and bank balances'),
  ('cashbank:create', 'cashbank', 'Add cash/bank transit record'),
  ('cashbank:edit', 'cashbank', 'Edit bank account configuration'),
  ('expense:view', 'expense', 'View operational expenses'),
  ('expense:create', 'expense', 'Submit expense claim'),
  ('expense:edit', 'expense', 'Edit draft expense claim'),
  ('expense:submit', 'expense', 'Submit expense for verification'),
  ('expense:verify', 'expense', 'Verify expense vouchers'),
  ('expense:approve', 'expense', 'Approve expense payment'),
  ('expense:reject', 'expense', 'Reject expense payment'),
  ('expense:pay', 'expense', 'Disburse expense payment'),
  ('budget:view', 'budget', 'View project budgets'),
  ('budget:create', 'budget', 'Create cost centre budget'),
  ('budget:edit', 'budget', 'Revise cost centre budget'),
  ('vendor:view', 'vendor', 'View vendors and contractors'),
  ('vendor:create', 'vendor', 'Add vendor master record'),
  ('vendor:edit', 'vendor', 'Edit vendor master record'),
  ('vendor:delete', 'vendor', 'Delete vendor record'),
  ('vendor-bill:view', 'vendor-bill', 'View vendor bills'),
  ('vendor-bill:create', 'vendor-bill', 'Enter vendor bill'),
  ('vendor-bill:edit', 'vendor-bill', 'Edit vendor bill'),
  ('procurement:view', 'procurement', 'View purchase orders'),
  ('procurement:create', 'procurement', 'Create purchase requisition'),
  ('procurement:edit', 'procurement', 'Edit purchase requisition'),
  ('procurement:approve', 'procurement', 'Approve purchase requisition'),
  ('procurement:reject', 'procurement', 'Reject purchase requisition'),
  ('development:view', 'development', 'View construction progress'),
  ('development:create', 'development', 'Create project work schedule'),
  ('development:edit', 'development', 'Update project work schedule'),
  ('site-task:view', 'site-task', 'View site tasks'),
  ('site-task:create', 'site-task', 'Create site task'),
  ('site-task:edit', 'site-task', 'Edit site task'),
  ('maintenance:view', 'maintenance', 'View facility maintenance requests'),
  ('maintenance:create', 'maintenance', 'Create maintenance work ticket'),
  ('maintenance:edit', 'maintenance', 'Update maintenance work ticket'),
  ('maintenance:approve', 'maintenance', 'Approve maintenance work ticket'),
  ('maintenance:reject', 'maintenance', 'Reject maintenance work ticket'),
  ('asset:view', 'asset', 'View fixed asset register'),
  ('asset:create', 'asset', 'Register fixed asset'),
  ('asset:edit', 'asset', 'Edit fixed asset record'),
  ('asset:delete', 'asset', 'Retire fixed asset'),
  ('employee:view', 'employee', 'View employee directory'),
  ('employee:create', 'employee', 'Create employee profile'),
  ('employee:edit', 'employee', 'Edit employee profile'),
  ('employee:delete', 'employee', 'Archive employee profile'),
  ('commission:view', 'commission', 'View sales commission statements'),
  ('commission:create', 'commission', 'Calculate commission disbursement'),
  ('commission:approve', 'commission', 'Approve commission payment'),
  ('commission:pay', 'commission', 'Pay sales commission'),
  ('document:view', 'document', 'View archived documents'),
  ('document:create', 'document', 'Upload signed documents'),
  ('document:delete', 'document', 'Delete uploaded documents'),
  ('report:view', 'report', 'View analytics & BI reports'),
  ('report:export', 'report', 'Export BI data'),
  ('report:print', 'report', 'Print formatted PDF reports'),
  ('dashboard:view', 'dashboard', 'View company KPI dashboards'),
  ('notification:view', 'notification', 'View notifications feed'),
  ('search:view', 'search', 'Execute global search'),
  ('license:view', 'license', 'View software license status'),
  ('license:manage', 'license', 'Manage software license activation')
ON CONFLICT (code) DO NOTHING;

-- 2. Alter users table for 2FA recovery codes & enrollment timestamp
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_recovery_codes text[] NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enrolled_at TIMESTAMPTZ;

-- 3. Create roles table (tenant-scoped)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  code VARCHAR(64) NOT NULL,
  description VARCHAR(255),
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_roles_company_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_roles_company_id ON roles (company_id);

-- 4. Create role_permissions table (tenant-scoped)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_code VARCHAR(64) NOT NULL REFERENCES system_permissions(code) ON DELETE CASCADE,
  scope VARCHAR(16),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_role_permissions_role_perm UNIQUE (company_id, role_id, permission_code)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_company_id ON role_permissions (company_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions (role_id);

-- 5. Create user_roles table (tenant-scoped)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_roles_user_role UNIQUE (company_id, user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON user_roles (company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles (role_id);

-- 6. Create user_branches table (tenant-scoped)
CREATE TABLE IF NOT EXISTS user_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_branches_user_branch UNIQUE (company_id, user_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_user_branches_company_id ON user_branches (company_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_user_id ON user_branches (user_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_branch_id ON user_branches (branch_id);

-- ==============================================================================
-- 7. Row-Level Security Configuration for Tenant RBAC Tables
-- ==============================================================================

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'roles',
    'role_permissions',
    'user_roles',
    'user_branches'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_policy ON %I
       FOR ALL
       TO exza_app
       USING (company_id = NULLIF(current_setting(''app.current_company_id'', true), '''')::uuid)
       WITH CHECK (company_id = NULLIF(current_setting(''app.current_company_id'', true), '''')::uuid);',
      tbl
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO exza_app, exza_system;', tbl);
  END LOOP;
END $$;
