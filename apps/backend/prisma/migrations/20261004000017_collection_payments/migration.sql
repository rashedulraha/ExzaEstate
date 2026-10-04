-- Migration: 20261004000017_collection_payments
-- Phase A5.2: Payment Entity & Draft Booking Payments
-- PRD MOD-PAYMENT, §9.4; permissions-matrix.md §3; architecture.md §10 (RULE-IMMUTABLE)

-- 1. CreateTable payments
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "payment_number" VARCHAR(64) NOT NULL,
    "booking_id" UUID,
    "customer_id" UUID NOT NULL,
    "property_id" UUID,
    "project_id" UUID,
    "amount_paisa" BIGINT NOT NULL,
    "payment_type" VARCHAR(32) NOT NULL DEFAULT 'BOOKING_MONEY',
    "payment_method" VARCHAR(32) NOT NULL DEFAULT 'BANK',
    "status" VARCHAR(32) NOT NULL DEFAULT 'Draft',
    "is_draft" BOOLEAN NOT NULL DEFAULT true,
    "bank_name" VARCHAR(128),
    "bank_branch" VARCHAR(128),
    "account_number" VARCHAR(64),
    "cheque_number" VARCHAR(64),
    "cheque_date" DATE,
    "cheque_status" VARCHAR(32),
    "transaction_reference" VARCHAR(128),
    "card_type" VARCHAR(32),
    "card_last_4" VARCHAR(4),
    "pos_terminal_id" VARCHAR(64),
    "allocation_target" VARCHAR(64),
    "target_installment_id" UUID,
    "receipt_id" UUID,
    "journal_id" UUID,
    "payment_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "received_at" TIMESTAMPTZ(6),
    "posted_at" TIMESTAMPTZ(6),
    "posted_by_id" UUID,
    "notes" TEXT,
    "cancellation_reason" TEXT,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- 2. CreateTable payment_status_history
CREATE TABLE "payment_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "from_status" VARCHAR(32),
    "to_status" VARCHAR(32) NOT NULL,
    "reason" TEXT,
    "changed_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_status_history_pkey" PRIMARY KEY ("id")
);

-- 3. CreateTable payment_reversals
CREATE TABLE "payment_reversals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "reversal_number" VARCHAR(64) NOT NULL,
    "reason" TEXT NOT NULL,
    "approval_id" UUID,
    "journal_id" UUID,
    "reversed_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_reversals_pkey" PRIMARY KEY ("id")
);

-- 4. Constraints & Indexes
CREATE UNIQUE INDEX "payments_company_payment_number_key" ON "payments"("company_id", "payment_number");
CREATE INDEX "payments_company_id_status_created_at_idx" ON "payments"("company_id", "status", "created_at");
CREATE INDEX "payments_company_id_booking_id_idx" ON "payments"("company_id", "booking_id");
CREATE INDEX "payments_company_id_customer_id_idx" ON "payments"("company_id", "customer_id");
CREATE INDEX "payments_company_id_payment_date_idx" ON "payments"("company_id", "payment_date");

CREATE INDEX "payment_status_history_company_id_payment_id_idx" ON "payment_status_history"("company_id", "payment_id");

CREATE UNIQUE INDEX "payment_reversals_company_reversal_number_key" ON "payment_reversals"("company_id", "reversal_number");
CREATE INDEX "payment_reversals_company_id_payment_id_idx" ON "payment_reversals"("company_id", "payment_id");

-- Foreign Keys
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_status_history" ADD CONSTRAINT "payment_status_history_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_reversals" ADD CONSTRAINT "payment_reversals_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Row Level Security (RLS) enforcement
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "payments"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "payment_status_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_status_history" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "payment_status_history"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "payment_reversals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_reversals" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "payment_reversals"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- 6. [RULE-IMMUTABLE] Immutability Trigger
CREATE OR REPLACE FUNCTION enforce_payment_immutability()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Payments cannot be deleted (RULE-IMMUTABLE)';
  END IF;

  IF OLD.status = 'Posted' THEN
    RAISE EXCEPTION 'Posted payments are immutable and cannot be updated (RULE-IMMUTABLE)';
  END IF;

  IF OLD.status IN ('Reversed', 'Cancelled') THEN
    RAISE EXCEPTION 'Terminal payments cannot be updated (RULE-IMMUTABLE)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_immutability ON "payments";
CREATE TRIGGER trg_payment_immutability
  BEFORE UPDATE OR DELETE ON "payments"
  FOR EACH ROW EXECUTE FUNCTION enforce_payment_immutability();

-- 7. Role Grants & Revocations
GRANT SELECT, INSERT, UPDATE ON "payments" TO exza_app, exza_worker;
REVOKE DELETE ON "payments" FROM exza_app, exza_worker;
GRANT ALL ON "payments" TO exza_migrator;

GRANT SELECT, INSERT ON "payment_status_history" TO exza_app, exza_worker;
REVOKE UPDATE, DELETE ON "payment_status_history" FROM exza_app, exza_worker;
GRANT ALL ON "payment_status_history" TO exza_migrator;

GRANT SELECT, INSERT ON "payment_reversals" TO exza_app, exza_worker;
REVOKE UPDATE, DELETE ON "payment_reversals" FROM exza_app, exza_worker;
GRANT ALL ON "payment_reversals" TO exza_migrator;
