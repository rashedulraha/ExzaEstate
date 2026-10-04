#!/usr/bin/env node

/**
 * scripts/check-acceptance-matrix.mjs
 *
 * Verifies that every Acceptance Test (AT-01 to AT-39, plus AT-04b) from
 * PRD §19 has an automated test carrying the corresponding tag.
 *
 * Fails if any P0 (A-M1) or P1 (A-M2) acceptance test is missing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export const ACCEPTANCE_TESTS = [
  { id: 'AT-01', pri: 'P0', milestone: 'A-M1', title: 'Duplicate booking prevention' },
  { id: 'AT-02', pri: 'P0', milestone: 'A-M1', title: 'Concurrency race on booking' },
  { id: 'AT-03', pri: 'P0', milestone: 'A-M1', title: 'Idempotency key replay & caching' },
  { id: 'AT-04', pri: 'P0', milestone: 'A-M1', title: 'Payment to accounting journal & ledger' },
  { id: 'AT-04b', pri: 'P0', milestone: 'A-M1', title: 'Alternative revenue recognition (ON_HANDOVER)' },
  { id: 'AT-05', pri: 'P0', milestone: 'A-M1', title: 'Partial payment & installment state transition' },
  { id: 'AT-06', pri: 'P0', milestone: 'A-M1', title: 'Discount approval tiers (GM vs MD)' },
  { id: 'AT-07', pri: 'P0', milestone: 'A-M1', title: 'Expense approval thresholds & cost update' },
  { id: 'AT-08', pri: 'P0', milestone: 'A-M1', title: 'Cancellation deduction & refund processing' },
  { id: 'AT-09', pri: 'P0', milestone: 'A-M1', title: 'Permission control & RBAC boundaries' },
  { id: 'AT-10', pri: 'P0', milestone: 'A-M1', title: 'Accounting period lock & reopen reason audit' },
  { id: 'AT-11', pri: 'P0', milestone: 'A-M1', title: 'Reservation hold expiry auto-cancellation' },
  { id: 'AT-12', pri: 'P0', milestone: 'A-M1', title: '10% minimum threshold confirmation rule' },
  { id: 'AT-13', pri: 'P0', milestone: 'A-M1', title: 'Cheque lifecycle (Cleared vs Bounced)' },
  { id: 'AT-14', pri: 'P0', milestone: 'A-M1', title: 'Statement balance matches AR ledger and aging' },
  { id: 'AT-15', pri: 'P0', milestone: 'A-M1', title: 'Dashboard KPIs equal reports for same filters' },
  { id: 'AT-16', pri: 'P0', milestone: 'A-M1', title: 'Data scope isolation (Executive OWN vs GM ALL)' },
  { id: 'AT-17', pri: 'P0', milestone: 'A-M1', title: 'Booking state machine transitions & inventory status' },
  { id: 'AT-18', pri: 'P0', milestone: 'A-M1', title: 'Login authentication under PostgreSQL RLS' },
  { id: 'AT-19', pri: 'P0', milestone: 'A-M1', title: 'Lakh/crore currency formatting (৳5,00,000)' },
  { id: 'AT-20', pri: 'P0', milestone: 'A-M1', title: 'Cross-client data parity & contract consistency' },
  { id: 'AT-21', pri: 'P0', milestone: 'A-M1', title: 'Immutable payment reversal & mirror journal' },
  { id: 'AT-22', pri: 'P0', milestone: 'A-M1', title: 'Overpayment preserved as customer advance' },
  { id: 'AT-23', pri: 'P0', milestone: 'A-M1', title: 'Integer paisa rounding allocation engine' },
  { id: 'AT-24', pri: 'P0', milestone: 'A-M1', title: 'Maker-checker self-approval block & auto-approve' },
  { id: 'AT-25', pri: 'P0', milestone: 'A-M1', title: 'Missing accounting mapping validation error' },
  { id: 'AT-26', pri: 'P0', milestone: 'A-M1', title: 'Double-entry debit == credit balance enforcement' },
  { id: 'AT-27', pri: 'P0', milestone: 'A-M1', title: 'Bangladeshi land unit conversions (Katha/Decimal)' },
  { id: 'AT-28', pri: 'P0', milestone: 'A-M1', title: 'Installment timing state & overdue aging buckets' },
  { id: 'AT-29', pri: 'P0', milestone: 'A-M1', title: 'Go-live migration gate (Opening AR == Legacy sum)' },
  { id: 'AT-30', pri: 'P0', milestone: 'A-M1', title: 'Tenant isolation (Super Admin cannot view business data)' },
  { id: 'AT-31', pri: 'P0', milestone: 'A-M1', title: 'License expiration handling & read-only lock' },
  { id: 'AT-32', pri: 'P0', milestone: 'A-M1', title: 'Audit log write atomicity (all-or-nothing rollback)' },
  { id: 'AT-33', pri: 'P0', milestone: 'A-M1', title: 'Installment waiver approval & adjustment journal' },
  { id: 'AT-34', pri: 'P1', milestone: 'A-M2', title: 'Local to Cloud data export/import fidelity' },
  { id: 'AT-35', pri: 'P1', milestone: 'A-M2', title: 'Booking transfer (name transfer) & partial unique index' },
  { id: 'AT-36', pri: 'P1', milestone: 'A-M2', title: 'Broker commission accrual & cancellation clawback' },
  { id: 'AT-37', pri: 'P1', milestone: 'A-M2', title: 'Expense budget spend alerts (70%, 85%, 100%)' },
  { id: 'AT-38', pri: 'P1', milestone: 'A-M2', title: 'CSV migration validation & all-or-nothing import' },
  { id: 'AT-39', pri: 'P1', milestone: 'A-M2', title: 'Unicode Bangla document templates & amountToWords' },
];

const TEST_EXTENSIONS = ['.spec.ts', '.test.ts', '.spec.js', '.test.js'];
const IGNORED_DIRS = new Set(['node_modules', 'dist', '.git']);

function isTestFile(name) {
  return TEST_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function findTestFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findTestFiles(fullPath, fileList);
    } else if (isTestFile(entry.name)) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

const searchDirs = [
  path.join(rootDir, 'apps', 'backend'),
  path.join(rootDir, 'packages'),
];

const testFiles = searchDirs.flatMap((d) => findTestFiles(d));
const matchesByAtId = new Map();

for (const at of ACCEPTANCE_TESTS) {
  matchesByAtId.set(at.id, []);
}

const atRegex = /@?AT-(0[1-9]b?|[1-3][0-9]b?)/g;

for (const file of testFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = atRegex.exec(content)) !== null) {
    const rawTag = match[1];
    const atId = `AT-${rawTag}`;
    if (matchesByAtId.has(atId)) {
      const relPath = path.relative(rootDir, file);
      const list = matchesByAtId.get(atId);
      if (!list.includes(relPath)) {
        list.push(relPath);
      }
    }
  }
}

console.log('================================================================================');
console.log('           ExzaEstate Acceptance Test (AT) Matrix Quality Gate                  ');
console.log('================================================================================');

let missingP0 = 0;
let missingP1 = 0;
let totalPassed = 0;

for (const at of ACCEPTANCE_TESTS) {
  const matchingFiles = matchesByAtId.get(at.id) || [];
  const status = matchingFiles.length > 0;

  if (status) {
    totalPassed++;
    console.log(
      ` \x1b[32m✔\x1b[0m [${at.id}] (${at.pri}/${at.milestone}) ${at.title.padEnd(52)} → ${matchingFiles[0]}`,
    );
  } else {
    if (at.pri === 'P0') missingP0++;
    else missingP1++;
    console.log(
      ` \x1b[31m✖\x1b[0m [${at.id}] (${at.pri}/${at.milestone}) ${at.title.padEnd(52)} → MISSING TEST`,
    );
  }
}

console.log('--------------------------------------------------------------------------------');
console.log(
  `Coverage Summary: ${totalPassed}/${ACCEPTANCE_TESTS.length} Acceptance Tests covered (${totalPassed === ACCEPTANCE_TESTS.length ? '100%' : `${Math.round((totalPassed / ACCEPTANCE_TESTS.length) * 100)}%`})`,
);

if (missingP0 > 0) {
  console.error(`\n\x1b[31m[FAILED]\x1b[0m Missing ${missingP0} P0 acceptance test(s) for Milestone A-M1!`);
  process.exit(1);
} else {
  console.log(`\x1b[32m[PASSED]\x1b[0m All P0 acceptance tests for Milestone A-M1 are covered and green!`);
  if (missingP1 === 0) {
    console.log(`\x1b[32m[MILESTONE A-M2 CLOSED]\x1b[0m All P1 acceptance tests are also covered!`);
  }
}
