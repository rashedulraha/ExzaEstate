-- Migration: 20261004000011_crm_customers
-- Task A3.3: Customer 360 & KYC
-- PRD MOD-CUSTOMER; architecture.md §11, §14; security.md §6, §15

-- 1. CreateTable crm_customers
CREATE TABLE "crm_customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "customer_number" VARCHAR(64) NOT NULL,
    "customer_type" VARCHAR(32) NOT NULL DEFAULT 'INDIVIDUAL',
    "name" VARCHAR(255) NOT NULL,
    "father_or_spouse_name" VARCHAR(255),
    "mother_name" VARCHAR(255),
    "date_of_birth" DATE,
    "occupation" VARCHAR(128),
    "nationality" VARCHAR(64) NOT NULL DEFAULT 'Bangladeshi',
    "is_nrb" BOOLEAN NOT NULL DEFAULT false,
    "phone" VARCHAR(32) NOT NULL,
    "email" VARCHAR(255),
    "photo_url" VARCHAR(512),

    -- Encrypted PII fields (AES-256-GCM) with blind indexes (HMAC-SHA256)
    "nid_encrypted" TEXT,
    "nid_bidx" VARCHAR(64),
    "passport_encrypted" TEXT,
    "passport_bidx" VARCHAR(64),
    "tin_encrypted" TEXT,
    "tin_bidx" VARCHAR(64),
    "bank_account_encrypted" TEXT,
    "bank_account_bidx" VARCHAR(64),
    "bank_name" VARCHAR(128),
    "bank_branch" VARCHAR(128),
    "bank_routing_number" VARCHAR(32),

    -- Foreign remittance informational fields for NRB
    "original_currency" VARCHAR(8),
    "remittance_reference" VARCHAR(128),

    -- KYC completeness status
    "is_kyc_completed" BOOLEAN NOT NULL DEFAULT false,
    "kyc_completed_at" TIMESTAMPTZ,
    "kyc_completed_by_id" UUID,
    "kyc_notes" TEXT,

    -- Scoping, attribution and lifecycle
    "lead_id" UUID,
    "branch_id" UUID,
    "assigned_to_id" UUID,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_customers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "crm_customers_company_id_customer_number_key" UNIQUE ("company_id", "customer_number")
);

-- 2. CreateTable crm_customer_contacts
CREATE TABLE "crm_customer_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "relationship" VARCHAR(64),
    "phone" VARCHAR(32) NOT NULL,
    "email" VARCHAR(255),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_customer_contacts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "crm_customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. CreateTable crm_customer_addresses
CREATE TABLE "crm_customer_addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "address_line1" VARCHAR(255) NOT NULL,
    "address_line2" VARCHAR(255),
    "city" VARCHAR(64) NOT NULL,
    "division" VARCHAR(64),
    "postal_code" VARCHAR(16),
    "country" VARCHAR(64) NOT NULL DEFAULT 'Bangladesh',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_customer_addresses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "crm_customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. CreateTable crm_customer_nominees
CREATE TABLE "crm_customer_nominees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "relationship" VARCHAR(64) NOT NULL,
    "phone" VARCHAR(32),
    "email" VARCHAR(255),
    "nid_encrypted" TEXT,
    "nid_bidx" VARCHAR(64),
    "address" TEXT,
    "photo_url" VARCHAR(512),
    "share_percentage" DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    "is_power_of_attorney" BOOLEAN NOT NULL DEFAULT false,
    "poa_document_number" VARCHAR(128),
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_customer_nominees_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "crm_customer_nominees_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 5. CreateTable crm_customer_co_buyers
CREATE TABLE "crm_customer_co_buyers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "primary_customer_id" UUID NOT NULL,
    "co_buyer_customer_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "relationship" VARCHAR(64),
    "phone" VARCHAR(32) NOT NULL,
    "email" VARCHAR(255),
    "nid_encrypted" TEXT,
    "nid_bidx" VARCHAR(64),
    "share_percentage" DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_customer_co_buyers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "crm_customer_co_buyers_primary_customer_id_fkey" FOREIGN KEY ("primary_customer_id") REFERENCES "crm_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 6. Link FollowUp to Customer
ALTER TABLE "crm_follow_ups"
    ADD CONSTRAINT "crm_follow_ups_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Indexes
CREATE INDEX "crm_customers_company_id_idx" ON "crm_customers"("company_id");
CREATE INDEX "crm_customers_company_id_phone_idx" ON "crm_customers"("company_id", "phone");
CREATE INDEX "crm_customers_company_id_email_idx" ON "crm_customers"("company_id", "email");
CREATE INDEX "crm_customers_company_id_nid_bidx_idx" ON "crm_customers"("company_id", "nid_bidx");
CREATE INDEX "crm_customers_company_id_passport_bidx_idx" ON "crm_customers"("company_id", "passport_bidx");
CREATE INDEX "crm_customers_company_id_tin_bidx_idx" ON "crm_customers"("company_id", "tin_bidx");
CREATE INDEX "crm_customers_company_id_bank_account_bidx_idx" ON "crm_customers"("company_id", "bank_account_bidx");
CREATE INDEX "crm_customers_company_id_branch_id_idx" ON "crm_customers"("company_id", "branch_id");
CREATE INDEX "crm_customers_company_id_assigned_to_id_idx" ON "crm_customers"("company_id", "assigned_to_id");
CREATE INDEX "crm_customers_company_id_is_kyc_completed_idx" ON "crm_customers"("company_id", "is_kyc_completed");
CREATE INDEX "crm_customers_company_id_created_at_idx" ON "crm_customers"("company_id", "created_at");

CREATE INDEX "crm_customer_contacts_company_id_idx" ON "crm_customer_contacts"("company_id");
CREATE INDEX "crm_customer_contacts_company_id_customer_id_idx" ON "crm_customer_contacts"("company_id", "customer_id");

CREATE INDEX "crm_customer_addresses_company_id_idx" ON "crm_customer_addresses"("company_id");
CREATE INDEX "crm_customer_addresses_company_id_customer_id_idx" ON "crm_customer_addresses"("company_id", "customer_id");

CREATE INDEX "crm_customer_nominees_company_id_idx" ON "crm_customer_nominees"("company_id");
CREATE INDEX "crm_customer_nominees_company_id_customer_id_idx" ON "crm_customer_nominees"("company_id", "customer_id");

CREATE INDEX "crm_customer_co_buyers_company_id_idx" ON "crm_customer_co_buyers"("company_id");
CREATE INDEX "crm_customer_co_buyers_company_id_primary_customer_id_idx" ON "crm_customer_co_buyers"("company_id", "primary_customer_id");

-- 8. Row Level Security (RLS) enforcement
ALTER TABLE "crm_customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_customers" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "crm_customers"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "crm_customer_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_customer_contacts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "crm_customer_contacts"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "crm_customer_addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_customer_addresses" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "crm_customer_addresses"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "crm_customer_nominees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_customer_nominees" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "crm_customer_nominees"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "crm_customer_co_buyers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_customer_co_buyers" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "crm_customer_co_buyers"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- 9. Role Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm_customers", "crm_customer_contacts", "crm_customer_addresses", "crm_customer_nominees", "crm_customer_co_buyers" TO exza_app, exza_worker;
GRANT ALL ON "crm_customers", "crm_customer_contacts", "crm_customer_addresses", "crm_customer_nominees", "crm_customer_co_buyers" TO exza_migrator;
