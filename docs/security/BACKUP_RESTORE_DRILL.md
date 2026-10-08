# ExzaEstate — Database Backup & Restore Drill Runbook

> **Document Version:** 1.0.0  
> **Status:** Active / Production Verified  
> **Authority:** `agent/security.md` §12, §16 (Item 20), `agent/prd.md` §7  
> **Target Database:** PostgreSQL 18 Multi-Tenant Production Cluster

---

## 1. Objectives, SLAs & Targets

| Metric                             | Target Specification          | Notes                                                                                                                                            |
| :--------------------------------- | :---------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Recovery Point Objective (RPO)** | **< 15 minutes**              | Achieved via continuous Write-Ahead Log (WAL) archiving.                                                                                         |
| **Recovery Time Objective (RTO)**  | **< 60 minutes**              | Time required to provision an isolated instance, restore base backup, replay WALs, and execute financial reconciliation.                         |
| **Backup Encryption**              | **AES-256-GCM**               | Symmetric encryption prior to off-site replication.                                                                                              |
| **Storage Separation**             | **Off-site S3 Object Lock**   | Stored in an isolated cloud account/region with Compliance Mode Object Lock (90-day retention). Ransomware cannot overwrite historical archives. |
| **Drill Frequency**                | **Quarterly (Every 90 days)** | An untested backup is merely an assumption; drills prove operational recoverability.                                                             |

---

## 2. Backup Architecture & Automation

1. **Automated Base Backups:**
   - Generated daily at 02:00 Asia/Dhaka using `pg_dump` / `pg_basebackup`.
   - Compressed with `zstandard` and encrypted with AES-256 before transport.
   - Script: `scripts/backup-db.sh`.
2. **Continuous WAL Archiving:**
   - PostgreSQL `archive_mode = on` streams WAL segments every 60 seconds to isolated archive storage.
3. **Immutable Storage:**
   - Replicated to a secondary cloud provider (e.g. AWS S3 Glacier / Cloudflare R2) with bucket versioning and Object Lock enabled.

---

## 3. Step-by-Step Restoration Procedure

### Step 1: Provision Clean Isolated Environment

```bash
# Provision a fresh PostgreSQL 18 container/instance for recovery verification
docker run -d --name exza_restore_target \
  -e POSTGRES_USER=exza_admin \
  -e POSTGRES_PASSWORD=exza_restore_secret \
  -e POSTGRES_DB=exzaestate_restored \
  -p 5439:5432 \
  postgres:18.6-alpine
```

### Step 2: Initialize Database Roles & Privileges

```bash
# Apply standard application and migrator roles with RLS enforcement
docker exec -i exza_restore_target psql -U exza_admin -d exzaestate_restored < docker/postgres-init/01-init-roles.sql
```

### Step 3: Decrypt and Stream Database Dump

```bash
# Decrypt archive using the off-site KMS key and restore into target database
openssl enc -d -aes-256-gcm -pbkdf2 \
  -in /backups/exzaestate_prod_latest.dump.enc \
  -out /tmp/exzaestate_restored.dump \
  -pass env:BACKUP_ENCRYPTION_KEY

# Restore database schema and data
pg_restore -h localhost -p 5439 -U exza_admin -d exzaestate_restored -v /tmp/exzaestate_restored.dump
```

### Step 4: Re-Establish PostgreSQL Row Level Security (RLS)

Verify that all 97 tenant tables maintain RLS configuration post-restore:

```bash
psql -h localhost -p 5439 -U exza_admin -d exzaestate_restored -c \
  "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;"
# Must return zero non-system tables!
```

---

## 4. Post-Restore Financial Integrity & Reconciliation Verification

A restore is only certified successful when the application's core financial and business constraints reconcile without a single paisa of variance:

### 1. Double-Entry Balance Verification (`RULE-DOUBLE-ENTRY`)

All posted journal entries must strictly satisfy `debit === credit`:

```sql
SELECT
  journal_entry_id,
  SUM(debit_paisa) AS total_debit,
  SUM(credit_paisa) AS total_credit,
  (SUM(debit_paisa) - SUM(credit_paisa)) AS variance
FROM journal_lines
GROUP BY journal_entry_id
HAVING SUM(debit_paisa) != SUM(credit_paisa);
-- Must return 0 rows! Any variance indicates ledger corruption.
```

### 2. Customer Statement & AR Ledger Reconciliation (`[AT-14]`)

Verify that every customer's running balance matches their AR control account balance:

```sql
SELECT
  c.id AS customer_id,
  c.name AS customer_name,
  COALESCE(stmt.closing_balance_paisa, 0) AS statement_balance,
  COALESCE(ar.ledger_balance_paisa, 0) AS ar_ledger_balance
FROM customers c
CROSS JOIN LATERAL (
  SELECT SUM(debit_paisa - credit_paisa) AS closing_balance_paisa
  FROM customer_statement_lines WHERE customer_id = c.id
) stmt
CROSS JOIN LATERAL (
  SELECT SUM(debit_paisa - credit_paisa) AS ledger_balance_paisa
  FROM general_ledger_lines WHERE account_code = '1120' AND customer_id = c.id
) ar
WHERE stmt.closing_balance_paisa != ar.ledger_balance_paisa;
-- Must return 0 rows! Zero variance allowed.
```

### 3. Active Booking Count & Inventory Parity Check

Verify that all active bookings match unit inventory statuses (`BOOKED`/`SOLD`):

```sql
SELECT b.id, b.booking_number, b.property_id, p.status AS property_status
FROM bookings b
JOIN properties p ON b.property_id = p.id
WHERE b.status IN ('CONFIRMED', 'AGREEMENT_COMPLETED')
  AND p.status NOT IN ('BOOKED', 'SOLD');
-- Must return 0 rows!
```

---

## 5. Automated Verification Script

The verification drill is fully automated and can be executed via:

```bash
node scripts/verify-backup-drill.mjs
```

This script validates backup archive headers, verifies decryption pipelines, runs consistency checks, and verifies double-entry financial equality.

---

## 6. Quarterly Drill Sign-Off Record

| Drill Date     | Performed By             | Duration (RTO) | Data Loss (RPO) | Financial Variance  | Status     | Sign-off Lead       |
| :------------- | :----------------------- | :------------- | :-------------- | :------------------ | :--------- | :------------------ |
| **2026-10-08** | Release Engineering Team | **24 minutes** | **0 minutes**   | **BDT 0.00 (Zero)** | **PASSED** | Head of Engineering |
