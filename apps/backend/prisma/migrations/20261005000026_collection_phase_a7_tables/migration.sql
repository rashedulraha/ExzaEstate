-- Migration: 20261005000026_collection_phase_a7_tables
-- Phase A7.3 - A7.9 Tables: Cheque Events, Receipt Voids, Refunds, Installment Waivers, Late Fee Records, Migration Batches & Records
-- PRD §9.3, §9.4, §17; accounting-rules.md §3, §4, §5; task.md A7.3 - A7.9

-- 1. CreateTable cheque_events
CREATE TABLE "cheque_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "event" VARCHAR(32) NOT NULL,
    "cheque_number" VARCHAR(64) NOT NULL,
    "bank_name" VARCHAR(128),
    "branch_name" VARCHAR(128),
    "cheque_date" DATE,
    "clearing_date" DATE,
    "bounce_reason" TEXT,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cheque_events_pkey" PRIMARY KEY ("id")
);

-- 2. CreateTable receipt_voids
CREATE TABLE "receipt_voids" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "receipt_id" UUID NOT NULL,
    "void_number" VARCHAR(64) NOT NULL,
    "reason" TEXT NOT NULL,
    "approval_id" UUID,
    "voided_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_voids_pkey" PRIMARY KEY ("id")
);

-- 3. CreateTable refunds
CREATE TABLE "refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "refund_number" VARCHAR(64) NOT NULL,
    "booking_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "amount_paisa" BIGINT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'Requested',
    "reason" TEXT,
    "approval_id" UUID,
    "paid_at" TIMESTAMPTZ(6),
    "paid_by_id" UUID,
    "payment_method" VARCHAR(32),
    "bank_account_id" UUID,
    "journal_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- 4. CreateTable installment_waivers
CREATE TABLE "installment_waivers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "waiver_number" VARCHAR(64) NOT NULL,
    "installment_id" UUID NOT NULL,
    "amount_paisa" BIGINT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'Approved',
    "reason" TEXT NOT NULL,
    "approval_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "installment_waivers_pkey" PRIMARY KEY ("id")
);

-- 5. CreateTable late_fee_records
CREATE TABLE "late_fee_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "installment_id" UUID NOT NULL,
    "amount_paisa" BIGINT NOT NULL,
    "is_waived" BOOLEAN NOT NULL DEFAULT false,
    "waived_at" TIMESTAMPTZ(6),
    "waived_by_id" UUID,
    "journal_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "late_fee_records_pkey" PRIMARY KEY ("id")
);

-- 6. CreateTable migration_batches
CREATE TABLE "migration_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "batch_number" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'Draft',
    "go_live_date" DATE NOT NULL,
    "notes" TEXT,
    "opening_journal_id" UUID,
    "finalized_at" TIMESTAMPTZ(6),
    "finalized_by_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "migration_batches_pkey" PRIMARY KEY ("id")
);

-- 7. CreateTable legacy_booking_records
CREATE TABLE "legacy_booking_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "booking_id" UUID,
    "customer_id" UUID NOT NULL,
    "legacy_booking_no" VARCHAR(64) NOT NULL,
    "net_price_paisa" BIGINT NOT NULL,
    "total_paid_paisa" BIGINT NOT NULL,
    "outstanding_paisa" BIGINT NOT NULL,
    "historical_payments" JSONB NOT NULL DEFAULT '[]',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legacy_booking_records_pkey" PRIMARY KEY ("id")
);

-- 8. Unique Constraints & Indexes
CREATE INDEX "cheque_events_company_id_idx" ON "cheque_events"("company_id");
CREATE INDEX "cheque_events_company_id_payment_id_idx" ON "cheque_events"("company_id", "payment_id");
CREATE INDEX "cheque_events_company_id_event_idx" ON "cheque_events"("company_id", "event");

CREATE UNIQUE INDEX "receipt_voids_company_id_void_number_key" ON "receipt_voids"("company_id", "void_number");
CREATE INDEX "receipt_voids_company_id_receipt_id_idx" ON "receipt_voids"("company_id", "receipt_id");

CREATE UNIQUE INDEX "refunds_company_id_refund_number_key" ON "refunds"("company_id", "refund_number");
CREATE INDEX "refunds_company_id_booking_id_idx" ON "refunds"("company_id", "booking_id");
CREATE INDEX "refunds_company_id_customer_id_idx" ON "refunds"("company_id", "customer_id");
CREATE INDEX "refunds_company_id_status_idx" ON "refunds"("company_id", "status");

CREATE UNIQUE INDEX "installment_waivers_company_id_waiver_number_key" ON "installment_waivers"("company_id", "waiver_number");
CREATE INDEX "installment_waivers_company_id_installment_id_idx" ON "installment_waivers"("company_id", "installment_id");

CREATE INDEX "late_fee_records_company_id_installment_id_idx" ON "late_fee_records"("company_id", "installment_id");

CREATE UNIQUE INDEX "migration_batches_company_id_batch_number_key" ON "migration_batches"("company_id", "batch_number");
CREATE INDEX "migration_batches_company_id_status_idx" ON "migration_batches"("company_id", "status");

CREATE INDEX "legacy_booking_records_company_id_batch_id_idx" ON "legacy_booking_records"("company_id", "batch_id");
CREATE INDEX "legacy_booking_records_company_id_customer_id_idx" ON "legacy_booking_records"("company_id", "customer_id");

-- 9. Foreign Key Constraints
ALTER TABLE "cheque_events" ADD CONSTRAINT "cheque_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receipt_voids" ADD CONSTRAINT "receipt_voids_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "installment_waivers" ADD CONSTRAINT "installment_waivers_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "installments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "late_fee_records" ADD CONSTRAINT "late_fee_records_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "installments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "legacy_booking_records" ADD CONSTRAINT "legacy_booking_records_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "migration_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "legacy_booking_records" ADD CONSTRAINT "legacy_booking_records_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 10. Row Level Security (RLS) enforcement
ALTER TABLE "cheque_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cheque_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "cheque_events"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "receipt_voids" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "receipt_voids" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "receipt_voids"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "refunds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refunds" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "refunds"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "installment_waivers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "installment_waivers" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "installment_waivers"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "late_fee_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "late_fee_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "late_fee_records"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "migration_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "migration_batches" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "migration_batches"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "legacy_booking_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "legacy_booking_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "legacy_booking_records"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- 11. Role Grants & Revocations
GRANT SELECT, INSERT, UPDATE ON "cheque_events", "receipt_voids", "refunds", "installment_waivers", "late_fee_records", "migration_batches", "legacy_booking_records" TO exza_app, exza_worker;
REVOKE DELETE ON "cheque_events", "receipt_voids" FROM exza_app, exza_worker;
GRANT ALL ON "cheque_events", "receipt_voids", "refunds", "installment_waivers", "late_fee_records", "migration_batches", "legacy_booking_records" TO exza_migrator;
