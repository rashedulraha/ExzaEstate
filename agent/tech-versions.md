# tech-versions.md — Technical Dependency Version Manifest

This document records the exact verified dependency versions for **ExzaEstate** as required by `[ARCH-VERSIONS]` and Task **A0.1**.

- **Verification Date:** 2026-09-30
- **Version Policy:** Exact stable versions are pinned where practical. Pre-release, alpha, beta, RC, nightly, and canary versions are excluded from the production manifest.

---

## 1. Verified Dependency Manifest

| Tool / Dependency  | Specification / Major | Verified Stable Version         | Purpose                                                        |
| :----------------- | :-------------------- | :------------------------------ | :------------------------------------------------------------- |
| **Node.js**        | 24 LTS                | `24.21.0 LTS`                   | Runtime environment (`.nvmrc`, `engines`)                      |
| **pnpm**           | 12                    | `12.8.2`                        | Workspace package manager                                      |
| **TypeScript**     | 7                     | `7.0.2`                         | Typed codebase compiler across all apps and packages           |
| **NestJS**         | 12 (ESM)              | `12.1.1`                        | Backend modular monolith API                                   |
| **Prisma**         | 7                     | `7.10.0`                        | Multi-file schema ORM with `@prisma/adapter-pg` driver adapter |
| **PostgreSQL**     | 18                    | `18.6` (`postgres:18.6-alpine`) | Multi-tenant RLS database                                      |
| **Redis**          | 8                     | `8-alpine`                      | Cache, permission invalidation, BullMQ queues                  |
| **React**          | 19                    | `19.3.0`                        | UI library for desktop and web shells                          |
| **Vite**           | 8                     | `8.3.1`                         | Frontend build tool and dev server                             |
| **React Router**   | 8                     | `8.4.0`                         | Routing for Desktop and Web apps                               |
| **TanStack Query** | 5                     | `5.104.0`                       | Server state management and caching via `packages/api-client`  |
| **Tailwind CSS**   | 4                     | `4.3.3`                         | CSS-first, design-token-based styling                          |
| **Tauri**          | 2                     | `2.12.0`                        | Cross-platform desktop runtime (Rust shell)                    |
| **Zod**            | 4                     | `4.6.5`                         | Frontend schemas and backend config validation                 |
| **BullMQ**         | 6                     | `6.3.9`                         | Background job queues (worker process)                         |
| **Vitest**         | 5                     | `5.0.2`                         | Unit and integration test runner                               |
| **oxlint**         | 1                     | `1.86.0`                        | Fast JavaScript/TypeScript linter                              |
| **Turborepo**      | 2                     | `2.11.5`                        | Monorepo build orchestrator                                    |
| **Pino**           | 10                    | `10.3.1`                        | Structured JSON logger with redaction                          |
| **date-fns**       | 4                     | `4.4.0`                         | Date formatting with timezone support (`Asia/Dhaka`)           |
| **Argon2**         | 0.45                  | `0.45.1`                        | Secure password hashing (`argon2id`)                           |

---

## 2. Runtime & Configuration Notes

### 2.1 Node.js

- ExzaEstate standardizes on **Node.js 24.21.0 LTS** for the project runtime.
- Node.js `26.10.0` is the current release, but it is not used as the project's LTS baseline.

**Recommended `.nvmrc`:**

```text
24.21.0
```

### 2.2 PostgreSQL

Use the exact Docker image:

```yaml
image: postgres:18.6-alpine
```

### 2.3 Redis

The project uses Redis 8:

```yaml
image: redis:8-alpine
```

### 2.4 Prisma

Prisma 8 currently has release-candidate builds, so the production manifest remains on the latest stable Prisma 7 release:

```text
7.10.0
```

### 2.5 React Router

React Router 8 is the current latest major release:

```text
8.4.0
```

> [!NOTE]
> If the existing codebase is already implemented against React Router 7 APIs, treat the migration to 8 as a deliberate migration task rather than silently mixing major versions.

### 2.6 Tailwind CSS

ExzaEstate uses Tailwind CSS 4's CSS-first configuration model.

**Usage:**

```css
@import 'tailwindcss';

@theme {
  /* ExzaEstate design tokens */
}
```

> [!WARNING]
> Do not introduce a legacy Tailwind v3 `tailwind.config.js` unless a specific compatibility requirement is documented.

---

## 3. Version Policy

1. **Prefer Stable Releases:** Prefer the latest stable release for new dependencies.
2. **No Pre-releases in Production:** Do not use alpha, beta, RC, nightly, or canary releases in the production manifest.
3. **Exact Pinning:** Pin critical infrastructure and build-tool versions exactly.
4. **LTS Baseline:** Keep Node.js on an LTS release for the production baseline.
5. **Explicit Migrations:** Major-version upgrades must be treated as explicit migration work.
6. **Manifest Maintenance:** Update this file whenever a dependency is intentionally upgraded.
7. **Source of Truth:** `pnpm-lock.yaml` remains the source of truth for the exact resolved dependency graph.
