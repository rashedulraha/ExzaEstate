-- Multi-Tenancy & RLS Foundation Migration
-- 1. Ensure DB Roles exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'exza_migrator') THEN
    CREATE ROLE exza_migrator WITH LOGIN PASSWORD 'exza_migrator_secret' SUPERUSER;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'exza_app') THEN
    CREATE ROLE exza_app WITH LOGIN PASSWORD 'exza_app_secret' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  ELSE
    ALTER ROLE exza_app WITH NOBYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'exza_worker') THEN
    CREATE ROLE exza_worker WITH LOGIN PASSWORD 'exza_worker_secret' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  ELSE
    ALTER ROLE exza_worker WITH NOBYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'exza_system') THEN
    CREATE ROLE exza_system WITH LOGIN PASSWORD 'exza_system_secret' NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE;
  ELSE
    ALTER ROLE exza_system WITH BYPASSRLS;
  END IF;
END $$;

-- 2. Schema Permissions
GRANT USAGE, CREATE ON SCHEMA public TO exza_migrator;
GRANT USAGE ON SCHEMA public TO exza_app, exza_worker, exza_system;

-- 3. Default Privileges for Tables & Sequences created by exza_migrator
ALTER DEFAULT PRIVILEGES FOR ROLE exza_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO exza_app;

ALTER DEFAULT PRIVILEGES FOR ROLE exza_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO exza_system;

ALTER DEFAULT PRIVILEGES FOR ROLE exza_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO exza_app, exza_worker, exza_system;

-- 4. Test Tenant Table with FORCE ROW LEVEL SECURITY
CREATE TABLE IF NOT EXISTS tenant_test_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Enforcement
ALTER TABLE tenant_test_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_test_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON tenant_test_records;
CREATE POLICY tenant_isolation_policy ON tenant_test_records
  AS PERMISSIVE
  FOR ALL
  TO PUBLIC
  USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- 5. Test Global Reference Table
CREATE TABLE IF NOT EXISTS global_test_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Permissions on existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_test_records TO exza_app, exza_system;
GRANT SELECT ON global_test_records TO exza_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON global_test_records TO exza_system;
