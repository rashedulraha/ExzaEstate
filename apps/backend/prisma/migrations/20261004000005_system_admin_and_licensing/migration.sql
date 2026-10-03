-- ==============================================================================
-- ExzaEstate Migration 20261004000005: System Admin, System Realm & Licensing
-- ==============================================================================

-- 1. Create system_admins table (Global system realm, no RLS)
CREATE TABLE IF NOT EXISTS system_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  is_two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  two_factor_secret TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create system_sessions table
CREATE TABLE IF NOT EXISTS system_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES system_admins(id) ON DELETE CASCADE,
  family_id UUID NOT NULL,
  ip_address VARCHAR(64),
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_sessions_admin_id ON system_sessions(admin_id);

-- 3. Create licenses table (Tenant-scoped, with RLS)
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  license_key VARCHAR(255) NOT NULL UNIQUE,
  signature TEXT NOT NULL,
  kid VARCHAR(64) NOT NULL,
  machine_id VARCHAR(255),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NOT NULL,
  grace_days INTEGER NOT NULL DEFAULT 15,
  max_seats INTEGER NOT NULL DEFAULT 10,
  max_branches INTEGER NOT NULL DEFAULT 1,
  max_projects INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_licenses_company_license_key UNIQUE (company_id, license_key)
);

CREATE INDEX IF NOT EXISTS idx_licenses_company_id ON licenses(company_id);
CREATE INDEX IF NOT EXISTS idx_licenses_company_id_status ON licenses(company_id, status);

-- 4. Create license_transfers table (Tenant-scoped, with RLS)
CREATE TABLE IF NOT EXISTS license_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  previous_machine_id VARCHAR(255) NOT NULL,
  new_machine_id VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_license_transfers_company_id ON license_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_license_transfers_license_id ON license_transfers(license_id);

-- 5. Row-Level Security for licenses and license_transfers
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON licenses;
CREATE POLICY tenant_isolation_policy ON licenses
  FOR ALL
  TO exza_app
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE license_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_transfers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON license_transfers;
CREATE POLICY tenant_isolation_policy ON license_transfers
  FOR ALL
  TO exza_app
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

-- 6. Role Grants
-- System realm tables are granted ONLY to exza_system (and migrator), never exza_app
GRANT SELECT, INSERT, UPDATE, DELETE ON system_admins TO exza_system;
GRANT SELECT, INSERT, UPDATE, DELETE ON system_sessions TO exza_system;

-- Tenant tables are granted to exza_app and exza_system
GRANT SELECT, INSERT, UPDATE, DELETE ON licenses TO exza_app, exza_system;
GRANT SELECT, INSERT, UPDATE, DELETE ON license_transfers TO exza_app, exza_system;
