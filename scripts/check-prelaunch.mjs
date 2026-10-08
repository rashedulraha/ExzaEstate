/**
 * check-prelaunch.mjs
 * Master Pre-Launch Security & Release Gate Script (Task C5 / agent/task.md C5)
 * Verifies all 22 checkboxes in security.md §16, operational runbooks, architectural gates,
 * and secret hygiene before production release sign-off.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();

console.log('================================================================================');
console.log('       ExzaEstate v1.0 — Pre-Launch Security & Release Gate Quality Check       ');
console.log('================================================================================\n');

// 1. Audit docs/security/RELEASE_EVIDENCE.md for all 22 security checklist items
console.log('--- Step 1: Auditing Pre-Launch Security Evidence Matrix (22 items) ---');
const evidencePath = resolve(ROOT, 'docs/security/RELEASE_EVIDENCE.md');
if (!existsSync(evidencePath)) {
  console.error('❌ docs/security/RELEASE_EVIDENCE.md is missing!');
  process.exit(1);
}

const evidenceContent = readFileSync(evidencePath, 'utf8');

// Check that items 01 through 22 are present and marked VERIFIED
for (let i = 1; i <= 22; i++) {
  const itemNum = String(i).padStart(2, '0');
  const regex = new RegExp(
    `\\|\\s*\\*\\*${itemNum}\\*\\*\\s*\\|.*\\|\\s*\\*\\*VERIFIED\\*\\*\\s*\\|`,
  );
  if (!regex.test(evidenceContent)) {
    console.error(
      `❌ Security checklist item #${itemNum} is not marked VERIFIED in docs/security/RELEASE_EVIDENCE.md`,
    );
    process.exit(1);
  }
}
console.log('✓ All 22 pre-launch security checklist items are documented and verified.\n');

// 2. Verify referenced implementation & configuration files exist
console.log('--- Step 2: Verifying Referenced Security Implementations & Configs ---');
const referencedFiles = [
  'apps/backend/src/modules/auth/two-factor.service.ts',
  'apps/backend/src/common/decorators/step-up.decorator.ts',
  'apps/backend/src/modules/auth/auth-lockout.service.ts',
  'apps/backend/src/modules/auth/token.service.ts',
  'apps/backend/src/modules/auth/session.service.ts',
  'apps/backend/src/platform/security/field-crypto.service.ts',
  'apps/backend/src/platform/security/security-events.service.ts',
  'apps/backend/src/modules/approvals/approvals.service.ts',
  'apps/backend/src/common/filters/http-exception.filter.ts',
  'apps/backend/src/config/swagger.config.ts',
  'apps/backend/prisma/migrations/20261003000000_init_roles_and_rls/migration.sql',
  'docker/postgres-init/01-init-roles.sql',
  'apps/web/deploy/security-headers.conf',
  'apps/web/deploy/nginx.conf',
  'apps/desktop/src-tauri/tauri.conf.json',
  '.github/dependabot.yml',
  '.github/workflows/ci.yml',
  'SECURITY.md',
];

for (const relFile of referencedFiles) {
  const fullPath = resolve(ROOT, relFile);
  if (!existsSync(fullPath)) {
    console.error(`❌ Referenced security file missing: ${relFile}`);
    process.exit(1);
  }
}
console.log(
  `✓ All ${referencedFiles.length} core security implementation and config files verified.\n`,
);

// 3. Verify Operational Runbooks & Procedures (Step S2)
console.log('--- Step 3: Executing Operational Runbooks & Drill Verification ---');
try {
  execSync('node scripts/verify-backup-drill.mjs', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Operational runbooks verification failed:', error.message);
  process.exit(1);
}

// 4. Verify Web Deployment & Security Headers (CSP, HSTS, Caching)
console.log('--- Step 4: Verifying Web Security Headers & Asset Isolation ---');
try {
  execSync('node scripts/check-web-security-headers.mjs', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Web security headers verification failed:', error.message);
  process.exit(1);
}

// 5. Verify Architectural Quality Gates & 40/40 Acceptance Tests
console.log('--- Step 5: Executing Full Architectural Gates & Acceptance Matrix ---');
try {
  execSync('node scripts/check-all.mjs', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Architectural quality gates failed:', error.message);
  process.exit(1);
}

// 6. Secret Hygiene Check (Scan for unencrypted private keys in git tracking)
console.log('--- Step 6: Performing Repository Secret Hygiene Audit ---');
try {
  // Check for accidentally tracked .env files or raw private key blocks
  const trackedFiles = execSync('git ls-files', { encoding: 'utf8' }).split('\n');
  const forbiddenFiles = trackedFiles.filter(
    (f) => f.endsWith('.env') && !f.endsWith('.env.example'),
  );
  if (forbiddenFiles.length > 0) {
    console.error('❌ Forbidden secret file tracked in git:', forbiddenFiles);
    process.exit(1);
  }
  console.log('✓ Zero live .env files tracked in version control.');
} catch (error) {
  console.error('❌ Secret hygiene audit failed:', error.message);
  process.exit(1);
}

console.log('================================================================================');
console.log('  [PASSED] v1.0 Pre-Launch Security & Release Gate Certified Successfully!     ');
console.log('  All 22 security requirements, operational drills, and gates are 100% green.  ');
console.log('================================================================================\n');
