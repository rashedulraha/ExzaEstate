-- Migration: 20261004000019_accounting_coa
-- Phase A6: Chart of Accounts & Account Balances (A6.1)
-- PRD MOD-COA, MOD-ARAP; architecture.md §10, §11; accounting-rules.md §1

-- 1. CreateTable accounts
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "parent_id" UUID,
    "is_group" BOOLEAN NOT NULL DEFAULT false,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "party_type" VARCHAR(32),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- 2. Foreign Keys
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Indexes & Unique Constraints
CREATE UNIQUE INDEX "accounts_company_id_code_key" ON "accounts"("company_id", "code");
CREATE INDEX "accounts_company_id_type_idx" ON "accounts"("company_id", "type");
CREATE INDEX "accounts_company_id_parent_id_idx" ON "accounts"("company_id", "parent_id");
CREATE INDEX "accounts_company_id_is_active_idx" ON "accounts"("company_id", "is_active");

-- 4. Row Level Security (RLS) enforcement
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "accounts"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- 5. Role Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON "accounts" TO exza_app, exza_worker;
GRANT ALL ON "accounts" TO exza_migrator;
