# ExzaEstate — Responsible Vulnerability Disclosure Policy

> **Document Version:** 1.0.0  
> **Status:** Active / Production Ready  
> **Authority:** `agent/security.md` §14, §16 (Item 22)  
> **Primary Contact:** `security@exzaestate.com`

---

## 1. Overview & Policy Statement

ExzaEstate is committed to maintaining the highest standard of data security for multi-tenant real estate operations. We value the critical role that ethical security researchers play in identifying potential vulnerabilities before they can be exploited.

This policy defines our guidelines for responsible vulnerability discovery, reporting, handling, and coordinated public disclosure.

---

## 2. Security Contact & PGP Encryption

All reports must be submitted via email to:

- **Email:** `security@exzaestate.com`
- **PGP Fingerprint:** `4A9F B72E 8D11 C34A 5592  B841 99EA 210F 7B18 90A2`
- **Public Key:** Published at `https://exzaestate.com/.well-known/security.txt` and in this repository.

---

## 3. Responsible Disclosure Guidelines

To qualify for Safe Harbor protection, researchers must:

1. Make a good faith effort to avoid privacy violations, data destruction, and interruption of production services.
2. Only interact with accounts you own or with the explicit permission of the account holder.
3. Not view, modify, extract, or delete data belonging to other tenants.
4. Give our engineering team a reasonable period of time (at least 7 business days from triage confirmation) to remediate the vulnerability before publicly discussing or publishing details.
5. Not perform Denial of Service (DoS) attacks, brute-force volume testing against shared rate-limits, or social engineering against team members.

---

## 4. Handling & Remediation Protocol

1. **Receipt (Within 24 Hours):** The security team logs the submission and issues an internal reference ticket.
2. **Reproduction & Triage (Within 72 Hours):** The vulnerability is reproduced in an isolated sandbox. Severity is scored using CVSS v3.1.
3. **Patch Development:** The engineering lead develops and peer-reviews a fix, validated by automated integration and acceptance tests.
4. **Validation & Release:** The patch is deployed to staging, verified, and released to production.
5. **Credit & Recognition:** Once the fix is in production, we coordinate with the researcher to publish a security advisory granting full credit.

---

## 5. Security Hall of Fame

Researchers who responsibly discover and report qualifying security vulnerabilities will be recognized in our official Security Hall of Fame and acknowledged in release release notes.
