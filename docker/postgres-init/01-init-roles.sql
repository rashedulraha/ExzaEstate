-- ==============================================================================
-- ExzaEstate PostgreSQL 18 Initialization: Roles and Privileges
-- ==============================================================================

DO $$
BEGIN
  -- 1. exza_migrator (Owner / DDL role, runs migrations only)
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'exza_migrator') THEN
    CREATE ROLE exza_migrator WITH LOGIN SUPERUSER PASSWORD 'exza_migrator_secret';
  END IF;

  -- 2. exza_app (Application runtime role, NOBYPASSRLS, DML only, RLS enforced)
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'exza_app') THEN
    CREATE ROLE exza_app WITH LOGIN NOBYPASSRLS PASSWORD 'exza_app_secret';
  END IF;

  -- 3. exza_worker (Background worker / outbox dispatcher, NOBYPASSRLS)
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'exza_worker') THEN
    CREATE ROLE exza_worker WITH LOGIN NOBYPASSRLS PASSWORD 'exza_worker_secret';
  END IF;

  -- 4. exza_system (Cross-tenant platform operations, SystemPrisma)
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'exza_system') THEN
    CREATE ROLE exza_system WITH LOGIN SUPERUSER PASSWORD 'exza_system_secret';
  END IF;
END $$;

-- Database privileges
GRANT CONNECT ON DATABASE exzaestate TO exza_migrator, exza_app, exza_worker, exza_system;

-- Schema privileges
GRANT ALL ON SCHEMA public TO exza_migrator;
GRANT USAGE, CREATE ON SCHEMA public TO exza_app, exza_worker, exza_system;

-- Default table and sequence privileges for runtime roles
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO exza_app, exza_worker, exza_system;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO exza_app, exza_worker, exza_system;
