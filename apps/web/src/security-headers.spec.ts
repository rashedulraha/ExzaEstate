/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '../..');

describe('Task C3 — Web Deployment, CDN & Security Headers', () => {
  const nginxConfPath = path.join(webRoot, 'deploy/nginx.conf');
  const securityHeadersConfPath = path.join(webRoot, 'deploy/security-headers.conf');
  const headersPath = path.join(webRoot, 'deploy/_headers');
  const redirectsPath = path.join(webRoot, 'deploy/_redirects');
  const publicHeadersPath = path.join(webRoot, 'public/_headers');
  const publicRedirectsPath = path.join(webRoot, 'public/_redirects');
  const dockerfilePath = path.join(webRoot, 'deploy/Dockerfile');
  const workflowPath = path.join(repoRoot, '.github/workflows/deploy-web.yml');
  const htmlPath = path.join(webRoot, 'index.html');

  it('verifies all deployment configuration files exist', () => {
    expect(fs.existsSync(nginxConfPath)).toBe(true);
    expect(fs.existsSync(securityHeadersConfPath)).toBe(true);
    expect(fs.existsSync(headersPath)).toBe(true);
    expect(fs.existsSync(redirectsPath)).toBe(true);
    expect(fs.existsSync(publicHeadersPath)).toBe(true);
    expect(fs.existsSync(publicRedirectsPath)).toBe(true);
    expect(fs.existsSync(dockerfilePath)).toBe(true);
    expect(fs.existsSync(workflowPath)).toBe(true);
  });

  it('enforces strict Content-Security-Policy (CSP) with no unsafe-inline or unsafe-eval for scripts', () => {
    const secConf = fs.readFileSync(securityHeadersConfPath, 'utf8');
    const staticHeaders = fs.readFileSync(headersPath, 'utf8');

    // Nginx security-headers.conf checks
    expect(secConf).toContain('Content-Security-Policy');
    expect(secConf).toContain("default-src 'self'");
    expect(secConf).toContain("script-src 'self'");
    expect(secConf).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(secConf).not.toMatch(/script-src[^;]*'unsafe-eval'/);
    expect(secConf).toContain("object-src 'none'");
    expect(secConf).toContain("frame-ancestors 'none'");
    expect(secConf).toContain("base-uri 'self'");
    expect(secConf).toContain("form-action 'self'");

    // Cloudflare/Netlify _headers checks
    expect(staticHeaders).toContain('Content-Security-Policy:');
    expect(staticHeaders).toContain("script-src 'self'");
    expect(staticHeaders).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(staticHeaders).not.toMatch(/script-src[^;]*'unsafe-eval'/);
  });

  it('enforces HSTS with long max-age, includeSubDomains, and preload', () => {
    const secConf = fs.readFileSync(securityHeadersConfPath, 'utf8');
    const staticHeaders = fs.readFileSync(headersPath, 'utf8');

    expect(secConf).toMatch(
      /Strict-Transport-Security.*max-age=63072000.*includeSubDomains.*preload/,
    );
    expect(staticHeaders).toMatch(
      /Strict-Transport-Security:.*max-age=63072000.*includeSubDomains.*preload/,
    );
  });

  it('enforces X-Content-Type-Options: nosniff and Referrer-Policy: no-referrer', () => {
    const secConf = fs.readFileSync(securityHeadersConfPath, 'utf8');
    const staticHeaders = fs.readFileSync(headersPath, 'utf8');

    expect(secConf).toContain('X-Content-Type-Options "nosniff"');
    expect(staticHeaders).toContain('X-Content-Type-Options: nosniff');

    expect(secConf).toContain('Referrer-Policy "no-referrer"');
    expect(staticHeaders).toContain('Referrer-Policy: no-referrer');
  });

  it('enforces minimal Permissions-Policy disabling camera, microphone, and geolocation', () => {
    const secConf = fs.readFileSync(securityHeadersConfPath, 'utf8');
    const staticHeaders = fs.readFileSync(headersPath, 'utf8');

    expect(secConf).toContain('Permissions-Policy');
    expect(secConf).toMatch(/camera=\(\)/);
    expect(secConf).toMatch(/microphone=\(\)/);
    expect(secConf).toMatch(/geolocation=\(\)/);

    expect(staticHeaders).toContain('Permissions-Policy:');
    expect(staticHeaders).toMatch(/camera=\(\)/);
    expect(staticHeaders).toMatch(/microphone=\(\)/);
    expect(staticHeaders).toMatch(/geolocation=\(\)/);
  });

  it('configures SPA fallback and caching rules in nginx.conf', () => {
    const nginxConf = fs.readFileSync(nginxConfPath, 'utf8');

    // SPA fallback
    expect(nginxConf).toContain('try_files $uri $uri/ /index.html');

    // Non-caching index.html
    expect(nginxConf).toContain('location = /index.html');
    expect(nginxConf).toMatch(/Cache-Control.*no-cache.*no-store/);

    // Immutable long-term caching for hashed assets
    expect(nginxConf).toContain('location /assets/');
    expect(nginxConf).toMatch(/Cache-Control.*immutable/);

    // Hide Nginx version tokens
    expect(nginxConf).toContain('server_tokens off;');
  });

  it('configures SPA fallback and caching rules in _headers and _redirects', () => {
    const redirects = fs.readFileSync(redirectsPath, 'utf8');
    const headers = fs.readFileSync(headersPath, 'utf8');

    // SPA redirect
    expect(redirects).toContain('/* /index.html 200');

    // index.html caching
    expect(headers).toContain('Cache-Control: no-cache, no-store, must-revalidate');

    // assets caching
    expect(headers).toContain('Cache-Control: public, max-age=31536000, immutable');
  });

  it('verifies index.html has no external CDN scripts, stylesheets or fonts', () => {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // No third-party domains
    expect(htmlContent).not.toMatch(/https?:\/\/(?!localhost)[^"'\s]+/i);
    expect(htmlContent).not.toContain('googleapis.com');
    expect(htmlContent).not.toContain('gstatic.com');
    expect(htmlContent).not.toContain('cdnjs.cloudflare.com');
    expect(htmlContent).not.toContain('unpkg.com');
  });

  it('verifies Dockerfile and CI/CD workflow security settings', () => {
    const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    // Non-root user in Docker
    expect(dockerfile).toContain('USER nginx');
    expect(dockerfile).toContain('HEALTHCHECK');

    // CI/CD workflow verification step
    expect(workflow).toContain('check-web-security-headers.mjs');
    expect(workflow).toContain('pnpm --filter @exzaestate/web build');
    expect(workflow).toContain('pnpm --filter @exzaestate/web test');
  });
});
