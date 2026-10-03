-- CreateTable projects
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PLANNING',
    "land_id" UUID,
    "project_manager_id" UUID,
    "location" VARCHAR(255),
    "district" VARCHAR(128),
    "upazila" VARCHAR(128),
    "address" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "expected_completion_date" DATE,
    "master_plan_url" VARCHAR(512),
    "gallery_urls" JSONB DEFAULT '[]'::jsonb,
    "description" TEXT,
    "estimated_budget_paisa" BIGINT,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable cost_centers
CREATE TABLE "cost_centers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "project_id" UUID,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Unique constraints (partial for soft-delete support)
CREATE UNIQUE INDEX "projects_company_id_code_key" ON "projects"("company_id", "code") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "cost_centers_company_id_code_key" ON "cost_centers"("company_id", "code") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "cost_centers_project_id_key" ON "cost_centers"("project_id") WHERE "deleted_at" IS NULL;

-- Indexes
CREATE INDEX "projects_company_id_idx" ON "projects"("company_id");
CREATE INDEX "projects_company_id_code_idx" ON "projects"("company_id", "code");
CREATE INDEX "projects_company_id_status_idx" ON "projects"("company_id", "status");
CREATE INDEX "projects_company_id_land_id_idx" ON "projects"("company_id", "land_id");

CREATE INDEX "cost_centers_company_id_idx" ON "cost_centers"("company_id");
CREATE INDEX "cost_centers_company_id_code_idx" ON "cost_centers"("company_id", "code");

-- Row Level Security (RLS) enforcement for projects
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "projects"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- Row Level Security (RLS) enforcement for cost_centers
ALTER TABLE "cost_centers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cost_centers" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "cost_centers"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON "projects" TO exza_app;
GRANT ALL ON "projects" TO exza_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON "cost_centers" TO exza_app;
GRANT ALL ON "cost_centers" TO exza_migrator;
