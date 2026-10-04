-- Migration: 20261004000012_sales_payment_plans
-- Task A4.1: Payment Plan Templates & Installment Calculation Engine
-- PRD MOD-PAYPLAN, MOD-INSTALLMENT, AT-23; architecture.md §9.1, §11

-- 1. CreateTable sales_payment_plan_templates
CREATE TABLE "sales_payment_plan_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "plan_type" VARCHAR(32) NOT NULL DEFAULT 'EQUAL_INSTALLMENTS',
    "frequency" VARCHAR(32) NOT NULL DEFAULT 'MONTHLY',
    "installment_count" INTEGER NOT NULL DEFAULT 24,
    "min_booking_pct" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "down_payment_pct" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "milestone_config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_payment_plan_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sales_payment_plan_templates_company_id_code_key" UNIQUE ("company_id", "code")
);

-- 2. Indexes
CREATE INDEX "sales_payment_plan_templates_company_id_idx" ON "sales_payment_plan_templates"("company_id");
CREATE INDEX "sales_payment_plan_templates_company_id_is_active_idx" ON "sales_payment_plan_templates"("company_id", "is_active");
CREATE INDEX "sales_payment_plan_templates_company_id_is_default_idx" ON "sales_payment_plan_templates"("company_id", "is_default");
CREATE INDEX "sales_payment_plan_templates_company_id_created_at_idx" ON "sales_payment_plan_templates"("company_id", "created_at");

-- 3. Row Level Security (RLS) enforcement
ALTER TABLE "sales_payment_plan_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sales_payment_plan_templates" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "sales_payment_plan_templates"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- 4. Role Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON "sales_payment_plan_templates" TO exza_app, exza_worker;
GRANT ALL ON "sales_payment_plan_templates" TO exza_migrator;
