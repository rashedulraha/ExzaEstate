-- ==============================================================================
-- ExzaEstate Migration 20261003000002: Auth, Companies, Sessions & Pre-Tenant Functions
-- ==============================================================================

-- 1. Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) NOT NULL UNIQUE,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Dhaka',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_company_id ON companies (company_id);

-- 2. Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) NOT NULL,
  is_head_office BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_branches_company_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_branches_company_id ON branches (company_id);

-- 3. Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(32),
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  is_two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  two_factor_secret VARCHAR(255),
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users (company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- 4. Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL,
  user_agent VARCHAR(512),
  ip_address VARCHAR(64),
  revoked_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  step_up_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_company_id ON sessions (company_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_family_id ON sessions (family_id);

-- 5. Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  family_id UUID NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  replaced_by_id UUID,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  user_agent VARCHAR(512),
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_company_id ON refresh_tokens (company_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session_id ON refresh_tokens (session_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id ON refresh_tokens (family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);

-- 6. Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  role_id VARCHAR(64),
  invited_by_id UUID,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON invitations (company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON invitations (token_hash);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations (email);

-- 7. Create password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_company_id ON password_resets (company_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets (token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets (user_id);

-- ==============================================================================
-- 8. Row-Level Security Configuration
-- ==============================================================================

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'companies',
    'branches',
    'users',
    'sessions',
    'refresh_tokens',
    'invitations',
    'password_resets'
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

-- ==============================================================================
-- 9. SECURITY DEFINER SQL Functions for Pre-Tenant Auth Lookups (ARCH-AUTH-LOOKUP)
-- ==============================================================================

-- 9.1 auth_find_user_by_email
CREATE OR REPLACE FUNCTION auth_find_user_by_email(p_email text)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  email varchar,
  password_hash varchar,
  status varchar,
  failed_login_attempts int,
  locked_until timestamptz,
  is_two_factor_enabled boolean,
  full_name varchar
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT
    users.id,
    users.company_id,
    users.email,
    users.password_hash,
    users.status,
    users.failed_login_attempts,
    users.locked_until,
    users.is_two_factor_enabled,
    users.full_name
  FROM users
  WHERE LOWER(users.email) = LOWER(p_email)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION auth_find_user_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_find_user_by_email(text) TO exza_app, exza_system;

-- 9.2 auth_find_invitation_by_token_hash
CREATE OR REPLACE FUNCTION auth_find_invitation_by_token_hash(p_token_hash text)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  email varchar,
  role_id varchar,
  expires_at timestamptz,
  accepted_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT
    invitations.id,
    invitations.company_id,
    invitations.email,
    invitations.role_id,
    invitations.expires_at,
    invitations.accepted_at
  FROM invitations
  WHERE invitations.token_hash = p_token_hash
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION auth_find_invitation_by_token_hash(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_find_invitation_by_token_hash(text) TO exza_app, exza_system;

-- 9.3 auth_find_reset_by_token_hash
CREATE OR REPLACE FUNCTION auth_find_reset_by_token_hash(p_token_hash text)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  user_id uuid,
  expires_at timestamptz,
  used_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT
    password_resets.id,
    password_resets.company_id,
    password_resets.user_id,
    password_resets.expires_at,
    password_resets.used_at
  FROM password_resets
  WHERE password_resets.token_hash = p_token_hash
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION auth_find_reset_by_token_hash(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_find_reset_by_token_hash(text) TO exza_app, exza_system;
