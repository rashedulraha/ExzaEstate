#!/usr/bin/env node

/**
 * Web Deployment Security Headers & Asset Isolation Quality Gate
 * References:
 * - architecture.md §12.7, §17
 * - security.md §10, §15, §16
 * - task.md C3 Acceptance: "header scan passes; fonts/assets are self-hosted."
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const nginxConfPath = path.join(rootDir, 'apps/web/deploy/nginx.conf');
const securityHeadersConfPath = path.join(rootDir, 'apps/web/deploy/security-headers.conf');
const headersFilePath = path.join(rootDir, 'apps/web/deploy/_headers');
const redirectsFilePath = path.join(rootDir, 'apps/web/deploy/_redirects');
const webIndexHtmlPath = path.join(rootDir, 'apps/web/index.html');
const distPath = path.join(rootDir, 'apps/web/dist');

const errors = [];

function checkFileExists(filePath, description) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing required file: ${description} (${path.relative(rootDir, filePath)})`);
    return false;
  }
  return true;
}

console.log('--- Checking Web Deployment & Security Headers (Task C3) ---');

// 1. Check required configuration files exist
checkFileExists(nginxConfPath, 'Nginx SPA Configuration');
checkFileExists(securityHeadersConfPath, 'Nginx Security Headers Include');
checkFileExists(headersFilePath, 'Static CDN Edge Headers (_headers)');
checkFileExists(redirectsFilePath, 'Static CDN SPA Redirects (_redirects)');

if (errors.length > 0) {
  for (const err of errors) console.error(`\x1b[31m✗\x1b[0m ${err}`);
  process.exit(1);
}

const nginxContent = fs.readFileSync(nginxConfPath, 'utf-8');
const secHeadersContent = fs.readFileSync(securityHeadersConfPath, 'utf-8');
const edgeHeadersContent = fs.readFileSync(headersFilePath, 'utf-8');

function extractHeaderValue(source, headerName) {
  // Try Nginx format: add_header HeaderName "Value" [always];
  const nginxDoubleQuote = new RegExp(`add_header\\s+${headerName}\\s+"([^"]+)"`, 'i');
  const m1 = source.match(nginxDoubleQuote);
  if (m1 && m1[1]) return m1[1].trim();

  const nginxSingleQuote = new RegExp(`add_header\\s+${headerName}\\s+'([^']+)'`, 'i');
  const m2 = source.match(nginxSingleQuote);
  if (m2 && m2[1]) return m2[1].trim();

  // Try Edge/_headers format: HeaderName: Value
  const edgeRegex = new RegExp(`(?:^|\\n)\\s*${headerName}:\\s*([^\r\n]+)`, 'i');
  const edgeMatch = source.match(edgeRegex);
  if (edgeMatch && edgeMatch[1]) {
    return edgeMatch[1].trim();
  }

  return null;
}

// 2. Validate Content Security Policy (CSP)
function validateCsp(source, name) {
  const csp = extractHeaderValue(source, 'Content-Security-Policy');
  if (!csp) {
    errors.push(`${name} is missing Content-Security-Policy header.`);
    return;
  }

  // Must NOT contain unsafe-inline or unsafe-eval in script-src
  const scriptSrcMatch = csp.match(/script-src\s+([^;]+)/i);
  if (scriptSrcMatch && scriptSrcMatch[1]) {
    const scriptSrc = scriptSrcMatch[1];
    if (scriptSrc.includes("'unsafe-inline'")) {
      errors.push(`${name} CSP script-src must NOT include 'unsafe-inline'.`);
    }
    if (scriptSrc.includes("'unsafe-eval'")) {
      errors.push(`${name} CSP script-src must NOT include 'unsafe-eval'.`);
    }
  } else {
    errors.push(`${name} CSP is missing explicit script-src directive.`);
  }

  // Must enforce frame-ancestors 'none'
  if (!csp.includes("frame-ancestors 'none'")) {
    errors.push(`${name} CSP must enforce frame-ancestors 'none'.`);
  }

  // Must restrict object-src 'none'
  if (!csp.includes("object-src 'none'")) {
    errors.push(`${name} CSP must enforce object-src 'none'.`);
  }

  // Must have default-src 'self'
  if (!csp.includes("default-src 'self'")) {
    errors.push(`${name} CSP must have default-src 'self'.`);
  }
}

validateCsp(secHeadersContent, 'Nginx security-headers.conf');
validateCsp(edgeHeadersContent, 'Edge _headers');

// 3. Validate Mandatory Security Headers
function validateHsts(source, name) {
  const hsts = extractHeaderValue(source, 'Strict-Transport-Security');
  if (!hsts) {
    errors.push(`${name} is missing Strict-Transport-Security (HSTS).`);
    return;
  }
  if (!hsts.includes('max-age=') || !hsts.includes('includeSubDomains') || !hsts.includes('preload')) {
    errors.push(`${name} HSTS must include max-age, includeSubDomains, and preload.`);
  }
  const maxAgeMatch = hsts.match(/max-age=(\d+)/);
  if (maxAgeMatch && maxAgeMatch[1] && parseInt(maxAgeMatch[1], 10) < 31536000) {
    errors.push(`${name} HSTS max-age must be at least 1 year (31536000).`);
  }
}

function validatePermissionsPolicy(source, name) {
  const permissions = extractHeaderValue(source, 'Permissions-Policy');
  if (!permissions) {
    errors.push(`${name} is missing Permissions-Policy.`);
    return;
  }
  const requiredPermissions = ['camera=()', 'microphone=()', 'geolocation=()'];
  for (const req of requiredPermissions) {
    if (!permissions.includes(req)) {
      errors.push(`${name} Permissions-Policy must include restriction: ${req}`);
    }
  }
}

function validateStaticHeaders(source, name) {
  validateHsts(source, name);

  const nosniff = extractHeaderValue(source, 'X-Content-Type-Options');
  if (nosniff !== 'nosniff') {
    errors.push(`${name} is missing X-Content-Type-Options: nosniff (found: ${nosniff}).`);
  }

  const xframe = extractHeaderValue(source, 'X-Frame-Options');
  if (xframe !== 'DENY') {
    errors.push(`${name} is missing X-Frame-Options: DENY (found: ${xframe}).`);
  }

  const referrer = extractHeaderValue(source, 'Referrer-Policy');
  if (referrer !== 'no-referrer') {
    errors.push(`${name} is missing Referrer-Policy: no-referrer (found: ${referrer}).`);
  }

  validatePermissionsPolicy(source, name);
}

validateStaticHeaders(secHeadersContent, 'Nginx security-headers.conf');
validateStaticHeaders(edgeHeadersContent, 'Edge _headers');

// 4. Validate Nginx SPA Fallback & Caching Rules
if (!nginxContent.includes('try_files $uri $uri/ /index.html;')) {
  errors.push('nginx.conf missing SPA client-side fallback (try_files $uri $uri/ /index.html;).');
}

if (!nginxContent.includes('server_tokens off;')) {
  errors.push('nginx.conf missing server_tokens off to prevent version disclosure.');
}

if (!nginxContent.includes('gzip on;')) {
  errors.push('nginx.conf missing gzip compression configuration.');
}

// Check index.html caching (must be no-cache)
if (!nginxContent.includes('location = /index.html') || !nginxContent.includes('no-store')) {
  errors.push('nginx.conf must configure no-cache, no-store for /index.html.');
}

// Check /assets/ caching (must be immutable 1y)
if (!nginxContent.includes('location /assets/') || !nginxContent.includes('immutable')) {
  errors.push('nginx.conf must configure immutable 1y cache for /assets/.');
}

// 5. Validate Self-Hosted Assets (No third-party fonts/scripts)
const forbiddenCdns = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
];

const webIndexHtml = fs.readFileSync(webIndexHtmlPath, 'utf-8');
for (const cdn of forbiddenCdns) {
  if (webIndexHtml.includes(cdn)) {
    errors.push(`apps/web/index.html references external CDN: ${cdn}. Fonts and assets must be self-hosted.`);
  }
}

if (fs.existsSync(distPath)) {
  const distIndex = path.join(distPath, 'index.html');
  if (fs.existsSync(distIndex)) {
    const distHtml = fs.readFileSync(distIndex, 'utf-8');
    for (const cdn of forbiddenCdns) {
      if (distHtml.includes(cdn)) {
        errors.push(`apps/web/dist/index.html references external CDN: ${cdn}.`);
      }
    }
  }

  const assetsDir = path.join(distPath, 'assets');
  if (fs.existsSync(assetsDir)) {
    const assetFiles = fs.readdirSync(assetsDir);
    const cssFiles = assetFiles.filter((f) => f.endsWith('.css'));
    for (const cssFile of cssFiles) {
      const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf-8');
      for (const cdn of forbiddenCdns) {
        if (cssContent.includes(cdn)) {
          errors.push(`Compiled asset ${cssFile} references external CDN: ${cdn}.`);
        }
      }
    }
  }
}

// Report findings
if (errors.length > 0) {
  console.error('\n\x1b[31m[FAILED]\x1b[0m Web Security Headers check failed with following issues:');
  for (const err of errors) {
    console.error(`  \x1b[31m✗\x1b[0m ${err}`);
  }
  process.exit(1);
}

console.log('✓ All Web deployment security headers, CSP, caching rules, and self-hosted asset rules pass.');
process.exit(0);
