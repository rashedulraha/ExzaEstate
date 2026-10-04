-- Migration: 20261004000009_crm_leads
-- Task A3.1: Lead Capture, Sources & Pipeline

-- 1. CreateTable crm_leads
CREATE TABLE "crm_leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "lead_number" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "email" VARCHAR(255),
    "source" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'New',
    "lost_reason" TEXT,
    "interest_notes" TEXT,
    "preferred_project_id" UUID,
    "preferred_property_type" VARCHAR(64),
    "budget_paisa" BIGINT,
    "assigned_to_id" UUID,
    "branch_id" UUID,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_leads_pkey" PRIMARY KEY ("id")
);

-- 2. CreateTable crm_lead_status_history
CREATE TABLE "crm_lead_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "from_status" VARCHAR(32),
    "to_status" VARCHAR(32) NOT NULL,
    "reason" TEXT,
    "changed_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_lead_status_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "crm_lead_status_history_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. Indexes & Constraints
CREATE UNIQUE INDEX "crm_leads_company_id_lead_number_key" ON "crm_leads"("company_id", "lead_number");
CREATE INDEX "crm_leads_company_id_idx" ON "crm_leads"("company_id");
CREATE INDEX "crm_leads_company_id_phone_idx" ON "crm_leads"("company_id", "phone");
CREATE INDEX "crm_leads_company_id_email_idx" ON "crm_leads"("company_id", "email");
CREATE INDEX "crm_leads_company_id_status_idx" ON "crm_leads"("company_id", "status");
CREATE INDEX "crm_leads_company_id_source_idx" ON "crm_leads"("company_id", "source");
CREATE INDEX "crm_leads_company_id_assigned_to_id_idx" ON "crm_leads"("company_id", "assigned_to_id");
CREATE INDEX "crm_leads_company_id_branch_id_idx" ON "crm_leads"("company_id", "branch_id");
CREATE INDEX "crm_leads_company_id_preferred_project_id_idx" ON "crm_leads"("company_id", "preferred_project_id");
CREATE INDEX "crm_leads_company_id_created_at_idx" ON "crm_leads"("company_id", "created_at");

CREATE INDEX "crm_lead_status_history_company_id_idx" ON "crm_lead_status_history"("company_id");
CREATE INDEX "crm_lead_status_history_company_id_lead_id_idx" ON "crm_lead_status_history"("company_id", "lead_id");
CREATE INDEX "crm_lead_status_history_company_id_lead_id_created_at_idx" ON "crm_lead_status_history"("company_id", "lead_id", "created_at");

-- 4. Row Level Security (RLS) enforcement
-- crm_leads
ALTER TABLE "crm_leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_leads" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "crm_leads"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- crm_lead_status_history
ALTER TABLE "crm_lead_status_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_lead_status_history" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "crm_lead_status_history"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- 5. Role Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm_leads" TO exza_app;
GRANT ALL ON "crm_leads" TO exza_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON "crm_lead_status_history" TO exza_app;
GRANT ALL ON "crm_lead_status_history" TO exza_migrator;
