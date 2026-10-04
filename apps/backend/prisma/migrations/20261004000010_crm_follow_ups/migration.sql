-- Migration: 20261004000010_crm_follow_ups
-- Task A3.2: Follow-Ups & Overdue Alerts
-- PRD MOD-FOLLOWUP; architecture.md §5.6, §8.2, §11

-- 1. CreateTable crm_follow_ups
CREATE TABLE "crm_follow_ups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "lead_id" UUID,
    "customer_id" UUID,
    "type" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "priority" VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    "due_date" DATE NOT NULL,
    "due_time" VARCHAR(8),
    "notes" TEXT,
    "outcome" TEXT,
    "completed_at" TIMESTAMPTZ,
    "completed_by_id" UUID,
    "next_follow_up_date" DATE,
    "assigned_to_id" UUID NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_follow_ups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "crm_follow_ups_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 2. Indexes
CREATE INDEX "crm_follow_ups_company_id_idx" ON "crm_follow_ups"("company_id");
CREATE INDEX "crm_follow_ups_company_id_lead_id_idx" ON "crm_follow_ups"("company_id", "lead_id");
CREATE INDEX "crm_follow_ups_company_id_customer_id_idx" ON "crm_follow_ups"("company_id", "customer_id");
CREATE INDEX "crm_follow_ups_company_id_assigned_to_id_idx" ON "crm_follow_ups"("company_id", "assigned_to_id");
CREATE INDEX "crm_follow_ups_company_id_status_idx" ON "crm_follow_ups"("company_id", "status");
CREATE INDEX "crm_follow_ups_company_id_due_date_idx" ON "crm_follow_ups"("company_id", "due_date");
CREATE INDEX "crm_follow_ups_company_id_status_due_date_idx" ON "crm_follow_ups"("company_id", "status", "due_date");
CREATE INDEX "crm_follow_ups_company_id_created_at_idx" ON "crm_follow_ups"("company_id", "created_at");

-- 3. Row Level Security (RLS) enforcement
ALTER TABLE "crm_follow_ups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_follow_ups" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "crm_follow_ups"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- 4. Role Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm_follow_ups" TO exza_app, exza_worker;
GRANT ALL ON "crm_follow_ups" TO exza_migrator;

-- 5. Seed follow-up event catalog entries
INSERT INTO notification_event_catalog (code, name, module, description, default_channels)
VALUES
  ('followup.overdue', 'Follow-Up Overdue', 'crm', 'Overdue follow-up alert for sales executive', ARRAY['IN_APP']),
  ('followup.reminder', 'Follow-Up Reminder', 'crm', 'Scheduled follow-up reminder for sales executive', ARRAY['IN_APP'])
ON CONFLICT (code) DO NOTHING;

