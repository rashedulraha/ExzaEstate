-- Migration: 20261005000027_phase_a8_rls_and_tables
-- Phase A8 Tables RLS Policies & Grants: Expenses, Vendors, Commission, Booking Transfers
-- PRD §8, §18; security.md §3; architecture.md §5.2, §18.2

-- Enable and Force Row Level Security on Phase A8 tenant tables
ALTER TABLE "brokers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brokers" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "brokers"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "commission_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commission_rules" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "commission_rules"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "commission_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commission_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "commission_records"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "expense_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_categories" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "expense_categories"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "expense_vouchers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_vouchers" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "expense_vouchers"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "expense_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_attachments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "expense_attachments"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "expense_budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_budgets" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "expense_budgets"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "vendors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendors" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "vendors"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "vendor_bills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendor_bills" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "vendor_bills"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "vendor_bill_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendor_bill_lines" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "vendor_bill_lines"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "vendor_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendor_payments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "vendor_payments"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "vendor_payment_allocations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendor_payment_allocations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "vendor_payment_allocations"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "booking_transfers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "booking_transfers" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "booking_transfers"
    FOR ALL
    USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
    WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);

-- Grants
GRANT SELECT, INSERT, UPDATE ON "brokers", "commission_rules", "commission_records", "expense_categories", "expense_vouchers", "expense_attachments", "expense_budgets", "vendors", "vendor_bills", "vendor_bill_lines", "vendor_payments", "vendor_payment_allocations", "booking_transfers" TO exza_app, exza_worker;
REVOKE DELETE ON "commission_records", "vendor_payments", "booking_transfers" FROM exza_app, exza_worker;
GRANT ALL ON "brokers", "commission_rules", "commission_records", "expense_categories", "expense_vouchers", "expense_attachments", "expense_budgets", "vendors", "vendor_bills", "vendor_bill_lines", "vendor_payments", "vendor_payment_allocations", "booking_transfers" TO exza_migrator;
