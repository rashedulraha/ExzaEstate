-- CreateTable
CREATE TABLE "lands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "district" VARCHAR(128) NOT NULL,
    "upazila" VARCHAR(128) NOT NULL,
    "mouza" VARCHAR(128) NOT NULL,
    "jl_number" VARCHAR(64),
    "khatian_number" VARCHAR(128),
    "dag_number" VARCHAR(128),
    "deed_number" VARCHAR(128),
    "deed_date" DATE,
    "recorded_owners" TEXT,
    "area_sqft" DECIMAL(18,4) NOT NULL,
    "entered_area" DECIMAL(18,4),
    "entered_unit" VARCHAR(32),
    "purchase_price_paisa" BIGINT,
    "legal_cost_paisa" BIGINT,
    "development_cost_paisa" BIGINT,
    "mutation_status" VARCHAR(64),
    "tax_status" VARCHAR(64),
    "ownership_status" VARCHAR(64),
    "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "remarks" TEXT,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "lands_pkey" PRIMARY KEY ("id")
);

-- Unique constraints (partial for soft-delete support)
CREATE UNIQUE INDEX "lands_company_id_code_key" ON "lands"("company_id", "code") WHERE "deleted_at" IS NULL;

-- Indexes
CREATE INDEX "lands_company_id_idx" ON "lands"("company_id");
CREATE INDEX "lands_company_id_status_idx" ON "lands"("company_id", "status");
CREATE INDEX "lands_company_id_district_upazila_idx" ON "lands"("company_id", "district", "upazila");

-- Row Level Security (RLS) enforcement
ALTER TABLE "lands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lands" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "lands"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON "lands" TO exza_app;
GRANT ALL ON "lands" TO exza_migrator;
