-- Platform Services Migration:
-- 1. Partitioned Tables: audit_logs, outbox_events, notification_logs
-- 2. State & Concurrency Tables: document_sequences, idempotency_keys
-- 3. RLS, Immutability Triggers, and Least-Privilege Grants

-- ============================================================================
-- 1. Audit Logs (Monthly Partitioned, Append-Only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  actor_id uuid NULL,
  module varchar(64) NOT NULL,
  record_type varchar(64) NOT NULL,
  record_id uuid NOT NULL,
  action varchar(64) NOT NULL,
  old_value jsonb NULL,
  new_value jsonb NULL,
  reason text NULL,
  ip_address varchar(64) NULL,
  request_id varchar(128) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs (company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs (record_type, record_id);

-- Monthly Partitions & Default Partition
CREATE TABLE IF NOT EXISTS audit_logs_default PARTITION OF audit_logs DEFAULT;
CREATE TABLE IF NOT EXISTS audit_logs_2026_09 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_2026_10 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_2026_11 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_2026_12 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_2027_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-02-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_2027_02 PARTITION OF audit_logs
  FOR VALUES FROM ('2027-02-01 00:00:00+00') TO ('2027-03-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_2027_03 PARTITION OF audit_logs
  FOR VALUES FROM ('2027-03-01 00:00:00+00') TO ('2027-04-01 00:00:00+00');

-- RLS Configuration
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON audit_logs;
CREATE POLICY tenant_isolation_policy ON audit_logs
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE audit_logs_default ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_default FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_2026_09 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_2026_09 FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_2026_10 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_2026_10 FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_2026_11 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_2026_11 FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_2026_12 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_2026_12 FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_2027_01 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_2027_01 FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_2027_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_2027_02 FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_2027_03 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_2027_03 FORCE ROW LEVEL SECURITY;

-- Least-Privilege Grants: INSERT & SELECT only for exza_app (NO UPDATE/DELETE)
REVOKE ALL ON audit_logs FROM PUBLIC, exza_app, exza_worker;
GRANT SELECT, INSERT ON audit_logs TO exza_app, exza_system;

-- Immutability Trigger
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Audit records are immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();


-- ============================================================================
-- 2. Outbox Events (Monthly Partitioned, Transactional Outbox)
-- ============================================================================
CREATE TABLE IF NOT EXISTS outbox_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  event_name varchar(128) NOT NULL,
  payload jsonb NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'PENDING',
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE INDEX IF NOT EXISTS idx_outbox_events_company_id ON outbox_events (company_id);
CREATE INDEX IF NOT EXISTS idx_outbox_events_status ON outbox_events (status);

-- Monthly Partitions & Default Partition
CREATE TABLE IF NOT EXISTS outbox_events_default PARTITION OF outbox_events DEFAULT;
CREATE TABLE IF NOT EXISTS outbox_events_2026_09 PARTITION OF outbox_events
  FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS outbox_events_2026_10 PARTITION OF outbox_events
  FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS outbox_events_2026_11 PARTITION OF outbox_events
  FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS outbox_events_2026_12 PARTITION OF outbox_events
  FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS outbox_events_2027_01 PARTITION OF outbox_events
  FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-02-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS outbox_events_2027_02 PARTITION OF outbox_events
  FOR VALUES FROM ('2027-02-01 00:00:00+00') TO ('2027-03-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS outbox_events_2027_03 PARTITION OF outbox_events
  FOR VALUES FROM ('2027-03-01 00:00:00+00') TO ('2027-04-01 00:00:00+00');

-- RLS Configuration
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON outbox_events;
CREATE POLICY tenant_isolation_policy ON outbox_events
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- Dedicated Worker Policies (ARCH-SYSTEM-SCOPE)
DROP POLICY IF EXISTS worker_read_outbox_policy ON outbox_events;
CREATE POLICY worker_read_outbox_policy ON outbox_events
  AS PERMISSIVE FOR SELECT TO exza_worker
  USING (true);

DROP POLICY IF EXISTS worker_update_outbox_policy ON outbox_events;
CREATE POLICY worker_update_outbox_policy ON outbox_events
  AS PERMISSIVE FOR UPDATE TO exza_worker
  USING (true)
  WITH CHECK (true);

ALTER TABLE outbox_events_default ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events_default FORCE ROW LEVEL SECURITY;
ALTER TABLE outbox_events_2026_09 ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events_2026_09 FORCE ROW LEVEL SECURITY;
ALTER TABLE outbox_events_2026_10 ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events_2026_10 FORCE ROW LEVEL SECURITY;
ALTER TABLE outbox_events_2026_11 ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events_2026_11 FORCE ROW LEVEL SECURITY;
ALTER TABLE outbox_events_2026_12 ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events_2026_12 FORCE ROW LEVEL SECURITY;
ALTER TABLE outbox_events_2027_01 ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events_2027_01 FORCE ROW LEVEL SECURITY;
ALTER TABLE outbox_events_2027_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events_2027_02 FORCE ROW LEVEL SECURITY;
ALTER TABLE outbox_events_2027_03 ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events_2027_03 FORCE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON outbox_events TO exza_app, exza_system;
GRANT SELECT, UPDATE ON outbox_events TO exza_worker;


-- ============================================================================
-- 3. Notification Logs (Monthly Partitioned)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  recipient_id uuid NULL,
  template_id varchar(128) NULL,
  channel varchar(32) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'PENDING',
  payload jsonb NULL,
  error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz NULL,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE INDEX IF NOT EXISTS idx_notification_logs_company_id ON notification_logs (company_id);

-- Monthly Partitions & Default Partition
CREATE TABLE IF NOT EXISTS notification_logs_default PARTITION OF notification_logs DEFAULT;
CREATE TABLE IF NOT EXISTS notification_logs_2026_09 PARTITION OF notification_logs
  FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS notification_logs_2026_10 PARTITION OF notification_logs
  FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS notification_logs_2026_11 PARTITION OF notification_logs
  FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS notification_logs_2026_12 PARTITION OF notification_logs
  FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS notification_logs_2027_01 PARTITION OF notification_logs
  FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-02-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS notification_logs_2027_02 PARTITION OF notification_logs
  FOR VALUES FROM ('2027-02-01 00:00:00+00') TO ('2027-03-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS notification_logs_2027_03 PARTITION OF notification_logs
  FOR VALUES FROM ('2027-03-01 00:00:00+00') TO ('2027-04-01 00:00:00+00');

-- RLS Configuration
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON notification_logs;
CREATE POLICY tenant_isolation_policy ON notification_logs
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE notification_logs_default ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs_default FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_logs_2026_09 ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs_2026_09 FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_logs_2026_10 ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs_2026_10 FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_logs_2026_11 ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs_2026_11 FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_logs_2026_12 ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs_2026_12 FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_logs_2027_01 ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs_2027_01 FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_logs_2027_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs_2027_02 FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_logs_2027_03 ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs_2027_03 FORCE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_logs TO exza_app, exza_system;


-- ============================================================================
-- 4. Document Sequences (Gapless Sequential Numbering)
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  type varchar(64) NOT NULL,
  fiscal_year varchar(32) NOT NULL,
  scope_key varchar(64) NOT NULL DEFAULT 'ALL',
  last_value bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_document_sequences_scope UNIQUE (company_id, type, fiscal_year, scope_key)
);

ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sequences FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON document_sequences;
CREATE POLICY tenant_isolation_policy ON document_sequences
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE ON document_sequences TO exza_app, exza_system;


-- ============================================================================
-- 5. Idempotency Keys (Durable DB Keys with Row Blocking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  method varchar(16) NOT NULL,
  route_pattern varchar(255) NOT NULL,
  key varchar(255) NOT NULL,
  request_hash varchar(64) NOT NULL,
  response_status int NULL,
  response_body jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT uq_idempotency_keys UNIQUE (company_id, user_id, method, route_pattern, key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON idempotency_keys (expires_at);

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON idempotency_keys;
CREATE POLICY tenant_isolation_policy ON idempotency_keys
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON idempotency_keys TO exza_app, exza_system;


-- ============================================================================
-- 6. Helper Function: Create Monthly Partition For Partitioned Tables
-- ============================================================================
CREATE OR REPLACE FUNCTION create_monthly_partition_for_table(table_name text, start_date date)
RETURNS void AS $$
DECLARE
  part_name text;
  end_date date;
  start_str text;
  end_str text;
BEGIN
  part_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
  end_date := (start_date + interval '1 month')::date;
  start_str := to_char(start_date, 'YYYY-MM-01 00:00:00+00');
  end_str := to_char(end_date, 'YYYY-MM-01 00:00:00+00');

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    part_name, table_name, start_str, end_str
  );
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', part_name);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', part_name);
END;
$$ LANGUAGE plpgsql;
