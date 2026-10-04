-- Migration: 20261004000014_sales_quotations
-- Task A4.3: Quotation Generation & Branded PDF
-- PRD MOD-QUOTATION, §9.5; design.md §12; architecture.md §15, §20.2

-- 1. CreateTable sales_quotations
CREATE TABLE "sales_quotations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "quotation_number" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'Draft',
    "customer_id" UUID,
    "lead_id" UUID,
    "property_id" UUID NOT NULL,
    "payment_plan_template_id" UUID,

    "quotation_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMPTZ NOT NULL,

    -- Price breakdown
    "base_price_paisa" BIGINT NOT NULL,
    "premium_amount_paisa" BIGINT NOT NULL DEFAULT 0,
    "discount_amount_paisa" BIGINT NOT NULL DEFAULT 0,
    "discount_pct" DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    "net_price_paisa" BIGINT NOT NULL,

    -- Charges & VAT totals
    "total_included_charges_paisa" BIGINT NOT NULL DEFAULT 0,
    "total_additional_charges_paisa" BIGINT NOT NULL DEFAULT 0,
    "total_vat_paisa" BIGINT NOT NULL DEFAULT 0,
    "grand_total_paisa" BIGINT NOT NULL,

    -- Snapshots for audit & reproducibility
    "charges_snapshot" JSONB DEFAULT '[]'::jsonb,
    "installments_snapshot" JSONB DEFAULT '[]'::jsonb,
    "pricing_snapshot" JSONB DEFAULT '{}'::jsonb,

    -- Discount approval flow
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "approval_status" VARCHAR(32),
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,

    -- Booking conversion linkage
    "converted_at" TIMESTAMPTZ,
    "booking_id" UUID,

    "notes" TEXT,
    "terms" TEXT,
    "pdf_storage_path" VARCHAR(512),

    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_quotations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sales_quotations_company_id_quotation_number_key" UNIQUE ("company_id", "quotation_number")
);

-- 2. Indexes
CREATE INDEX "sales_quotations_company_id_idx" ON "sales_quotations"("company_id");
CREATE INDEX "sales_quotations_company_id_status_idx" ON "sales_quotations"("company_id", "status");
CREATE INDEX "sales_quotations_company_id_property_id_idx" ON "sales_quotations"("company_id", "property_id");
CREATE INDEX "sales_quotations_company_id_customer_id_idx" ON "sales_quotations"("company_id", "customer_id");
CREATE INDEX "sales_quotations_company_id_lead_id_idx" ON "sales_quotations"("company_id", "lead_id");
CREATE INDEX "sales_quotations_company_id_valid_until_idx" ON "sales_quotations"("company_id", "valid_until");
CREATE INDEX "sales_quotations_company_id_created_at_idx" ON "sales_quotations"("company_id", "created_at");

-- 3. Row Level Security (RLS) enforcement
ALTER TABLE "sales_quotations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sales_quotations" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "sales_quotations"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- 4. Role Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON "sales_quotations" TO exza_app, exza_worker;
GRANT ALL ON "sales_quotations" TO exza_migrator;
