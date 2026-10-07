-- Migration: 20261005000027_phase_a8_rls_and_tables
-- Phase A8 Tables RLS Policies & Grants: Expenses, Vendors, Commission, Booking Transfers
-- PRD §8, §18; security.md §3; architecture.md §5.2, §18.2

-- Enable and Force Row Level Security on Phase A8 tenant tables
CREATE TABLE IF NOT EXISTS "brokers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "email" VARCHAR(255),
    "nid_or_passport" VARCHAR(64),
    "license_number" VARCHAR(64),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "brokers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "commission_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "rate_percent" DECIMAL(5,2) NOT NULL,
    "tier_threshold_paisa" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "commission_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "broker_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "amount_paisa" BIGINT NOT NULL,
    "paid_amount_paisa" BIGINT NOT NULL DEFAULT 0,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "commission_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "expense_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "account_code" VARCHAR(32) NOT NULL DEFAULT '5500',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "expense_categories_company_id_code_key" UNIQUE ("company_id", "code")
);

CREATE TABLE IF NOT EXISTS "expense_vouchers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "voucher_number" VARCHAR(64) NOT NULL,
    "category_id" UUID NOT NULL,
    "project_id" UUID,
    "cost_center" VARCHAR(64),
    "payee_name" VARCHAR(255) NOT NULL,
    "vendor_id" UUID,
    "amount_paisa" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "expense_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    "approval_id" UUID,
    "requires_md_approval" BOOLEAN NOT NULL DEFAULT false,
    "payment_method" VARCHAR(32) DEFAULT 'BANK_TRANSFER',
    "paid_later" BOOLEAN NOT NULL DEFAULT false,
    "bank_account_id" UUID,
    "bank_account_code" VARCHAR(32),
    "journal_id" UUID,
    "submitted_at" TIMESTAMPTZ,
    "approved_at" TIMESTAMPTZ,
    "verified_at" TIMESTAMPTZ,
    "paid_at" TIMESTAMPTZ,
    "rejected_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "created_by_id" UUID,
    "approved_by_id" UUID,
    "verified_by_id" UUID,
    "paid_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "expense_vouchers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "expense_vouchers_company_id_voucher_number_key" UNIQUE ("company_id", "voucher_number")
);

CREATE TABLE IF NOT EXISTS "expense_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "voucher_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(512) NOT NULL,
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "mime_type" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expense_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "expense_budgets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "project_id" UUID,
    "category_id" UUID,
    "fiscal_year" VARCHAR(16) NOT NULL,
    "budget_amount_paisa" BIGINT NOT NULL,
    "actual_spend_paisa" BIGINT NOT NULL DEFAULT 0,
    "alert_70_sent" BOOLEAN NOT NULL DEFAULT false,
    "alert_90_sent" BOOLEAN NOT NULL DEFAULT false,
    "alert_100_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "expense_budgets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "vendors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "email" VARCHAR(255),
    "address" TEXT,
    "tax_id" VARCHAR(64),
    "payable_account_code" VARCHAR(32) NOT NULL DEFAULT '2100',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "vendors_company_id_code_key" UNIQUE ("company_id", "code")
);

CREATE TABLE IF NOT EXISTS "vendor_bills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "bill_number" VARCHAR(64) NOT NULL,
    "vendor_id" UUID NOT NULL,
    "project_id" UUID,
    "amount_paisa" BIGINT NOT NULL,
    "paid_amount_paisa" BIGINT NOT NULL DEFAULT 0,
    "bill_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "due_date" DATE NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "vendor_bills_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "vendor_bills_company_id_bill_number_key" UNIQUE ("company_id", "bill_number")
);

CREATE TABLE IF NOT EXISTS "vendor_bill_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "account_code" VARCHAR(32) NOT NULL DEFAULT '5500',
    "amount_paisa" BIGINT NOT NULL,
    CONSTRAINT "vendor_bill_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "vendor_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "payment_number" VARCHAR(64) NOT NULL,
    "vendor_id" UUID NOT NULL,
    "amount_paisa" BIGINT NOT NULL,
    "payment_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "payment_method" VARCHAR(32) NOT NULL DEFAULT 'BANK_TRANSFER',
    "bank_account_code" VARCHAR(32) NOT NULL DEFAULT '1020',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "vendor_payment_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "allocated_amount_paisa" BIGINT NOT NULL,
    CONSTRAINT "vendor_payment_allocations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "booking_transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "transfer_number" VARCHAR(64) NOT NULL,
    "from_customer_id" UUID NOT NULL,
    "to_customer_id" UUID NOT NULL,
    "transfer_fee_paisa" BIGINT NOT NULL DEFAULT 0,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "booking_transfers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "brokers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brokers" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "brokers"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "commission_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commission_rules" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "commission_rules"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "commission_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commission_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "commission_records"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "expense_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_categories" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "expense_categories"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "expense_vouchers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_vouchers" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "expense_vouchers"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "expense_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_attachments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "expense_attachments"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "expense_budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_budgets" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "expense_budgets"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "vendors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendors" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "vendors"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "vendor_bills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendor_bills" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "vendor_bills"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "vendor_bill_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendor_bill_lines" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "vendor_bill_lines"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "vendor_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendor_payments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "vendor_payments"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "vendor_payment_allocations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendor_payment_allocations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "vendor_payment_allocations"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "booking_transfers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "booking_transfers" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "booking_transfers"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- Grants
GRANT SELECT, INSERT, UPDATE ON "brokers", "commission_rules", "commission_records", "expense_categories", "expense_vouchers", "expense_attachments", "expense_budgets", "vendors", "vendor_bills", "vendor_bill_lines", "vendor_payments", "vendor_payment_allocations", "booking_transfers" TO exza_app, exza_worker;
REVOKE DELETE ON "commission_records", "vendor_payments", "booking_transfers" FROM exza_app, exza_worker;
GRANT ALL ON "brokers", "commission_rules", "commission_records", "expense_categories", "expense_vouchers", "expense_attachments", "expense_budgets", "vendors", "vendor_bills", "vendor_bill_lines", "vendor_payments", "vendor_payment_allocations", "booking_transfers" TO exza_migrator;
