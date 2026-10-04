-- Migration: 20261004000016_sales_bookings
-- Phase A5: Bookings & Concurrency Guards (A5.1 - A5.5)
-- PRD MOD-BOOKING, §9.1, FLOW-06, BR-01, BR-05, BR-19, AT-17; architecture.md §7.1, §10, §22.3, §22.4

-- 1. CreateTable bookings
CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "booking_number" VARCHAR(64) NOT NULL,
    "property_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "lead_id" UUID,
    "quotation_id" UUID,
    "sales_executive_id" UUID NOT NULL,
    "broker_id" UUID,
    "status" VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
    "base_price_paisa" BIGINT NOT NULL DEFAULT 0,
    "total_price_paisa" BIGINT NOT NULL DEFAULT 0,
    "discount_amount_paisa" BIGINT NOT NULL DEFAULT 0,
    "discount_percentage" DECIMAL(5, 2),
    "net_price_paisa" BIGINT NOT NULL DEFAULT 0,
    "booking_amount_paisa" BIGINT NOT NULL DEFAULT 0,
    "down_payment_paisa" BIGINT NOT NULL DEFAULT 0,
    "total_paid_paisa" BIGINT NOT NULL DEFAULT 0,
    "approval_id" UUID,
    "approval_status" VARCHAR(32),
    "payment_plan_template_id" UUID,
    "payment_plan_config" JSONB,
    "charges_snapshot" JSONB,
    "booking_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reservation_hold_hours" INTEGER NOT NULL DEFAULT 72,
    "reservation_expires_at" TIMESTAMPTZ(6),
    "confirmed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" TEXT,
    "cancellation_deduction_paisa" BIGINT,
    "refund_amount_paisa" BIGINT,
    "transferred_at" TIMESTAMPTZ(6),
    "successor_booking_id" UUID,
    "predecessor_booking_id" UUID,
    "is_legacy" BOOLEAN NOT NULL DEFAULT false,
    "is_transfer" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "terms" TEXT,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- 2. CreateTable booking_customers
CREATE TABLE "booking_customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "share_percentage" DECIMAL(5, 2) NOT NULL DEFAULT 100.0,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_customers_pkey" PRIMARY KEY ("id")
);

-- 3. CreateTable booking_charges
CREATE TABLE "booking_charges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "charge_type_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "calculation_type" VARCHAR(32) NOT NULL,
    "rate" DECIMAL(10, 4),
    "amount_paisa" BIGINT NOT NULL,
    "vat_rate" DECIMAL(5, 2) NOT NULL DEFAULT 0,
    "vat_amount_paisa" BIGINT NOT NULL DEFAULT 0,
    "total_amount_paisa" BIGINT NOT NULL,
    "is_included_in_net" BOOLEAN NOT NULL DEFAULT false,
    "payable_stage" VARCHAR(32) NOT NULL,
    "paid_amount_paisa" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_charges_pkey" PRIMARY KEY ("id")
);

-- 4. CreateTable booking_status_history
CREATE TABLE "booking_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "from_status" VARCHAR(32),
    "to_status" VARCHAR(32) NOT NULL,
    "reason" TEXT,
    "changed_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- 5. Foreign Keys
ALTER TABLE "booking_customers" ADD CONSTRAINT "booking_customers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_charges" ADD CONSTRAINT "booking_charges_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Indexes & Unique Constraints
CREATE UNIQUE INDEX "bookings_company_id_booking_number_key" ON "bookings"("company_id", "booking_number");
CREATE INDEX "bookings_company_id_idx" ON "bookings"("company_id");
CREATE INDEX "bookings_company_id_status_idx" ON "bookings"("company_id", "status");
CREATE INDEX "bookings_company_id_property_id_idx" ON "bookings"("company_id", "property_id");
CREATE INDEX "bookings_company_id_customer_id_idx" ON "bookings"("company_id", "customer_id");
CREATE INDEX "bookings_company_id_quotation_id_idx" ON "bookings"("company_id", "quotation_id");
CREATE INDEX "bookings_company_id_sales_executive_id_idx" ON "bookings"("company_id", "sales_executive_id");
CREATE INDEX "bookings_company_id_reservation_expires_at_idx" ON "bookings"("company_id", "reservation_expires_at");
CREATE INDEX "bookings_company_id_created_at_idx" ON "bookings"("company_id", "created_at");

CREATE UNIQUE INDEX "booking_customers_company_id_booking_id_customer_id_key" ON "booking_customers"("company_id", "booking_id", "customer_id");
CREATE INDEX "booking_customers_company_id_idx" ON "booking_customers"("company_id");
CREATE INDEX "booking_customers_company_id_booking_id_idx" ON "booking_customers"("company_id", "booking_id");
CREATE INDEX "booking_customers_company_id_customer_id_idx" ON "booking_customers"("company_id", "customer_id");

CREATE INDEX "booking_charges_company_id_idx" ON "booking_charges"("company_id");
CREATE INDEX "booking_charges_company_id_booking_id_idx" ON "booking_charges"("company_id", "booking_id");

CREATE INDEX "booking_status_history_company_id_idx" ON "booking_status_history"("company_id");
CREATE INDEX "booking_status_history_company_id_booking_id_idx" ON "booking_status_history"("company_id", "booking_id");

-- 7. [RULE-BOOKING-RACE] Partial Unique Index for Active Booking Statuses (PRD §9.1, architecture.md §10)
CREATE UNIQUE INDEX "bookings_active_property_idx" ON "bookings"("property_id")
WHERE status IN ('REQUESTED', 'PENDING_APPROVAL', 'CONFIRMED', 'AGREEMENT_PENDING', 'AGREEMENT_COMPLETED', 'COMPLETED')
AND deleted_at IS NULL;

-- 8. Row Level Security (RLS) enforcement
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "bookings"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "booking_customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "booking_customers" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "booking_customers"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "booking_charges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "booking_charges" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "booking_charges"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "booking_status_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "booking_status_history" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "booking_status_history"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- 9. Role Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON "bookings" TO exza_app, exza_worker;
GRANT ALL ON "bookings" TO exza_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON "booking_customers" TO exza_app, exza_worker;
GRANT ALL ON "booking_customers" TO exza_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON "booking_charges" TO exza_app, exza_worker;
GRANT ALL ON "booking_charges" TO exza_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON "booking_status_history" TO exza_app, exza_worker;
GRANT ALL ON "booking_status_history" TO exza_migrator;
