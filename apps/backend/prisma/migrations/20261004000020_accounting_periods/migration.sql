-- Migration: 20261004000020_accounting_periods
-- Phase A6: Fiscal Years & Periods (Period Close/Reopen) (A6.2)
-- PRD MOD-PERIOD, FLOW-13, BR-08, AT-10; architecture.md §10 (RULE-PERIOD), §11

-- 1. CreateTable fiscal_years
CREATE TABLE "fiscal_years" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiscal_years_pkey" PRIMARY KEY ("id")
);

-- 2. CreateTable accounting_periods
CREATE TABLE "accounting_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "fiscal_year_id" UUID NOT NULL,
    "period_number" INTEGER NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'Open',
    "closed_at" TIMESTAMPTZ(6),
    "closed_by_id" UUID,
    "reopened_at" TIMESTAMPTZ(6),
    "reopened_by_id" UUID,
    "reopen_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("id")
);

-- 3. Foreign Keys
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Indexes & Unique Constraints
CREATE UNIQUE INDEX "fiscal_years_company_id_name_key" ON "fiscal_years"("company_id", "name");
CREATE INDEX "fiscal_years_company_id_start_date_end_date_idx" ON "fiscal_years"("company_id", "start_date", "end_date");

CREATE UNIQUE INDEX "accounting_periods_company_id_fiscal_year_id_period_number_key" ON "accounting_periods"("company_id", "fiscal_year_id", "period_number");
CREATE INDEX "accounting_periods_company_id_status_idx" ON "accounting_periods"("company_id", "status");
CREATE INDEX "accounting_periods_company_id_start_date_end_date_idx" ON "accounting_periods"("company_id", "start_date", "end_date");

-- 5. Row Level Security (RLS) enforcement
ALTER TABLE "fiscal_years" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fiscal_years" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "fiscal_years"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "accounting_periods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounting_periods" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "accounting_periods"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- 6. Role Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON "fiscal_years" TO exza_app, exza_worker;
GRANT ALL ON "fiscal_years" TO exza_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON "accounting_periods" TO exza_app, exza_worker;
GRANT ALL ON "accounting_periods" TO exza_migrator;
