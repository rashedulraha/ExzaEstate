-- ==============================================================================
-- ExzaEstate Migration 20261004000007: Notifications Module Core
-- ==============================================================================

-- 1. Create notification_event_catalog table (Global Reference Table)
CREATE TABLE IF NOT EXISTS notification_event_catalog (
  code VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  module VARCHAR(64) NOT NULL,
  description TEXT,
  default_channels TEXT[] NOT NULL DEFAULT ARRAY['IN_APP'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON notification_event_catalog TO exza_app, exza_system;

-- 2. Create notification_templates table (Tenant-scoped, with RLS)
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_code VARCHAR(64) NOT NULL REFERENCES notification_event_catalog(code) ON DELETE RESTRICT,
  channel VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_notification_templates_company_event_channel UNIQUE (company_id, event_code, channel)
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_company_id ON notification_templates(company_id);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON notification_templates;
CREATE POLICY tenant_isolation_policy ON notification_templates
  FOR ALL
  TO exza_app
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON notification_templates TO exza_app, exza_system;

-- 3. Create in_app_notifications table (Tenant-scoped, with RLS)
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_code VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_company_user_read ON in_app_notifications(company_id, user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_company_created ON in_app_notifications(company_id, created_at);

ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_app_notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON in_app_notifications;
CREATE POLICY tenant_isolation_policy ON in_app_notifications
  FOR ALL
  TO exza_app
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON in_app_notifications TO exza_app, exza_system;

-- 4. Create notification_preferences table (Tenant-scoped, with RLS)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_code VARCHAR(64) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_notification_preferences_user_event_channel UNIQUE (company_id, user_id, event_code, channel)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_company_user ON notification_preferences(company_id, user_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON notification_preferences;
CREATE POLICY tenant_isolation_policy ON notification_preferences
  FOR ALL
  TO exza_app
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO exza_app, exza_system;

-- 5. Seed default catalog events
INSERT INTO notification_event_catalog (code, name, module, description, default_channels)
VALUES
  ('booking.requested', 'Booking Requested', 'booking', 'New booking request submitted for review', ARRAY['IN_APP']),
  ('booking.confirmed', 'Booking Confirmed', 'booking', 'Booking confirmed for customer and property', ARRAY['IN_APP']),
  ('booking.cancelled', 'Booking Cancelled', 'booking', 'Booking cancellation finalized', ARRAY['IN_APP']),
  ('installment.due', 'Installment Due', 'installment', 'Upcoming installment due date alert', ARRAY['IN_APP']),
  ('installment.overdue', 'Installment Overdue', 'installment', 'Installment overdue notice', ARRAY['IN_APP']),
  ('payment.received', 'Payment Received', 'payment', 'Payment draft or receipt recorded', ARRAY['IN_APP']),
  ('payment.posted', 'Payment Posted', 'payment', 'Payment officially posted to accounts', ARRAY['IN_APP']),
  ('payment.bounced', 'Payment Cheque Bounced', 'payment', 'Payment cheque bounced notification', ARRAY['IN_APP']),
  ('refund.requested', 'Refund Requested', 'refund', 'Customer refund requested for review', ARRAY['IN_APP']),
  ('approval.requested', 'Approval Requested', 'approval', 'Pending approval required for action', ARRAY['IN_APP']),
  ('approval.granted', 'Approval Granted', 'approval', 'Action approval granted', ARRAY['IN_APP']),
  ('approval.rejected', 'Approval Rejected', 'approval', 'Action approval rejected', ARRAY['IN_APP']),
  ('document.expiry_alert', 'Document Expiry Alert', 'documents', 'Document validity expiring soon alert', ARRAY['IN_APP']),
  ('lead.created', 'Lead Created', 'crm', 'New sales lead assigned', ARRAY['IN_APP']),
  ('lead.contacted', 'Lead Contacted', 'crm', 'Follow-up logged for sales lead', ARRAY['IN_APP']),
  ('security.event', 'Security Alert', 'security', 'Security event or login anomaly detected', ARRAY['IN_APP'])
ON CONFLICT (code) DO NOTHING;
