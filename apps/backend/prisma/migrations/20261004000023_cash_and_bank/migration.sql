-- Migration: 20261004000023_cash_and_bank
-- Phase A6.5: Cash & Bank Accounts, Transfers & Reconciliation
-- PRD MOD-CASHBANK; accounting-rules.md §3.9, §3.2; architecture.md §5.5

-- 1. Global Reference Tables (ARCH-GLOBAL-DATA, architecture.md §5.5)
CREATE TABLE IF NOT EXISTS "banks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(128) NOT NULL,
  "code" VARCHAR(32) NOT NULL,
  "swift_code" VARCHAR(32),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "banks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "banks_code_key" UNIQUE ("code")
);

CREATE TABLE IF NOT EXISTS "bank_branches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "bank_id" UUID NOT NULL REFERENCES "banks"("id") ON DELETE RESTRICT,
  "name" VARCHAR(128) NOT NULL,
  "routing_number" VARCHAR(32) NOT NULL,
  "district" VARCHAR(64),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "bank_branches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bank_branches_routing_number_key" UNIQUE ("routing_number")
);

CREATE INDEX IF NOT EXISTS "bank_branches_bank_id_idx" ON "bank_branches"("bank_id");

-- Grants for global reference tables
GRANT SELECT ON "banks", "bank_branches" TO exza_app, exza_worker;
GRANT ALL ON "banks", "bank_branches" TO exza_migrator;

-- 2. Tenant Table: bank_accounts
CREATE TABLE "bank_accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "account_type" VARCHAR(32) NOT NULL DEFAULT 'BANK',
  "name" VARCHAR(128) NOT NULL,
  "account_number_enc" TEXT,
  "account_number_bidx" VARCHAR(64),
  "account_number_masked" VARCHAR(32),
  "bank_id" UUID REFERENCES "banks"("id") ON DELETE RESTRICT,
  "branch_id" UUID REFERENCES "bank_branches"("id") ON DELETE RESTRICT,
  "routing_number" VARCHAR(32),
  "swift_code" VARCHAR(32),
  "currency" VARCHAR(8) NOT NULL DEFAULT 'BDT',
  "coa_account_id" UUID NOT NULL REFERENCES "accounts"("id") ON DELETE RESTRICT,
  "coa_account_code" VARCHAR(16) NOT NULL,
  "initial_balance_paisa" BIGINT NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bank_accounts_company_id_coa_account_id_key" UNIQUE ("company_id", "coa_account_id")
);

CREATE INDEX "bank_accounts_company_id_account_type_idx" ON "bank_accounts"("company_id", "account_type");
CREATE INDEX "bank_accounts_company_id_is_active_idx" ON "bank_accounts"("company_id", "is_active");
CREATE INDEX "bank_accounts_company_id_account_number_bidx_idx" ON "bank_accounts"("company_id", "account_number_bidx");

ALTER TABLE "bank_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_accounts" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_policy" ON "bank_accounts"
  FOR ALL
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "bank_accounts" TO exza_app, exza_worker;
GRANT ALL ON "bank_accounts" TO exza_migrator;

-- 3. Tenant Table: cash_transfers
CREATE TABLE "cash_transfers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "transfer_number" VARCHAR(64) NOT NULL,
  "source_bank_account_id" UUID NOT NULL REFERENCES "bank_accounts"("id") ON DELETE RESTRICT,
  "destination_bank_account_id" UUID NOT NULL REFERENCES "bank_accounts"("id") ON DELETE RESTRICT,
  "amount_paisa" BIGINT NOT NULL,
  "transfer_date" DATE NOT NULL,
  "reference_number" VARCHAR(128),
  "narration" TEXT,
  "journal_id" UUID NOT NULL UNIQUE REFERENCES "journals"("id") ON DELETE RESTRICT,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cash_transfers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cash_transfers_company_id_transfer_number_key" UNIQUE ("company_id", "transfer_number")
);

CREATE INDEX "cash_transfers_company_id_transfer_date_idx" ON "cash_transfers"("company_id", "transfer_date");
CREATE INDEX "cash_transfers_company_id_source_bank_account_id_idx" ON "cash_transfers"("company_id", "source_bank_account_id");
CREATE INDEX "cash_transfers_company_id_destination_bank_account_id_idx" ON "cash_transfers"("company_id", "destination_bank_account_id");

ALTER TABLE "cash_transfers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_transfers" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_policy" ON "cash_transfers"
  FOR ALL
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "cash_transfers" TO exza_app, exza_worker;
GRANT ALL ON "cash_transfers" TO exza_migrator;

-- 4. Tenant Table: bank_reconciliations
CREATE TABLE "bank_reconciliations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "bank_account_id" UUID NOT NULL REFERENCES "bank_accounts"("id") ON DELETE RESTRICT,
  "statement_date" DATE NOT NULL,
  "statement_balance_paisa" BIGINT NOT NULL,
  "book_balance_paisa" BIGINT NOT NULL,
  "reconciled_balance_paisa" BIGINT NOT NULL DEFAULT 0,
  "difference_paisa" BIGINT NOT NULL DEFAULT 0,
  "status" VARCHAR(32) NOT NULL DEFAULT 'Draft',
  "completed_at" TIMESTAMPTZ,
  "completed_by_id" UUID,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "bank_reconciliations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bank_reconciliations_company_id_bank_account_id_idx" ON "bank_reconciliations"("company_id", "bank_account_id");
CREATE INDEX "bank_reconciliations_company_id_statement_date_idx" ON "bank_reconciliations"("company_id", "statement_date");

ALTER TABLE "bank_reconciliations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_reconciliations" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_policy" ON "bank_reconciliations"
  FOR ALL
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "bank_reconciliations" TO exza_app, exza_worker;
GRANT ALL ON "bank_reconciliations" TO exza_migrator;

-- 5. Tenant Table: bank_reconciliation_items
CREATE TABLE "bank_reconciliation_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "reconciliation_id" UUID NOT NULL REFERENCES "bank_reconciliations"("id") ON DELETE CASCADE,
  "journal_line_id" UUID NOT NULL REFERENCES "journal_lines"("id") ON DELETE RESTRICT,
  "cleared_date" DATE NOT NULL,
  "is_cleared" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "bank_reconciliation_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bank_reconciliation_items_company_id_journal_line_id_key" UNIQUE ("company_id", "journal_line_id")
);

CREATE INDEX "bank_reconciliation_items_company_id_reconciliation_id_idx" ON "bank_reconciliation_items"("company_id", "reconciliation_id");

ALTER TABLE "bank_reconciliation_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_reconciliation_items" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_policy" ON "bank_reconciliation_items"
  FOR ALL
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "bank_reconciliation_items" TO exza_app, exza_worker;
GRANT ALL ON "bank_reconciliation_items" TO exza_migrator;
