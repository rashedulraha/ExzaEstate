# Security Policy & Vulnerability Disclosure

> **ExzaEstate Enterprise Real Estate & Accounting Platform**  
> We take security and tenant data confidentiality seriously. If you have discovered a security vulnerability, we appreciate your help in disclosing it to us responsibly.

---

## 1. Supported Versions

Only the latest release versions receive security patches and updates:

| Version   |     Supported      | Security Patch Window                                         |
| :-------- | :----------------: | :------------------------------------------------------------ |
| **1.0.x** | :white_check_mark: | Active production support (critical fixes within 24–48 hours) |
| `< 1.0.0` |        :x:         | Deprecated / Development releases                             |

---

## 2. Reporting a Vulnerability

**Please do NOT file public GitHub issues for security vulnerabilities.**

To report a vulnerability, please email our security team directly:

- **Email:** `security@exzaestate.com`
- **PGP Key Fingerprint:** `4A9F B72E 8D11 C34A 5592  B841 99EA 210F 7B18 90A2`
- **Subject Format:** `[Vulnerability Report] Brief description of vulnerability`

### What to Include in Your Report:

1. **Description:** Clear summary of the vulnerability and its potential impact.
2. **Steps to Reproduce:** Exact reproduction steps, proof of concept (PoC) code, or HTTP request/response transcripts.
3. **Affected Components:** The relevant application, package, endpoint, or role scope (e.g. `apps/backend`, `apps/desktop`, `packages/features`).
4. **Remediation Suggestion:** Any mitigation or architectural remediation you recommend.

---

## 3. Response & Remediation Timelines (SLA)

| Milestone                       | SLA Timeline               | Description                                                                  |
| :------------------------------ | :------------------------- | :--------------------------------------------------------------------------- |
| **Initial Acknowledgement**     | **Within 24 hours**        | Confirmation of receipt with an assigned vulnerability tracking ID.          |
| **Preliminary Triage**          | **Within 72 hours**        | Assessment of severity, reproducibility, and confirmation of issue validity. |
| **Status Updates**              | **Every 48 hours**         | Regular communication with the reporter regarding remediation progress.      |
| **Remediation & Patch Release** | **Within 7 business days** | Release of a tested, validated patch across cloud and desktop channels.      |
| **Public Advisory**             | **Coordinated release**    | Publication of CVE/advisory with full attribution to the researcher.         |

---

## 4. In-Scope Targets

- **Cloud API:** All `/api/v1/*` endpoints under `https://api.exzaestate.com`.
- **Web SPA:** All interfaces under `https://app.exzaestate.com`.
- **Desktop Application:** Official Tauri v2 application releases (`macOS`, `Windows`, `Linux`).
- **Data Isolation:** PostgreSQL Row Level Security (RLS) enforcement and tenant boundaries.
- **Financial Immutability:** Protection of posted ledgers, journals, vouchers, and installment allocations.

### Out of Scope:

- Denial of Service (DoS/DDoS) attacks against production infrastructure.
- Social engineering, phishing, or physical attacks against employees or facilities.
- Third-party SaaS services or DNS providers outside of ExzaEstate control.

---

## 5. Safe Harbor Agreement

If you make a good-faith effort to comply with this policy during your security research, we pledge:

- We will consider your research **authorized** and will not pursue legal action against you.
- We will work with you to understand and resolve the issue quickly.
- We will publicly acknowledge your contribution in our release notes (unless you prefer to remain anonymous).
