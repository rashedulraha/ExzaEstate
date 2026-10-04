-- Migration: 20261004000015_approvals_engine
-- Task A4.4: Generic Approval Engine & Discount Matrix
-- Architecture §7.3, PRD MOD-APPROVAL, MOD-DISCOUNT, §5.6, BR-05, AT-06, AT-24

-- 1. CreateTable approval_rules
CREATE TABLE "approval_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "min_amount_paisa" BIGINT NOT NULL DEFAULT 0,
    "max_amount_paisa" BIGINT,
    "min_percentage" DECIMAL(5, 2),
    "max_percentage" DECIMAL(5, 2),
    "project_id" UUID,
    "branch_id" UUID,
    "required_permission" VARCHAR(128) NOT NULL,
    "step_order" INTEGER NOT NULL DEFAULT 1,
    "sla_hours" INTEGER NOT NULL DEFAULT 24,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "approval_rules_pkey" PRIMARY KEY ("id")
);

-- 2. CreateTable approvals
CREATE TABLE "approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "approval_number" VARCHAR(64) NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "requester_id" UUID NOT NULL,
    "title" VARCHAR(256) NOT NULL,
    "description" TEXT,
    "entity_type" VARCHAR(64),
    "entity_id" UUID,
    "project_id" UUID,
    "branch_id" UUID,
    "amount_paisa" BIGINT,
    "percentage" DECIMAL(5, 2),
    "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "current_step_order" INTEGER NOT NULL DEFAULT 1,
    "total_steps" INTEGER NOT NULL DEFAULT 1,
    "is_auto_approved" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "final_decision" VARCHAR(32),
    "rejection_reason" TEXT,
    "override_first_user_id" UUID,
    "override_first_at" TIMESTAMPTZ(6),
    "override_first_reason" TEXT,
    "override_second_user_id" UUID,
    "override_second_at" TIMESTAMPTZ(6),
    "override_second_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "approvals_company_id_approval_number_key" UNIQUE ("company_id", "approval_number")
);

-- 3. CreateTable approval_steps
CREATE TABLE "approval_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "approval_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "step_order" INTEGER NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "required_permission" VARCHAR(128) NOT NULL,
    "approver_id" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "decision" VARCHAR(32),
    "comments" TEXT,
    "due_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "approval_steps_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "approvals"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. Indexes
CREATE INDEX "approval_rules_company_id_type_is_active_idx" ON "approval_rules"("company_id", "type", "is_active");
CREATE INDEX "approval_rules_company_id_project_id_idx" ON "approval_rules"("company_id", "project_id");
CREATE INDEX "approval_rules_company_id_branch_id_idx" ON "approval_rules"("company_id", "branch_id");

CREATE INDEX "approvals_company_id_status_idx" ON "approvals"("company_id", "status");
CREATE INDEX "approvals_company_id_requester_id_idx" ON "approvals"("company_id", "requester_id");
CREATE INDEX "approvals_company_id_type_idx" ON "approvals"("company_id", "type");
CREATE INDEX "approvals_company_id_entity_type_entity_id_idx" ON "approvals"("company_id", "entity_type", "entity_id");
CREATE INDEX "approvals_company_id_expires_at_idx" ON "approvals"("company_id", "expires_at");

CREATE INDEX "approval_steps_company_id_status_idx" ON "approval_steps"("company_id", "status");
CREATE INDEX "approval_steps_approval_id_step_order_idx" ON "approval_steps"("approval_id", "step_order");

-- 5. Row Level Security (RLS) enforcement
ALTER TABLE "approval_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approval_rules" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "approval_rules"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "approvals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approvals" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "approvals"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "approval_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approval_steps" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "approval_steps"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- 6. Role Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON "approval_rules" TO exza_app, exza_worker;
GRANT ALL ON "approval_rules" TO exza_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON "approvals" TO exza_app, exza_worker;
GRANT ALL ON "approvals" TO exza_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON "approval_steps" TO exza_app, exza_worker;
GRANT ALL ON "approval_steps" TO exza_migrator;
