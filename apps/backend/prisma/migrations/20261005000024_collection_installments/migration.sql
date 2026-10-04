-- Migration: 20261005000024_collection_installments
-- Phase A7.1: Installment Schedule Persistence & Timing State
-- PRD §9.3; task.md A7.1

-- 1. CreateTable installments
CREATE TABLE "installments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "type" VARCHAR(32) NOT NULL DEFAULT 'REGULAR',
    "due_date" DATE NOT NULL,
    "amount_paisa" BIGINT NOT NULL,
    "paid_amount_paisa" BIGINT NOT NULL DEFAULT 0,
    "remaining_amount_paisa" BIGINT NOT NULL,
    "payment_state" VARCHAR(32) NOT NULL DEFAULT 'Unpaid',
    "waived_amount_paisa" BIGINT NOT NULL DEFAULT 0,
    "late_fee_paisa" BIGINT NOT NULL DEFAULT 0,
    "milestone_event" VARCHAR(128),
    "milestone_completed" BOOLEAN NOT NULL DEFAULT false,
    "milestone_completed_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "installments_pkey" PRIMARY KEY ("id")
);

-- 2. Constraints & Indexes
CREATE UNIQUE INDEX "installments_company_booking_installment_number_key" ON "installments"("company_id", "booking_id", "installment_number");
CREATE INDEX "installments_company_id_idx" ON "installments"("company_id");
CREATE INDEX "installments_company_id_booking_id_idx" ON "installments"("company_id", "booking_id");
CREATE INDEX "installments_company_id_due_date_idx" ON "installments"("company_id", "due_date");
CREATE INDEX "installments_company_id_payment_state_idx" ON "installments"("company_id", "payment_state");

-- 3. Foreign Keys
ALTER TABLE "installments" ADD CONSTRAINT "installments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_target_installment_id_fkey" FOREIGN KEY ("target_installment_id") REFERENCES "installments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Row Level Security (RLS) enforcement
ALTER TABLE "installments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "installments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "installments"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- 5. Role Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON "installments" TO exza_app, exza_worker;
GRANT ALL ON "installments" TO exza_migrator;
