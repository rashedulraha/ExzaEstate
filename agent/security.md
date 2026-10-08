# security.md — ExzaEstate Security Hardening Guide

This file is a companion to `prd.md`, `architecture.md`, `rules.md`, `design.md` and `task.md` (precedence in `AGENTS.md`). **Where this file is stricter than another document, this file wins.** `architecture.md` (ARCH-RBAC, multi-tenancy, ARCH-SECURITY, ARCH-OPS) already define the baseline security _architecture_ (tenant isolation, JWT auth, RBAC, helmet, rate limiting). This file goes further: it is the **hardening checklist** — what an AI agent or developer must actively do, on top of that baseline, so the system resists real attackers, not just passes a code review. Treat every unchecked box here as an open vulnerability until it's done.

No system connected to the internet is "unhackable" — the honest goal is to make ExzaEstate expensive, slow, and unrewarding to attack, and fast to detect and recover from if something does get through. This document is written with that honesty throughout.

---

## 0. Threat Model — What We're Actually Defending Against

Be specific about the threats, because generic "be secure" advice misses the real risks for this product:

| Threat                                                                       | Why it matters here                                                                                                                                    |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Credential theft / phishing** against staff (Sales, Accounts, Admin roles) | The single most likely way an attacker gets in — not a database exploit.                                                                               |
| **Cross-tenant data leak**                                                   | This is multi-tenant — one company's customer/financial data leaking into another company's view is a catastrophic, trust-ending bug.                  |
| **Financial record tampering**                                               | Someone editing a posted payment, journal, or receipt to hide theft or fraud — the double-entry immutability rules exist specifically to prevent this. |
| **Privilege escalation**                                                     | A low-privilege user (Sales Executive) gaining Accounts/Admin-level access.                                                                            |
| **Account takeover of an Admin/Director account**                            | Highest-value target — full company data + approval powers.                                                                                            |
| **SQL injection / API abuse**                                                | Standard web attack surface, amplified here because the data is financial.                                                                             |
| **Stolen refresh tokens / session hijacking**                                | Long-lived tokens are a persistent-access target.                                                                                                      |
| **Ransomware / destructive attack on the database or backups**               | An ERP holding a company's entire financial history is a ransom target.                                                                                |
| **Insider misuse**                                                           | An authorized user doing something they're permitted to do, but shouldn't — this is why audit logging is a security control, not just a feature.       |
| **Supply-chain compromise**                                                  | A malicious or compromised npm dependency, not a direct attack on ExzaEstate's own code.                                                               |
| **Desktop app tampering / fake installers**                                  | Since Part B ships an installable desktop app, a fake/modified installer is a phishing vector unique to this client.                                   |

Everything below maps back to one or more of these.

---

## 1. Authentication Hardening

Baseline (JWT + refresh, argon2id, rotation) is in `architecture.md` (ARCH-RBAC). On top of that:

- **Enforce strong passwords**: minimum 12 characters (same as `architecture.md`), checked against a common-password/breached-password list (e.g. via a k-anonymity check against Have I Been Pwned's range API) at signup and password change — reject known-breached passwords outright.
- **Mandatory 2FA (TOTP)** is **permission-based, not role-name-based**: any user holding one of `journal:post`, `payment:refund`, `payment:reverse`, `period:close`, `period:reopen`, `audit:view`, `user:manage`, `role:manage`, `settings:manage`, `approval:override` must have TOTP enrolled before those permissions take effect (API returns `TWO_FACTOR_REQUIRED`). This deliberately covers Accountants who post journals and Auditors, not just Admin/Director. Use TOTP (Google Authenticator/Authy), not SMS OTP (SIM-swap). Secrets are stored encrypted (AES-256-GCM, key from secrets manager); issue 10 single-use recovery codes, stored hashed.
- **Account lockout / progressive delay**: after 5 failed login attempts, lock the account for 15 minutes and require CAPTCHA on the next attempt; after repeated lockouts, require an email/2FA-verified unlock, not just a timer.
- **No username enumeration**: login and password-reset error messages must be identical whether the email exists or not ("If an account exists, we've sent a reset link"), and response timing must not differ measurably.
- **Refresh token rotation with theft detection**: if a refresh token is used a second time after it was already rotated (i.e. reused), treat it as a stolen-token signal — revoke the entire token family for that user and force re-login on all devices, and alert the user by email.
- **Session/device visibility**: users can see "Active Sessions" (device, location, last active) and revoke any of them individually — critical for an Admin to notice and kill an attacker's session.
- **Forced re-authentication** for high-risk actions even within an active session: changing a password, changing 2FA, adding a new admin user, or reversing a large posted journal should re-prompt for the current password (or 2FA code), even if the JWT is still valid.

## 2. Authorization Hardening

- **Deny by default.** Every new endpoint starts with no access; a permission must be explicitly granted via `@RequirePermission`, never implicitly allowed because a guard was forgotten. CI should fail a PR that adds a controller route with no permission decorator (a lint rule or a test that enumerates routes and checks for the decorator).
- **Server-side enforcement only.** As `prd.md` (Key Business Rules) states: a hidden menu item on Desktop or Web is a UX nicety, never a security control. Every permission check that matters lives in the NestJS guard layer.
- **No self-approval on sensitive actions.** The `approvals/` engine (`architecture.md` ARCH-APPROVALS) must reject an approval where `approverId === requestedById` for discount, refund, expense, and journal-posting approvals.
- **Least privilege by default for new users.** New accounts get the lowest applicable role; elevating a user to Admin/Director requires an existing Admin's action, which is itself audit-logged.
- **Permissions are resolved server-side on every request** from a Redis cache (`perm:{companyId}:{userId}`, TTL 5 min) that is **deleted immediately** on any change to roles, role permissions, branch assignment or supervisor mapping — a demoted user's _next_ API call sees the reduced permissions. Never put roles or permissions in the JWT, and never add any other long-lived "is admin" cache.
- **IDOR checks**: every "get/update/delete by ID" endpoint must verify the record belongs to the caller's `company_id` (and, where relevant, `branch_id`) before returning or modifying it — not just that _a_ record with that ID exists. Add an automated test per module that asserts Company A cannot fetch Company B's record by guessing/incrementing an ID.

## 3. Tenant Isolation — Defense in Depth

`architecture.md` (multi-tenancy section) already specifies shared-schema-with-`company_id` plus PostgreSQL Row-Level Security. Treat this as **three independent layers**, all required, because any one layer failing alone should not cause a leak:

1. **Application-layer scoping** — every Prisma query includes `companyId` from the verified `TenantContext`.
2. **`TenantPrisma` Client Extension** (Prisma `$use` middleware no longer exists) — auto-injects `companyId` into `where` clauses as a safety net if a developer forgets layer 1.
3. **PostgreSQL RLS** — the database itself refuses to return rows outside `app.current_company_id`, even if a bug in the application layer would otherwise have leaked them.

- **Test this explicitly**: a dedicated cross-tenant test suite that, for every tenant-scoped table, attempts to read/write another company's row and asserts failure. Run this suite in CI on every PR, not just once at launch.
- **Never trust a `companyId` supplied in a request body, query string, or header** — it may only ever come from the server-verified JWT, full stop.

## 4. Application Security (OWASP-aligned)

- **Injection**: Prisma's parameterized queries are the default defense; raw SQL (`$queryRaw`) is only ever written as a tagged template, never string concatenation — enforced by code review and, where possible, a lint rule banning string-built SQL.
- **Broken access control**: covered by §2–§3 above.
- **Cryptographic failures**: TLS 1.2+ everywhere (reject older protocols at the load balancer/reverse proxy); argon2id for passwords; AES-256 for any field-level encryption (§6); no custom-rolled crypto, ever.
- **Insecure design**: every approvable/financial workflow is modeled through the shared `approvals/` and immutability rules in `architecture.md` (ARCH-FINANCE) — resist the temptation to add a "quick fix" endpoint that bypasses them, even temporarily.
- **Security misconfiguration**: no default credentials anywhere (change every default password/secret before first deploy); disable NestJS/Swagger docs (`/api/docs`) in production or gate it behind auth; disable verbose stack-trace error responses in production (`NODE_ENV=production` must suppress internal error detail from the response body — log it server-side instead).
- **Vulnerable & outdated components**: see §9 (dependency scanning).
- **Identification & authentication failures**: covered by §1.
- **Software & data integrity failures**: CI/CD pipeline artifacts are built from a pinned, reviewed commit only; no unreviewed script runs in the deploy pipeline with production credentials.
- **Logging & monitoring failures**: see §11 — every auth failure, permission-denied, and financial-immutability violation attempt must be logged, not just successes.
- **Server-Side Request Forgery (SSRF)**: any feature that fetches a URL on the server's behalf (e.g. a future integration, a webhook) must validate/allow-list destinations and block requests to internal/private IP ranges (`127.0.0.1`, `169.254.169.254` cloud metadata endpoint, `10.0.0.0/8`, etc.).
- **Rate limiting** beyond auth endpoints: apply sensible per-user/per-IP limits on expensive endpoints (report export, global search, bulk export) to prevent scraping and resource-exhaustion abuse.
- **File upload safety** (`documents/` module, `architecture.md` ARCH-STORAGE): validate file type by content (magic-byte sniffing), not just extension or client-supplied MIME type; enforce a max file size; store uploads in a bucket with public access disabled by default, serving them only via short-lived signed URLs after a permission check; scan uploads for malware if the storage provider offers it, especially for anything an external party (e.g. a vendor) can upload.
- **CORS**: allow-list only the known Desktop (Tauri) origin and the deployed Web origin per environment — never `*` in production, per `architecture.md` ARCH-SECURITY.
- **Security headers**: `helmet` covers most of this (`architecture.md` ARCH-SECURITY); explicitly confirm `Content-Security-Policy`, `X-Frame-Options: DENY` (or `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, and `Strict-Transport-Security` (HSTS, with `includeSubDomains` and a long `max-age`) are all present on every response from the Web app's hosting layer, not just the API.

## 5. Financial-Data-Specific Security

These are security controls, even though they're framed as business rules in `architecture.md` (ARCH-FINANCE):

- Posted journals, posted payments, and issued receipts have **no update/delete endpoint at all** — this isn't just data-integrity, it's the primary defense against an insider or attacker quietly altering financial history. Confirm this at the routing level, not just the service level (i.e. the route literally doesn't exist, rather than existing and returning 403).
- Every reversal (`reverseAndCorrect`) and every property-status override writes an immutable `audit_logs` entry (`architecture.md` ARCH-AUDIT) including `actorId` and `ipAddress` — this is what makes a fraud investigation possible after the fact.
- Large or unusual financial actions (a refund above a configurable threshold, a journal reversal, a permission escalation) should trigger a real-time alert (email/Slack/webhook to Admin/Director) in addition to the audit log — don't wait for someone to notice it in a report days later.
- Approval-matrix and numbering-format configuration changes (`prd.md` §6.9, §6.36) are themselves audit-logged and restricted to Admin-level permission — an attacker who could quietly raise their own discount ceiling would defeat the whole approval system.

## 6. Data Protection & Encryption

- **In transit**: TLS everywhere — API, Web app, and any admin/ops tooling. No plaintext HTTP, including internally between services in production.
- **At rest**: database-level encryption at rest (most managed Postgres providers offer this by default — confirm it's enabled, don't assume). Object storage (S3-compatible) buckets also encrypted at rest.
- **Field-level encryption** for especially sensitive data beyond normal DB-at-rest encryption where warranted — e.g. national ID numbers, bank account details — using AES-256-GCM with keys managed by a secrets manager/KMS, not stored alongside the encrypted data.
- **PII minimization**: only collect and retain personal data (customer NID, phone, address) that the business genuinely needs; define a retention policy for leads that never convert.
- **Backups are encrypted too** — an unencrypted backup is an equally attractive, often less-monitored target.

## 7. Secrets Management

- No secret (DB password, JWT signing key, S3 credentials, SMS/email provider API keys) is ever committed to version control — enforce with a pre-commit secret-scanner (e.g. gitleaks) in the Husky hook from `rules.md` §5, and again in CI as a second gate.
- Production secrets live in a secrets manager (cloud provider's secret manager, or at minimum encrypted environment variables in the deploy platform) — never in a plain `.env` file on a server.
- **Rotate the JWT signing key, DB credentials, and third-party API keys periodically**, and immediately upon any suspected compromise or when an employee with access leaves.
- Different secrets per environment (`development`/`staging`/`production`) — a staging leak must never expose production credentials.

## 8. Phishing & Social-Engineering Defense

Phishing targets people, not code — so this section is partly organizational, not just technical:

- **Email/domain security**: SPF, DKIM, and DMARC (`p=reject` once confident) configured on the company's sending domain, so attackers can't easily spoof "official" ExzaEstate/company emails to staff.
- **In-app phishing resistance**: password-reset and account-notification emails always link to the known, bookmarked production domain — train staff to never enter credentials via a link in an unexpected email, and never ask for a password/OTP over phone or chat as an internal policy.
- **2FA specifically blunts credential-phishing**: even if a password is phished, TOTP 2FA (§1) means the attacker still can't log in — this is the single highest-leverage defense against phishing for this product.
- **Desktop installer authenticity** (unique to Part B): code-sign every release (`architecture.md` §12.6, desktop specifics) so the OS itself warns on a tampered/unsigned installer; publish checksums (SHA-256) alongside every release; only distribute installers from the official release channel — never email an `.exe`/`.dmg` directly to a customer, since that's exactly the pattern phishing/malware campaigns imitate.
- **Staff security awareness**: basic internal guidance for non-technical roles (Sales, Accounts) — don't click unexpected links, verify unusual payment/refund requests out-of-band (a phone call, not just an email/WhatsApp reply) before acting, especially for anything resembling "urgent wire transfer" social engineering (classic Business Email Compromise pattern against Accounts staff).
- **Suspicious-login alerts**: notify a user by email when their account is accessed from a new device/location, so a successful phishing login is noticed quickly even if 2FA was somehow bypassed or not yet enabled for that role.

## 9. Dependency & Supply-Chain Security

- Automated dependency vulnerability scanning (`npm audit`, GitHub Dependabot, or Snyk) running in CI on every PR and on a schedule — not just at project start.
- Pin dependency versions (lockfile committed, `pnpm-lock.yaml`); review the diff of a lockfile change in PRs, not just the `package.json` diff.
- Avoid adding a new dependency for something a well-maintained existing one already covers (`rules.md` dependencies section already says this for code-quality reasons — it's also an attack-surface reduction).
- For the Desktop app specifically: pin the exact Tauri and Rust toolchain versions in CI so a build is reproducible and not silently pulling a compromised transitive dependency at build time.

## 10. Infrastructure & Network Security

- **Database**: never exposed directly to the public internet — reachable only from the backend's private network/VPC; a separate, least-privilege DB user for the application (no superuser) with only the permissions Prisma actually needs.
- **Redis**: password-protected, not exposed publicly, and ideally on the same private network as the backend.
- **Principle of least privilege for infrastructure access**: developers get scoped, individual cloud-console/SSH access (no shared root credentials); production database access is logged and, ideally, requires a break-glass/approval process rather than being routinely open.
- **Firewalling**: only the ports genuinely needed (443 for the API/Web, and whatever's needed for DB/Redis _between_ internal services) are open; everything else closed by default.
- **DDoS/edge protection**: put the Web app and API behind a CDN/WAF (e.g. Cloudflare or the hosting provider's equivalent) that can absorb volumetric attacks and filter obviously malicious traffic before it reaches the application.

## 11. Monitoring, Logging & Intrusion Detection

`architecture.md` ARCH-OPS covers general observability (structured logs, error tracking, health check). For security specifically:

- **Log every security-relevant event**, success and failure: login attempts (success/fail), password/2FA changes, permission/role changes, every `APPROVAL_REQUIRED`/approval decision, every property-status override, every journal reversal, every failed permission check (`FORBIDDEN` responses) — these logs are what let you reconstruct "what happened" after an incident, distinct from the business `audit_logs` table which tracks _data_ changes.
- **Alerting, not just logging**: a spike in failed logins from one IP, a sudden burst of `FORBIDDEN` responses, an Admin account logging in from a new country, or an unusual volume of report/data exports should trigger a real-time alert to whoever owns security for the project — logs nobody reads don't prevent anything.
- **Centralize logs** somewhere append-only and separate from the production database, so an attacker who compromises the app server can't also erase the evidence of how they got in.
- **Retain logs long enough** to investigate a slow-burn attack (compromised credentials sometimes sit unused for weeks) — a reasonable minimum is 90 days for security logs, longer for `audit_logs` given their business/financial-record purpose.

## 12. Backup & Disaster Recovery

- **Automated, regular, encrypted backups** of the database (per `prd.md` §7) — and, critically, **backups stored separately** from the primary infrastructure (different account/region/provider where feasible), so a compromised or ransomed production environment doesn't also take the backups down with it.
- **Test restores periodically** — an untested backup is a hope, not a plan. Schedule a real restore-to-a-fresh-environment drill (e.g. quarterly).
- **Immutable/versioned backups** where the storage provider supports it, so ransomware that encrypts live data can't also silently overwrite the backup history.
- **Document the recovery runbook**: who has access to trigger a restore, what the expected recovery time is, and what the acceptable data-loss window (RPO) is.

## 13. Incident Response Plan (have this before you need it)

1. **Detect** — via the alerting in §11, a user report, or a third-party disclosure.
2. **Contain** — revoke the affected user's/service's tokens and sessions immediately (§1's session-revocation capability exists for exactly this); if a credential or key is confirmed compromised, rotate it (§7) right away.
3. **Assess scope** — use `audit_logs` and the security logs from §11 together to determine what was accessed/changed and by whom.
4. **Eradicate** — patch the vulnerability that allowed access before restoring normal operation, not after.
5. **Recover** — restore from a known-clean backup if data integrity is in question (§12); verify financial data reconciles (customer statements vs. AR ledger, per `prd.md` §12) before declaring recovery complete.
6. **Notify** — inform affected companies/customers if their data was exposed, per whatever legal/regulatory obligation applies; be honest and specific, not vague.
7. **Review** — a blameless post-incident review: what failed, what worked, what changes (technical or process) prevent a repeat. Update this file if the incident reveals a gap in it.

Write down _who_ is responsible for each step before an incident happens — deciding that during an active breach wastes the time that matters most.

## 14. Security Testing

- **Automated**: the cross-tenant test suite (§3), the dependency scan (§9), and a route-permission-coverage check (§2) all run in CI on every PR — security regressions get caught the same way functional regressions do.
- **Manual/periodic**: a focused security review (internal or third-party penetration test) before the first production launch, and again after any major architectural change (e.g. adding a customer-facing portal, per `prd.md`'s "future" note) — prioritize testing authentication, tenant isolation, and the financial-immutability rules specifically, since those are this product's highest-value targets.
- **Bug bounty / responsible disclosure**: even a simple `security@` contact and a stated policy ("tell us, we won't take legal action against good-faith reports, here's our response timeline") makes it more likely a researcher reports a flaw to you instead of selling or publishing it.

## 15. Additional controls (each has an owner task in `task.md`)

- **Step-up re-authentication** (`STEP_UP_REQUIRED`): password or TOTP re-prompt (valid 5 min) before: changing password/2FA, creating an admin user, changing permissions, closing/reopening a period, reversing a journal above the configured amount, approving a refund above the configured amount, changing the approval matrix.
- **Joint control for `approval:override`:** overriding a pending approval needs two different users holding the permission (Managing Director + GM); single-user override does not exist.
- **Session list:** `GET /auth/sessions`, `DELETE /auth/sessions/:id`, `POST /auth/logout-all`; new-device email alert.
- **Progressive lockout:** 5 failures → 15-minute lock (Redis `lockout:{email}`); 3 lockouts in 24 h → require email + TOTP unlock; CAPTCHA after the first lock.
- **Field encryption** (NID, bank account numbers): AES-256-GCM via a `FieldCrypto` service, keys from the secrets manager, key id stored beside ciphertext to allow rotation. Encrypted columns are never used in `LIKE` search.
- **Security event log** (`security_events`, insert-only, separate from `audit_logs`): logins (ok/fail), lockouts, 2FA changes, `FORBIDDEN`, approval decisions, status overrides, reversals, refresh-token reuse; shipped to central append-only storage.
- **Desktop (Tauri) hardening:** minimal capability set (no broad `fs`/`shell` permissions; `openExternal` allow-listed to https), strict CSP in `tauri.conf`, updater signature verification mandatory, no remote content loaded into the webview, refresh token only in the OS keychain.
- **Web SPA hosting headers:** CSP without `unsafe-inline`/`unsafe-eval`, `frame-ancestors 'none'`, HSTS, `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, `Permissions-Policy` minimal — set at the CDN/static host (the API's `helmet` does not cover them).
- **Fonts and assets self-hosted** (no third-party CDN) so the CSP stays tight and the desktop app is not dependent on an external host.

## 16. Pre-Launch Security Checklist (All 22 Evidenced in docs/security/RELEASE_EVIDENCE.md)

- [x] 2FA enforced for every user holding a mandatory-2FA permission (permission-based, incl. Accountant and Auditor)
- [x] Step-up re-auth, session list/revoke, field encryption and security-event log implemented
- [x] Account lockout + no username enumeration on login/reset flows
- [x] Refresh-token reuse detection wired up
- [x] RLS enabled on every tenant-scoped table, with the cross-tenant test suite passing
- [x] Every route has a permission decorator (checked by CI)
- [x] No self-approval possible on discount/refund/expense/journal approvals
- [x] Posted journals/payments/receipts confirmed to have no update/delete route at all
- [x] TLS enforced everywhere; HSTS, CSP, and other security headers present on both API and Web app
- [x] Swagger docs (`/api/docs`) disabled or auth-gated in production
- [x] Verbose error/stack traces suppressed in production responses
- [x] Secrets in a secrets manager, none in version control, scanned by a pre-commit + CI secret scanner
- [x] SPF/DKIM/DMARC configured on the sending domain
- [x] Desktop installers code-signed, checksums published, distributed only via the official release channel
- [x] Desktop licensing & hardware binding active: Ed25519 cryptographic verification, machine fingerprinting, and clock-tampering defense (SEC-LICENSE)
- [x] Dependency vulnerability scanning active in CI
- [x] Database and Redis not publicly reachable; least-privilege DB user in use
- [x] WAF/CDN in front of the Web app and API
- [x] Security-relevant events logged and alerting configured (§11)
- [x] Backups automated, encrypted, stored separately from production, and restore-tested at least once
- [x] Incident response plan written down and roles assigned
- [x] A `security@` contact / disclosure policy published

---

## 17. Commercial Licensing, Hardware Binding & Anti-Piracy [SEC-LICENSE]

Commercial desktop installations are defended against unauthorized replication and reselling via cryptographic machine binding:

- **Hardware Fingerprint Extraction:** The Tauri native layer extracts CPU ID, motherboard UUID, and primary disk serial number to compute a deterministic SHA-256 `machine_id`. The license key is locked to this hardware identifier upon activation.
- **Asymmetric License Cryptography (Ed25519):** Licenses are digitally signed on the central licensing server using an Ed25519 private key and verified locally in the desktop app via an embedded public key. Tampering with valid dates or license fields breaks mathematical signature verification and locks the application.
- **Clock Rollback Prevention:** Every transaction updates a monotonic timestamp high-water mark in the database. If the operating system clock is moved backward, write operations are immediately locked until re-verified.
- **Credential Protection:** License tokens and cryptographic signatures are persisted in the OS secure credential store (`SecureStorage`), never in unencrypted text files or browser local storage.

---

_This file is a living document — update it whenever a new module, integration, or client is added (e.g. a future customer portal per `prd.md`), and revisit the checklist in §16 before every major release, not just the first one._
