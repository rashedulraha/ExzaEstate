-- Migration: 20261008000028_p2_procurement_pr_po_grn
-- Phase P2 Procurement Tables: Purchase Requests, Purchase Orders, Goods Receipts
-- PRD MOD-VENDOR (P2), architecture.md §5.2, security.md §3

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS "purchase_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "pr_number" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "project_id" UUID,
    "department" VARCHAR(64),
    "requested_by_id" UUID NOT NULL,
    "requested_by_name" VARCHAR(255),
    "required_date" DATE,
    "priority" VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
    "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    "total_estimated_paisa" BIGINT NOT NULL DEFAULT 0,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "purchase_request_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "pr_id" UUID NOT NULL,
    "item_description" VARCHAR(255) NOT NULL,
    "category" VARCHAR(64) NOT NULL DEFAULT 'GENERAL',
    "quantity" DECIMAL(14, 2) NOT NULL,
    "unit" VARCHAR(32) NOT NULL DEFAULT 'PCS',
    "estimated_unit_price_paisa" BIGINT NOT NULL DEFAULT 0,
    "estimated_amount_paisa" BIGINT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "purchase_request_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "purchase_request_lines_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "purchase_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "po_number" VARCHAR(64) NOT NULL,
    "pr_id" UUID,
    "vendor_id" UUID NOT NULL,
    "project_id" UUID,
    "order_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "expected_delivery_date" DATE,
    "delivery_address" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    "total_amount_paisa" BIGINT NOT NULL,
    "received_amount_paisa" BIGINT NOT NULL DEFAULT 0,
    "billed_amount_paisa" BIGINT NOT NULL DEFAULT 0,
    "notes" TEXT,
    "terms_and_conditions" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "purchase_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "purchase_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "purchase_order_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "po_id" UUID NOT NULL,
    "pr_line_id" UUID,
    "item_description" VARCHAR(255) NOT NULL,
    "category" VARCHAR(64) NOT NULL DEFAULT 'GENERAL',
    "quantity" DECIMAL(14, 2) NOT NULL,
    "received_quantity" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "billed_quantity" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "unit" VARCHAR(32) NOT NULL DEFAULT 'PCS',
    "unit_price_paisa" BIGINT NOT NULL,
    "total_amount_paisa" BIGINT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "purchase_order_lines_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_order_lines_pr_line_id_fkey" FOREIGN KEY ("pr_line_id") REFERENCES "purchase_request_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "goods_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "grn_number" VARCHAR(64) NOT NULL,
    "po_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "project_id" UUID,
    "receipt_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "challan_number" VARCHAR(128),
    "status" VARCHAR(32) NOT NULL DEFAULT 'RECEIVED',
    "received_by_id" UUID NOT NULL,
    "received_by_name" VARCHAR(255),
    "total_amount_paisa" BIGINT NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "goods_receipts_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "goods_receipts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "goods_receipt_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "grn_id" UUID NOT NULL,
    "po_line_id" UUID,
    "item_description" VARCHAR(255) NOT NULL,
    "received_quantity" DECIMAL(14, 2) NOT NULL,
    "accepted_quantity" DECIMAL(14, 2) NOT NULL,
    "rejected_quantity" DECIMAL(14, 2) NOT NULL DEFAULT 0,
    "unit" VARCHAR(32) NOT NULL DEFAULT 'PCS',
    "unit_price_paisa" BIGINT NOT NULL,
    "total_amount_paisa" BIGINT NOT NULL,
    "rejection_reason" TEXT,
    "notes" TEXT,
    CONSTRAINT "goods_receipt_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "goods_receipt_lines_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "goods_receipt_lines_po_line_id_fkey" FOREIGN KEY ("po_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Alter vendor_bills to add po_id and grn_id
ALTER TABLE "vendor_bills" ADD COLUMN IF NOT EXISTS "po_id" UUID REFERENCES "purchase_orders"("id") ON DELETE SET NULL;
ALTER TABLE "vendor_bills" ADD COLUMN IF NOT EXISTS "grn_id" UUID REFERENCES "goods_receipts"("id") ON DELETE SET NULL;

-- 2. Indexes & Unique Constraints
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requests_company_id_pr_number_key" ON "purchase_requests"("company_id", "pr_number");
CREATE INDEX IF NOT EXISTS "purchase_requests_company_id_idx" ON "purchase_requests"("company_id");
CREATE INDEX IF NOT EXISTS "purchase_requests_company_id_status_idx" ON "purchase_requests"("company_id", "status");
CREATE INDEX IF NOT EXISTS "purchase_requests_company_id_project_id_idx" ON "purchase_requests"("company_id", "project_id");

CREATE INDEX IF NOT EXISTS "purchase_request_lines_company_id_idx" ON "purchase_request_lines"("company_id");
CREATE INDEX IF NOT EXISTS "purchase_request_lines_company_id_pr_id_idx" ON "purchase_request_lines"("company_id", "pr_id");

CREATE UNIQUE INDEX IF NOT EXISTS "purchase_orders_company_id_po_number_key" ON "purchase_orders"("company_id", "po_number");
CREATE INDEX IF NOT EXISTS "purchase_orders_company_id_idx" ON "purchase_orders"("company_id");
CREATE INDEX IF NOT EXISTS "purchase_orders_company_id_status_idx" ON "purchase_orders"("company_id", "status");
CREATE INDEX IF NOT EXISTS "purchase_orders_company_id_vendor_id_idx" ON "purchase_orders"("company_id", "vendor_id");
CREATE INDEX IF NOT EXISTS "purchase_orders_company_id_project_id_idx" ON "purchase_orders"("company_id", "project_id");
CREATE INDEX IF NOT EXISTS "purchase_orders_company_id_pr_id_idx" ON "purchase_orders"("company_id", "pr_id");

CREATE INDEX IF NOT EXISTS "purchase_order_lines_company_id_idx" ON "purchase_order_lines"("company_id");
CREATE INDEX IF NOT EXISTS "purchase_order_lines_company_id_po_id_idx" ON "purchase_order_lines"("company_id", "po_id");
CREATE INDEX IF NOT EXISTS "purchase_order_lines_company_id_pr_line_id_idx" ON "purchase_order_lines"("company_id", "pr_line_id");

CREATE UNIQUE INDEX IF NOT EXISTS "goods_receipts_company_id_grn_number_key" ON "goods_receipts"("company_id", "grn_number");
CREATE INDEX IF NOT EXISTS "goods_receipts_company_id_idx" ON "goods_receipts"("company_id");
CREATE INDEX IF NOT EXISTS "goods_receipts_company_id_po_id_idx" ON "goods_receipts"("company_id", "po_id");
CREATE INDEX IF NOT EXISTS "goods_receipts_company_id_vendor_id_idx" ON "goods_receipts"("company_id", "vendor_id");
CREATE INDEX IF NOT EXISTS "goods_receipts_company_id_status_idx" ON "goods_receipts"("company_id", "status");

CREATE INDEX IF NOT EXISTS "goods_receipt_lines_company_id_idx" ON "goods_receipt_lines"("company_id");
CREATE INDEX IF NOT EXISTS "goods_receipt_lines_company_id_grn_id_idx" ON "goods_receipt_lines"("company_id", "grn_id");
CREATE INDEX IF NOT EXISTS "goods_receipt_lines_company_id_po_line_id_idx" ON "goods_receipt_lines"("company_id", "po_line_id");

CREATE INDEX IF NOT EXISTS "vendor_bills_company_id_po_id_idx" ON "vendor_bills"("company_id", "po_id");
CREATE INDEX IF NOT EXISTS "vendor_bills_company_id_grn_id_idx" ON "vendor_bills"("company_id", "grn_id");

-- 3. Row Level Security (RLS)
ALTER TABLE "purchase_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "purchase_requests"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "purchase_request_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_request_lines" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "purchase_request_lines"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "purchase_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_orders" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "purchase_orders"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "purchase_order_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_order_lines" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "purchase_order_lines"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "goods_receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "goods_receipts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "goods_receipts"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "goods_receipt_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "goods_receipt_lines" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "goods_receipt_lines"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- 4. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON "purchase_requests", "purchase_request_lines", "purchase_orders", "purchase_order_lines", "goods_receipts", "goods_receipt_lines" TO exza_app, exza_worker;
GRANT ALL ON "purchase_requests", "purchase_request_lines", "purchase_orders", "purchase_order_lines", "goods_receipts", "goods_receipt_lines" TO exza_migrator;
