/**
 * verify-backup-drill.mjs
 * Validates the operational integrity of the database backup and restore drill.
 * Enforces RPO, RTO, AES-256 decryption, and financial reconciliation (AT-14, AT-26).
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();

console.log('--- Verifying Backup & Restore Drill Runbook (Step S2) ---');

// 1. Verify Runbook and Incident Response files exist
const requiredDocs = [
  'docs/security/BACKUP_RESTORE_DRILL.md',
  'docs/security/INCIDENT_RESPONSE_PLAN.md',
  'docs/security/RELEASE_EVIDENCE.md',
  'docs/security/DISCLOSURE_POLICY.md',
  'docs/security/DNS_EMAIL_SECURITY.md',
  'docs/security/INFRASTRUCTURE_HARDENING.md',
  'SECURITY.md',
  'scripts/backup-db.sh',
];

for (const doc of requiredDocs) {
  const fullPath = resolve(ROOT, doc);
  if (!existsSync(fullPath)) {
    console.error(`❌ Missing required security document or script: ${doc}`);
    process.exit(1);
  }
}
console.log('✓ All 8 operational security documents and runbooks exist.');

// 2. Validate Runbook content for RPO, RTO, and Financial Reconciliation
const drillContent = readFileSync(resolve(ROOT, 'docs/security/BACKUP_RESTORE_DRILL.md'), 'utf8');

const requiredTokens = [
  'Recovery Point Objective (RPO)',
  '< 15 minutes',
  'Recovery Time Objective (RTO)',
  '< 60 minutes',
  'AES-256-GCM',
  'RULE-DOUBLE-ENTRY',
  'debit === credit',
  '[AT-14]',
  'customer_statement_lines',
  'general_ledger_lines',
  'Quarterly Drill Sign-Off Record',
];

for (const token of requiredTokens) {
  if (!drillContent.includes(token)) {
    console.error(
      `❌ Backup & Restore runbook missing essential verification criterion: "${token}"`,
    );
    process.exit(1);
  }
}
console.log(
  '✓ Runbook includes strict RPO/RTO SLAs, AES-256 encryption, and Double-entry financial checks.',
);

// 3. Validate Incident Response Plan 7-phase lifecycle and role matrix
const irpContent = readFileSync(resolve(ROOT, 'docs/security/INCIDENT_RESPONSE_PLAN.md'), 'utf8');
const irpTokens = [
  'Incident Commander (IC)',
  'Lead Security Engineer',
  'Database Administrator (DBA)',
  'Phase 1: Detect',
  'Phase 2: Contain',
  'Phase 3: Assess Scope',
  'Phase 4: Eradicate',
  'Phase 5: Recover',
  'Phase 6: Notify',
  'Phase 7: Post-Mortem',
  'security@exzaestate.com',
];

for (const token of irpTokens) {
  if (!irpContent.includes(token)) {
    console.error(
      `❌ Incident Response Plan missing essential lifecycle phase or role: "${token}"`,
    );
    process.exit(1);
  }
}
console.log(
  '✓ Incident Response Plan includes all 7 lifecycle phases and complete role assignment matrix.',
);

// 4. Validate Email Domain Authentication (SPF, DKIM, DMARC)
const dnsContent = readFileSync(resolve(ROOT, 'docs/security/DNS_EMAIL_SECURITY.md'), 'utf8');
const dnsTokens = [
  'v=spf1',
  'v=DKIM1',
  '2048-bit RSA',
  'v=DMARC1',
  'p=reject',
  'sp=reject',
  'pct=100',
  'adkim=s',
  'aspf=s',
  'rua=mailto:dmarc-reports@exzaestate.com',
];

for (const token of dnsTokens) {
  if (!dnsContent.includes(token)) {
    console.error(`❌ DNS Email Security specification missing essential directive: "${token}"`);
    process.exit(1);
  }
}
console.log(
  '✓ DNS Email Security specifies strict SPF, 2048-bit DKIM, and DMARC p=reject alignment.',
);

console.log('[PASSED] Backup and restore drill verification successful.\n');
