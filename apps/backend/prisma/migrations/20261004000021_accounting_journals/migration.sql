-- Migration: 20261004000021_accounting_journals
-- Phase A6.3: Journal Engine, Immutability & Reversals (PRD MOD-JOURNAL, BR-02..04, AT-26; architecture.md §10, §22.4)

-- 1. Create Table: journals
CREATE TABLE "journals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "journal_number" VARCHAR(64) NOT NULL,
  "type" VARCHAR(32) NOT NULL DEFAULT 'GENERAL',
  "status" VARCHAR(32) NOT NULL DEFAULT 'Draft',
  "posting_date" DATE NOT NULL,
  "period_id" UUID,
  "narration" TEXT NOT NULL,
  "reference" VARCHAR(128),
  "source_module" VARCHAR(64),
  "total_amount" BIGINT NOT NULL DEFAULT 0,
  "reversal_of_id" UUID,
  "posted_at" TIMESTAMPTZ,
  "posted_by_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_id" UUID,
  "updated_by_id" UUID,

  CONSTRAINT "journals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_journals_period" FOREIGN KEY ("period_id") REFERENCES "accounting_periods"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_journals_reversal_of" FOREIGN KEY ("reversal_of_id") REFERENCES "journals"("id") ON DELETE RESTRICT
);

-- Indexes for journals
CREATE UNIQUE INDEX "journals_company_id_journal_number_key" ON "journals"("company_id", "journal_number");
CREATE INDEX "journals_company_id_status_idx" ON "journals"("company_id", "status");
CREATE INDEX "journals_company_id_type_idx" ON "journals"("company_id", "type");
CREATE INDEX "journals_company_id_posting_date_idx" ON "journals"("company_id", "posting_date");
CREATE INDEX "journals_company_id_reversal_of_id_idx" ON "journals"("company_id", "reversal_of_id");

-- 2. Create Table: journal_lines
CREATE TABLE "journal_lines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "journal_id" UUID NOT NULL,
  "line_number" INTEGER NOT NULL,
  "account_id" UUID NOT NULL,
  "debit_paisa" BIGINT NOT NULL DEFAULT 0,
  "credit_paisa" BIGINT NOT NULL DEFAULT 0,
  "description" TEXT,
  "party_type" VARCHAR(32),
  "party_id" UUID,
  "cost_center" VARCHAR(64),
  "project_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_journal_lines_journal" FOREIGN KEY ("journal_id") REFERENCES "journals"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_journal_lines_account" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT
);

-- Indexes for journal_lines
CREATE UNIQUE INDEX "journal_lines_company_id_journal_id_line_number_key" ON "journal_lines"("company_id", "journal_id", "line_number");
CREATE INDEX "journal_lines_company_id_account_id_idx" ON "journal_lines"("company_id", "account_id");
CREATE INDEX "journal_lines_company_id_journal_id_idx" ON "journal_lines"("company_id", "journal_id");
CREATE INDEX "journal_lines_company_id_party_type_party_id_idx" ON "journal_lines"("company_id", "party_type", "party_id");
CREATE INDEX "journal_lines_company_id_project_id_idx" ON "journal_lines"("company_id", "project_id");

-- 3. Create Table: journal_reversals
CREATE TABLE "journal_reversals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "original_journal_id" UUID NOT NULL,
  "reversal_journal_id" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "reversed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reversed_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "journal_reversals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_journal_reversals_original" FOREIGN KEY ("original_journal_id") REFERENCES "journals"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_journal_reversals_reversal" FOREIGN KEY ("reversal_journal_id") REFERENCES "journals"("id") ON DELETE RESTRICT
);

-- Indexes for journal_reversals
CREATE UNIQUE INDEX "journal_reversals_original_journal_id_key" ON "journal_reversals"("original_journal_id");
CREATE UNIQUE INDEX "journal_reversals_reversal_journal_id_key" ON "journal_reversals"("reversal_journal_id");
CREATE INDEX "journal_reversals_company_id_original_journal_id_idx" ON "journal_reversals"("company_id", "original_journal_id");
CREATE INDEX "journal_reversals_company_id_reversal_journal_id_idx" ON "journal_reversals"("company_id", "reversal_journal_id");

-- 4. Multi-Tenant Row Level Security (RLS)
ALTER TABLE "journals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "journals" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_policy" ON "journals"
  FOR ALL
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "journal_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "journal_lines" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_policy" ON "journal_lines"
  FOR ALL
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "journal_reversals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "journal_reversals" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_policy" ON "journal_reversals"
  FOR ALL
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

-- 5. Immutability Enforcements (RULE-IMMUTABLE)
-- Journal Immutability: Once Posted or Locked, updates and deletes are permanently forbidden.
CREATE OR REPLACE FUNCTION enforce_journal_immutability()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('Posted', 'Locked') THEN
      RAISE EXCEPTION 'Posted or locked journals are strictly immutable and cannot be deleted (RULE-IMMUTABLE)';
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('Posted', 'Locked') THEN
      RAISE EXCEPTION 'Posted or locked journals are strictly immutable and cannot be updated (RULE-IMMUTABLE)';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_journal_immutability ON "journals";
CREATE TRIGGER trg_journal_immutability
  BEFORE UPDATE OR DELETE ON "journals"
  FOR EACH ROW EXECUTE FUNCTION enforce_journal_immutability();

-- Journal Lines Immutability: Lines cannot be modified or deleted if parent journal is Posted or Locked.
CREATE OR REPLACE FUNCTION enforce_journal_line_immutability()
RETURNS trigger AS $$
DECLARE
  v_parent_status VARCHAR(32);
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT status INTO v_parent_status FROM "journals" WHERE id = OLD.journal_id;
    IF v_parent_status IN ('Posted', 'Locked') THEN
      RAISE EXCEPTION 'Journal lines of posted or locked journals are strictly immutable and cannot be deleted (RULE-IMMUTABLE)';
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT status INTO v_parent_status FROM "journals" WHERE id = OLD.journal_id;
    IF v_parent_status IN ('Posted', 'Locked') THEN
      RAISE EXCEPTION 'Journal lines of posted or locked journals are strictly immutable and cannot be updated (RULE-IMMUTABLE)';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    SELECT status INTO v_parent_status FROM "journals" WHERE id = NEW.journal_id;
    IF v_parent_status IN ('Posted', 'Locked') THEN
      RAISE EXCEPTION 'Cannot insert lines into an already posted or locked journal (RULE-IMMUTABLE)';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_journal_line_immutability ON "journal_lines";
CREATE TRIGGER trg_journal_line_immutability
  BEFORE INSERT OR UPDATE OR DELETE ON "journal_lines"
  FOR EACH ROW EXECUTE FUNCTION enforce_journal_line_immutability();

-- 6. Deferred Double-Entry Balance Constraint Trigger (RULE-DOUBLE-ENTRY)
CREATE OR REPLACE FUNCTION check_posted_journal_balance()
RETURNS trigger AS $$
DECLARE
  v_debit_total BIGINT;
  v_credit_total BIGINT;
BEGIN
  IF NEW.status = 'Posted' THEN
    SELECT COALESCE(SUM(debit_paisa), 0), COALESCE(SUM(credit_paisa), 0)
    INTO v_debit_total, v_credit_total
    FROM "journal_lines"
    WHERE journal_id = NEW.id;

    IF v_debit_total = 0 AND v_credit_total = 0 THEN
      RAISE EXCEPTION 'Posted journal must contain debit and credit lines with positive amounts (RULE-DOUBLE-ENTRY)';
    END IF;

    IF v_debit_total <> v_credit_total THEN
      RAISE EXCEPTION 'Journal is unbalanced: total debits (%) must equal total credits (%) (RULE-DOUBLE-ENTRY)', v_debit_total, v_credit_total;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_journal_balance_constraint ON "journals";
CREATE CONSTRAINT TRIGGER trg_journal_balance_constraint
  AFTER INSERT OR UPDATE ON "journals"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_posted_journal_balance();

-- 7. Role Grants & Revocations
GRANT SELECT, INSERT, UPDATE ON "journals" TO exza_app, exza_worker;
REVOKE DELETE ON "journals" FROM exza_app, exza_worker;
GRANT ALL ON "journals" TO exza_migrator;

GRANT SELECT, INSERT, UPDATE ON "journal_lines" TO exza_app, exza_worker;
REVOKE DELETE ON "journal_lines" FROM exza_app, exza_worker;
GRANT ALL ON "journal_lines" TO exza_migrator;

GRANT SELECT, INSERT ON "journal_reversals" TO exza_app, exza_worker;
REVOKE UPDATE, DELETE ON "journal_reversals" FROM exza_app, exza_worker;
GRANT ALL ON "journal_reversals" TO exza_migrator;
