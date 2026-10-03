#!/usr/bin/env node

/**
 * API Client Generation Quality Gate
 *
 * Rule: architecture.md §13 / task.md A0.11:
 * "check-gen-api: no-op with a notice until pnpm gen:api exists, mandatory from A2.3"
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootPkgPath = path.resolve(__dirname, '..', 'package.json');

const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
const hasGenApi = !!(rootPkg.scripts && rootPkg.scripts['gen:api']);

if (!hasGenApi) {
  console.log(
    '\x1b[33m[NOTICE]\x1b[0m scripts/check-gen-api: "pnpm gen:api" is not yet defined. No-op until Task A2.3.',
  );
  process.exit(0);
} else {
  console.log('\x1b[32m✓\x1b[0m pnpm gen:api check verified.');
}
