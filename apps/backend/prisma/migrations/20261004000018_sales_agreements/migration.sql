-- Migration: 20261004000018_sales_agreements
-- Phase A5: Agreement Generation, Locking & Versioning (A5.4)
-- PRD MOD-AGREEMENT, §9.1, §9.5, FLOW-08; architecture.md §7.1, §10

-- 1. CreateTable agreement_templates
CREATE TABLE "agreement_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "template_body" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agreement_templates_pkey" PRIMARY KEY ("id")
);

-- 2. CreateTable agreements
CREATE TABLE "agreements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "agreement_number" VARCHAR(64) NOT NULL,
    "booking_id" UUID NOT NULL,
    "template_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(32) NOT NULL DEFAULT 'Draft',
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "terms" TEXT,
    "signed_at" TIMESTAMPTZ(6),
    "signed_by_id" UUID,
    "document_id" UUID,
    "superseded_by_id" UUID,
    "notes" TEXT,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agreements_pkey" PRIMARY KEY ("id")
);

-- 3. Foreign Keys
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "agreement_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_superseded_by_id_fkey" FOREIGN KEY ("superseded_by_id") REFERENCES "agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Indexes & Unique Constraints
CREATE UNIQUE INDEX "agreement_templates_company_id_code_key" ON "agreement_templates"("company_id", "code");
CREATE INDEX "agreement_templates_company_id_idx" ON "agreement_templates"("company_id");

CREATE UNIQUE INDEX "agreements_company_id_agreement_number_version_key" ON "agreements"("company_id", "agreement_number", "version");
CREATE INDEX "agreements_company_id_idx" ON "agreements"("company_id");
CREATE INDEX "agreements_company_id_booking_id_idx" ON "agreements"("company_id", "booking_id");
CREATE INDEX "agreements_company_id_status_idx" ON "agreements"("company_id", "status");

-- 5. Row Level Security (RLS) enforcement
ALTER TABLE "agreement_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agreement_templates" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "agreement_templates"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "agreements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agreements" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "agreements"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- 6. Role Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON "agreement_templates" TO exza_app, exza_worker;
GRANT ALL ON "agreement_templates" TO exza_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON "agreements" TO exza_app, exza_worker;
GRANT ALL ON "agreements" TO exza_migrator;
