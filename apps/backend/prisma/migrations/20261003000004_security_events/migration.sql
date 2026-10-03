-- Security Events Log (Task A0.12 S3)
-- Insert-only table tracking security-relevant events separate from audit_logs.

CREATE TABLE IF NOT EXISTS security_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NULL,
  event_type varchar(64) NOT NULL,
  severity varchar(32) NOT NULL DEFAULT 'INFO',
  details jsonb NULL,
  ip_address varchar(64) NULL,
  user_agent varchar(512) NULL,
  request_id varchar(128) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_security_events_company_id ON security_events (company_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events (event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events (created_at);

-- RLS Enforcement
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON security_events;
CREATE POLICY tenant_isolation_policy ON security_events
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- Least Privilege Grants: Insert-only for application role (RULE-IMMUTABLE)
GRANT SELECT, INSERT ON security_events TO exza_app;
REVOKE UPDATE, DELETE, TRUNCATE ON security_events FROM exza_app;
GRANT ALL ON security_events TO exza_migrator;

-- Immutability Function and Trigger
CREATE OR REPLACE FUNCTION prevent_security_event_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Security events are immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_security_events_immutable ON security_events;
CREATE TRIGGER trg_security_events_immutable
  BEFORE UPDATE OR DELETE ON security_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_security_event_mutation();
