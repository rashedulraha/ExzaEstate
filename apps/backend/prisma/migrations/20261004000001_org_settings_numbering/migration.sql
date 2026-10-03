-- ==============================================================================
-- ExzaEstate Migration 20261004000001: Org Master Data, Settings & Numbering
-- Task A1.1: Company Profile, Branches, Departments, Settings & Numbering Patterns
-- ==============================================================================

-- 1. Alter companies table with profile branding, tax, and soft delete fields
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS logo_url VARCHAR(512),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(64),
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tax_number VARCHAR(64),
  ADD COLUMN IF NOT EXISTS bin_number VARCHAR(64),
  ADD COLUMN IF NOT EXISTS receipt_footer TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Alter branches table with address, contact, and soft delete fields
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(64),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_departments_company_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments (company_id);
CREATE INDEX IF NOT EXISTS idx_departments_branch_id ON departments (branch_id);

-- 4. Create company_settings table
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key VARCHAR(128) NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_company_settings_company_key UNIQUE (company_id, key)
);

CREATE INDEX IF NOT EXISTS idx_company_settings_company_id ON company_settings (company_id);

-- 5. Create numbering_patterns table
CREATE TABLE IF NOT EXISTS numbering_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_type VARCHAR(64) NOT NULL,
  prefix VARCHAR(32) NOT NULL,
  pattern VARCHAR(128) NOT NULL,
  reset_rule VARCHAR(32) NOT NULL DEFAULT 'NEVER',
  current_sequence INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_numbering_patterns_company_type UNIQUE (company_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_numbering_patterns_company_id ON numbering_patterns (company_id);

-- ==============================================================================
-- 6. Row-Level Security Configuration for New Master Data Tables
-- ==============================================================================

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'departments',
    'company_settings',
    'numbering_patterns'
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
