-- Migration: 20261004000013_sales_charge_types
-- Task A4.2: Charge Types & Fees Catalogue
-- PRD MOD-CHARGES, §17; accounting-rules.md §2; architecture.md §11

-- 1. CreateTable sales_charge_types
CREATE TABLE "sales_charge_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "calculation_type" VARCHAR(32) NOT NULL DEFAULT 'FIXED',
    "default_amount_paisa" BIGINT,
    "default_rate_pct" DECIMAL(7, 4),
    "is_included_in_net_price" BOOLEAN NOT NULL DEFAULT false,
    "payable_stage" VARCHAR(32) NOT NULL DEFAULT 'AT_BOOKING',
    "vat_rate_pct" DECIMAL(7, 4) NOT NULL DEFAULT 0.0000,
    "account_code" VARCHAR(32),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_charge_types_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sales_charge_types_company_id_code_key" UNIQUE ("company_id", "code")
);

-- 2. Indexes
CREATE INDEX "sales_charge_types_company_id_idx" ON "sales_charge_types"("company_id");
CREATE INDEX "sales_charge_types_company_id_is_active_idx" ON "sales_charge_types"("company_id", "is_active");
CREATE INDEX "sales_charge_types_company_id_payable_stage_idx" ON "sales_charge_types"("company_id", "payable_stage");
CREATE INDEX "sales_charge_types_company_id_created_at_idx" ON "sales_charge_types"("company_id", "created_at");

-- 3. Row Level Security (RLS) enforcement
ALTER TABLE "sales_charge_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sales_charge_types" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "sales_charge_types"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- 4. Role Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON "sales_charge_types" TO exza_app, exza_worker;
GRANT ALL ON "sales_charge_types" TO exza_migrator;
