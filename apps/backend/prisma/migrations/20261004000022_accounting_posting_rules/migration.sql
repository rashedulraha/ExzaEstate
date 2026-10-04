-- Migration: 20261004000022_accounting_posting_rules
-- Phase A6.4: Posting Rules Registry & PostingService (PRD MOD-EVENTS, BR-06, AT-04, AT-04b, AT-25; accounting-rules.md §1-§3)

-- 1. Alter Table: journals (add source document and event type links)
ALTER TABLE "journals"
  ADD COLUMN IF NOT EXISTS "source_document_id" UUID,
  ADD COLUMN IF NOT EXISTS "source_event_type" VARCHAR(64);

CREATE INDEX IF NOT EXISTS "journals_company_id_source_document_id_idx" ON "journals"("company_id", "source_document_id");
CREATE INDEX IF NOT EXISTS "journals_company_id_source_event_type_idx" ON "journals"("company_id", "source_event_type");

-- 2. Create Table: posting_rules
CREATE TABLE "posting_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "event_type" VARCHAR(64) NOT NULL,
  "rule_name" VARCHAR(128) NOT NULL,
  "description" TEXT,
  "debit_account_code" VARCHAR(16),
  "credit_account_code" VARCHAR(16),
  "account_mappings" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "posting_rules_pkey" PRIMARY KEY ("id")
);

-- Indexes for posting_rules
CREATE UNIQUE INDEX "posting_rules_company_id_event_type_key" ON "posting_rules"("company_id", "event_type");
CREATE INDEX "posting_rules_company_id_is_active_idx" ON "posting_rules"("company_id", "is_active");

-- 3. Multi-Tenant Row Level Security (RLS)
ALTER TABLE "posting_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "posting_rules" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_policy" ON "posting_rules"
  FOR ALL
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

-- 4. Role Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON "posting_rules" TO exza_app, exza_worker;
GRANT ALL ON "posting_rules" TO exza_migrator;
