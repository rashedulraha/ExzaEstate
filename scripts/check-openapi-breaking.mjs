#!/usr/bin/env node

/**
 * OpenAPI Breaking Change Checker (ARCH-API-COMPAT / D-13)
 *
 * Verifies that the current API contract (/api/v1) is backward-compatible
 * and strictly additive-only relative to the committed baseline (openapi/v1.json).
 *
 * Acceptance Gate: Removing an endpoint, HTTP method, response status code,
 * or response field/property must fail CI.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

function checkPaths(basePaths = {}, currPaths = {}) {
  const issues = [];

  for (const [pathKey, baseItem] of Object.entries(basePaths)) {
    const currItem = currPaths[pathKey];
    if (!currItem) {
      issues.push({
        type: 'PATH_REMOVED',
        location: pathKey,
        message: `API path '${pathKey}' was removed.`,
      });
      continue;
    }

    for (const method of HTTP_METHODS) {
      const baseOp = baseItem[method];
      if (!baseOp) continue;

      const currOp = currItem[method];
      if (!currOp) {
        issues.push({
          type: 'OPERATION_REMOVED',
          location: `${method.toUpperCase()} ${pathKey}`,
          message: `HTTP operation '${method.toUpperCase()} ${pathKey}' was removed.`,
        });
        continue;
      }

      checkOperationParams(baseOp, currOp, pathKey, method, issues);
      checkOperationResponses(baseOp, currOp, pathKey, method, issues);
    }
  }

  return issues;
}

function checkOperationParams(baseOp, currOp, pathKey, method, issues) {
  const baseParams = baseOp.parameters || [];
  const currParams = currOp.parameters || [];

  for (const bp of baseParams) {
    const found = currParams.find((cp) => cp.name === bp.name && cp.in === bp.in);
    if (!found && bp.required) {
      issues.push({
        type: 'REQUIRED_PARAM_REMOVED',
        location: `${method.toUpperCase()} ${pathKey} [${bp.in}:${bp.name}]`,
        message: `Required parameter '${bp.name}' was removed.`,
      });
    }
  }

  for (const cp of currParams) {
    if (!cp.required) continue;
    const baseMatch = baseParams.find((bp) => bp.name === cp.name && bp.in === cp.in);
    if (!baseMatch || !baseMatch.required) {
      issues.push({
        type: 'NEW_REQUIRED_PARAM',
        location: `${method.toUpperCase()} ${pathKey} [${cp.in}:${cp.name}]`,
        message: `Parameter '${cp.name}' was newly introduced as required.`,
      });
    }
  }
}

function checkOperationResponses(baseOp, currOp, pathKey, method, issues) {
  const baseResponses = baseOp.responses || {};
  const currResponses = currOp.responses || {};

  for (const statusCode of Object.keys(baseResponses)) {
    if (!currResponses[statusCode]) {
      issues.push({
        type: 'RESPONSE_CODE_REMOVED',
        location: `${method.toUpperCase()} ${pathKey} -> ${statusCode}`,
        message: `Response status '${statusCode}' was removed.`,
      });
      continue;
    }

    checkResponseContent(
      baseResponses[statusCode],
      currResponses[statusCode],
      `${method.toUpperCase()} ${pathKey} -> ${statusCode}`,
      issues,
    );
  }
}

function compareInlineProperties(baseProps, currProps, location, issues) {
  if (!baseProps || !currProps) return;
  for (const propName of Object.keys(baseProps)) {
    if (!currProps[propName]) {
      issues.push({
        type: 'RESPONSE_FIELD_REMOVED',
        location: `${location}.${propName}`,
        message: `Response property '${propName}' was removed from response body.`,
      });
    }
  }
}

function getJsonSchema(resp) {
  if (!resp || !resp.content) return null;
  const jsonContent = resp.content['application/json'];
  return jsonContent ? jsonContent.schema : null;
}

function checkResponseContent(baseResp, currResp, location, issues) {
  const baseSchema = getJsonSchema(baseResp);
  const currSchema = getJsonSchema(currResp);

  if (baseSchema && !currSchema) {
    issues.push({
      type: 'RESPONSE_CONTENT_REMOVED',
      location,
      message: 'JSON response schema was removed.',
    });
    return;
  }

  const baseProps = baseSchema ? baseSchema.properties : null;
  const currProps = currSchema ? currSchema.properties : null;
  compareInlineProperties(baseProps, currProps, location, issues);
}

function checkSchemas(baseSchemas = {}, currSchemas = {}) {
  const issues = [];

  for (const [schemaName, baseSchema] of Object.entries(baseSchemas)) {
    const currSchema = currSchemas[schemaName];
    if (!currSchema) {
      issues.push({
        type: 'SCHEMA_REMOVED',
        location: `#/components/schemas/${schemaName}`,
        message: `Component schema '${schemaName}' was removed.`,
      });
      continue;
    }

    checkSchemaProperties(baseSchema, currSchema, schemaName, issues);
  }

  return issues;
}

function checkSchemaProperties(baseSchema, currSchema, schemaName, issues) {
  const baseProps = baseSchema.properties || {};
  const currProps = currSchema.properties || {};

  for (const [propName, baseProp] of Object.entries(baseProps)) {
    const currProp = currProps[propName];
    if (!currProp) {
      issues.push({
        type: 'FIELD_REMOVED',
        location: `#/components/schemas/${schemaName}.${propName}`,
        message: `Property '${propName}' was removed from schema '${schemaName}'.`,
      });
      continue;
    }

    if (baseProp.type && currProp.type && baseProp.type !== currProp.type) {
      issues.push({
        type: 'TYPE_CHANGED',
        location: `#/components/schemas/${schemaName}.${propName}`,
        message: `Property '${propName}' changed type from '${baseProp.type}' to '${currProp.type}'.`,
      });
    }
  }
}

export function findOpenApiBreakingChanges(baselineDoc, currentDoc) {
  const pathIssues = checkPaths(baselineDoc.paths, currentDoc.paths);
  const schemaIssues = checkSchemas(
    baselineDoc.components?.schemas,
    currentDoc.components?.schemas,
  );
  return [...pathIssues, ...schemaIssues];
}

function run() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootDir = path.resolve(__dirname, '..');

  const baselinePath = process.env.BASELINE_OPENAPI || path.join(rootDir, 'openapi/v1.json');
  const currentPath =
    process.env.CURRENT_OPENAPI || path.join(rootDir, 'packages/api-client/openapi.json');

  if (!fs.existsSync(baselinePath)) {
    console.error(`\x1b[31m[ERROR]\x1b[0m OpenAPI baseline file not found: ${baselinePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(currentPath)) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Current OpenAPI spec not found: ${currentPath}`);
    process.exit(1);
  }

  const baselineDoc = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
  const currentDoc = JSON.parse(fs.readFileSync(currentPath, 'utf-8'));

  const breakingChanges = findOpenApiBreakingChanges(baselineDoc, currentDoc);

  if (breakingChanges.length > 0) {
    console.error(`\n\x1b[31m[BREAKING CHANGE DETECTED]\x1b[0m Found ${breakingChanges.length} breaking change(s) in OpenAPI contract:`);
    for (const issue of breakingChanges) {
      console.error(`  \x1b[31m✗ [${issue.type}]\x1b[0m ${issue.location}: ${issue.message}`);
    }
    console.error('\nUnder /api/v1, changes must be strictly additive. Breaking changes require /api/v2.\n');
    process.exit(1);
  }

  console.log('\x1b[32m[PASSED]\x1b[0m OpenAPI contract is backward-compatible and additive-only. (0 breaking changes)');
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) {
  run();
}
