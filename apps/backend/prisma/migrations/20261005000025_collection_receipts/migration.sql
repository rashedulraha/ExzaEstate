-- Migration: 20261005000025_collection_receipts
-- Phase A7.2: Immutable Receipts Table & Immutability Trigger
-- PRD MOD-RECEIPT, BR-18, AT-21; architecture.md §10 (RULE-IMMUTABLE)

-- 1. CreateTable receipts
CREATE TABLE "receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "receipt_number" VARCHAR(64) NOT NULL,
    "payment_id" UUID NOT NULL,
    "booking_id" UUID,
    "customer_id" UUID NOT NULL,
    "property_id" UUID,
    "project_id" UUID,
    "amount_paisa" BIGINT NOT NULL,
    "amount_in_words" VARCHAR(255) NOT NULL,
    "previous_due_paisa" BIGINT NOT NULL DEFAULT 0,
    "current_due_paisa" BIGINT NOT NULL DEFAULT 0,
    "payment_method" VARCHAR(32) NOT NULL,
    "is_void" BOOLEAN NOT NULL DEFAULT false,
    "void_reason" TEXT,
    "voided_at" TIMESTAMPTZ(6),
    "voided_by_id" UUID,
    "reprint_count" INTEGER NOT NULL DEFAULT 0,
    "is_legacy" BOOLEAN NOT NULL DEFAULT false,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issued_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- 2. Constraints & Indexes
CREATE UNIQUE INDEX "receipts_company_receipt_number_unique" ON "receipts"("company_id", "receipt_number");
CREATE UNIQUE INDEX "receipts_payment_id_key" ON "receipts"("payment_id");
CREATE INDEX "receipts_company_id_idx" ON "receipts"("company_id");
CREATE INDEX "receipts_company_id_customer_id_idx" ON "receipts"("company_id", "customer_id");
CREATE INDEX "receipts_company_id_booking_id_idx" ON "receipts"("company_id", "booking_id");
CREATE INDEX "receipts_company_id_issued_at_idx" ON "receipts"("company_id", "issued_at");

-- 3. Foreign Keys
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Row Level Security (RLS) enforcement
ALTER TABLE "receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "receipts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "receipts"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- 5. [RULE-IMMUTABLE] Immutability Trigger
CREATE OR REPLACE FUNCTION enforce_receipt_immutability()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Receipts cannot be deleted (RULE-IMMUTABLE)';
  END IF;

  IF OLD.company_id <> NEW.company_id OR
     OLD.receipt_number <> NEW.receipt_number OR
     OLD.payment_id <> NEW.payment_id OR
     OLD.amount_paisa <> NEW.amount_paisa THEN
    RAISE EXCEPTION 'Financial fields of issued receipts are immutable (RULE-IMMUTABLE)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_receipt_immutability ON "receipts";
CREATE TRIGGER trg_receipt_immutability
  BEFORE UPDATE OR DELETE ON "receipts"
  FOR EACH ROW EXECUTE FUNCTION enforce_receipt_immutability();

-- 6. Role Grants & Revocations
GRANT SELECT, INSERT, UPDATE ON "receipts" TO exza_app, exza_worker;
REVOKE DELETE ON "receipts" FROM exza_app, exza_worker;
GRANT ALL ON "receipts" TO exza_migrator;
