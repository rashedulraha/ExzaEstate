# Golden Reference: Frontend Feature Structure (Part B & C)

Per `architecture.md` §12.1, §18 and `design.md` §7.1, the **Property Inventory** module serves as the **Golden Reference** for all frontend features across the Tauri 2 Desktop app (`apps/desktop`) and Vite Web app (`apps/web`). Every subsequent feature in `packages/features/src/` must follow this exact file layout and convention.

## Directory Structure

All domain feature modules live inside `packages/features/src/property/`. The application shells (`apps/desktop` and `apps/web`) mount the root route tree and never duplicate feature logic or templates.

```
packages/features/src/property/
├── pages/
│   ├── PropertyListPage.tsx           # Main container: Table View <-> Plan View toggle, filters, pagination
│   └── PropertyDetailPage.tsx         # Detailed inspection page with audit history and timeline
├── components/
│   ├── PropertyDataTable.tsx          # Default virtualized table view with sorting and column toggling
│   ├── PropertyPlanView.tsx           # Interactive Block → Road/Floor layout (wraps packages/ui PlanView)
│   ├── PropertyDrawer.tsx             # Slide-over quick inspection drawer: pricing breakdown, history
│   ├── PropertyFormModal.tsx          # Create / Edit unit modal (RHF + Zod; price calculated via shared Money)
│   └── PropertyStatusOverrideModal.tsx# Elevated status override dialog with mandatory reason [RULE-PROPERTY-STATUS]
├── hooks/
│   ├── usePropertyList.ts            # Consumes generated TanStack Query hooks from @exzaestate/api-client
│   └── usePropertyActions.ts         # Mutation helpers with toast notifications and cache invalidations
├── schemas/
│   └── property.schema.ts             # Zod form validation schemas (synced with DTO validation contracts)
├── property.routes.tsx                # Route definitions with lazy loading: ['/properties', '/properties/:id']
└── index.ts                           # Public barrel export
```

## Non-Negotiable Frontend Conventions

1. **Generated Client Only**: All network queries and mutations strictly use `@exzaestate/api-client` (OpenAPI generated via `orval`). Never hand-write `fetch()` or `axios` calls.
2. **Design Tokens & UI Primitives**: Use only components from `@exzaestate/ui` (`Button`, `Input`, `Dialog`, `Drawer`, `DataTable`, `StatusBadge`, `Skeleton`). Never create feature-local badges or ad-hoc Tailwind color classes. Property statuses use the universal `<StatusBadge status={property.status} />` from `@exzaestate/ui`.
3. **Signature Components**: The interactive `PlanView` primitive is implemented in `@exzaestate/ui/src/components/plan-view/` as a reusable signature component (`design.md` §7.1). `PropertyPlanView.tsx` simply wires the domain property data into this primitive.
4. **Bangladeshi Formatting**: Always format BDT currency via `formatMoney(netPrice)` with lakh/crore grouping (`৳50,00,000`), and dates via `formatDate(date, 'Asia/Dhaka')` from `@exzaestate/shared`.
5. **No Client-Side Financial Invariants**: Net price calculations in `PropertyFormModal` strictly invoke pure functions from `@exzaestate/shared` (`Money.allocate`, `Money.subtract`) or query the backend preview calculation endpoint.
6. **Permission Gates**: All sensitive actions must be wrapped with `<PermissionGate permission={PERMISSIONS.PROPERTY_OVERRIDE_STATUS}>` or guarded via `usePermission()`.
7. **No Hardcoded Mocks**: The UI communicates strictly with the real PostgreSQL backend populated via `pnpm db:seed:demo` (`ARCH-SEED`).
