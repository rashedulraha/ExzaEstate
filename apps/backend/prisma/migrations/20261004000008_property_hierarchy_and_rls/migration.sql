-- Migration: 20261004000008_property_hierarchy_and_rls
-- Task A2.1: Property Data Model, Hierarchy & RLS

-- 1. CreateTable property_blocks
CREATE TABLE "property_blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(32) NOT NULL DEFAULT 'BLOCK',
    "description" TEXT,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "property_blocks_pkey" PRIMARY KEY ("id")
);

-- 2. CreateTable property_floors
CREATE TABLE "property_floors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "block_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "floor_number" INTEGER,
    "type" VARCHAR(32) NOT NULL DEFAULT 'FLOOR',
    "description" TEXT,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "property_floors_pkey" PRIMARY KEY ("id")
);

-- 3. CreateTable properties
CREATE TABLE "properties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "block_id" UUID,
    "floor_id" UUID,
    "code" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255),
    "type" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'Available',
    "area_sqft" DECIMAL(18,4) NOT NULL,
    "facing" VARCHAR(32),
    "base_price_paisa" BIGINT NOT NULL DEFAULT 0,
    "premium_paisa" BIGINT NOT NULL DEFAULT 0,
    "discount_limit_pct" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "net_price_paisa" BIGINT NOT NULL DEFAULT 0,
    "owner_type" VARCHAR(32) NOT NULL DEFAULT 'COMPANY',
    "hold_expires_at" TIMESTAMPTZ,
    "block_reason" TEXT,
    "description" TEXT,
    "metadata" JSONB DEFAULT '{}'::jsonb,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- 4. CreateTable property_status_history
CREATE TABLE "property_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "from_status" VARCHAR(32),
    "to_status" VARCHAR(32) NOT NULL,
    "reason" TEXT,
    "changed_by_id" UUID,
    "metadata" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_status_history_pkey" PRIMARY KEY ("id")
);

-- 5. Foreign Keys
ALTER TABLE "property_blocks"
    ADD CONSTRAINT "property_blocks_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "property_floors"
    ADD CONSTRAINT "property_floors_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "property_floors"
    ADD CONSTRAINT "property_floors_block_id_fkey"
    FOREIGN KEY ("block_id") REFERENCES "property_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "properties"
    ADD CONSTRAINT "properties_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "properties"
    ADD CONSTRAINT "properties_block_id_fkey"
    FOREIGN KEY ("block_id") REFERENCES "property_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "properties"
    ADD CONSTRAINT "properties_floor_id_fkey"
    FOREIGN KEY ("floor_id") REFERENCES "property_floors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "property_status_history"
    ADD CONSTRAINT "property_status_history_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Partial Unique Constraints (WHERE deleted_at IS NULL)
CREATE UNIQUE INDEX "property_blocks_company_id_project_id_code_key"
    ON "property_blocks"("company_id", "project_id", "code")
    WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "property_floors_company_id_block_id_code_key"
    ON "property_floors"("company_id", "block_id", "code")
    WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "properties_company_id_project_id_code_key"
    ON "properties"("company_id", "project_id", "code")
    WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "properties_project_id_code_deleted_at_null_idx"
    ON "properties"("project_id", "code")
    WHERE "deleted_at" IS NULL;

-- 7. Performance & Filtering Indexes
CREATE INDEX "property_blocks_company_id_idx" ON "property_blocks"("company_id");
CREATE INDEX "property_blocks_company_id_project_id_idx" ON "property_blocks"("company_id", "project_id");

CREATE INDEX "property_floors_company_id_idx" ON "property_floors"("company_id");
CREATE INDEX "property_floors_company_id_project_id_idx" ON "property_floors"("company_id", "project_id");
CREATE INDEX "property_floors_company_id_block_id_idx" ON "property_floors"("company_id", "block_id");

CREATE INDEX "properties_company_id_idx" ON "properties"("company_id");
CREATE INDEX "properties_company_id_project_id_idx" ON "properties"("company_id", "project_id");
CREATE INDEX "properties_company_id_block_id_idx" ON "properties"("company_id", "block_id");
CREATE INDEX "properties_company_id_floor_id_idx" ON "properties"("company_id", "floor_id");
CREATE INDEX "properties_company_id_status_idx" ON "properties"("company_id", "status");
CREATE INDEX "properties_company_id_type_idx" ON "properties"("company_id", "type");

CREATE INDEX "property_status_history_company_id_idx" ON "property_status_history"("company_id");
CREATE INDEX "property_status_history_company_id_property_id_idx" ON "property_status_history"("company_id", "property_id");

-- 8. Row Level Security (RLS) enforcement
-- property_blocks
ALTER TABLE "property_blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "property_blocks" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "property_blocks"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- property_floors
ALTER TABLE "property_floors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "property_floors" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "property_floors"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- properties
ALTER TABLE "properties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "properties" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "properties"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- property_status_history
ALTER TABLE "property_status_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "property_status_history" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "property_status_history"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- 9. Role Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON "property_blocks" TO exza_app;
GRANT ALL ON "property_blocks" TO exza_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON "property_floors" TO exza_app;
GRANT ALL ON "property_floors" TO exza_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON "properties" TO exza_app;
GRANT ALL ON "properties" TO exza_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON "property_status_history" TO exza_app;
GRANT ALL ON "property_status_history" TO exza_migrator;
