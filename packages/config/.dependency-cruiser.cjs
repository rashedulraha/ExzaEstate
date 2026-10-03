/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are forbidden.',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'apps-never-import-each-other',
      severity: 'error',
      comment: 'Apps may never import other apps.',
      from: {
        path: '^apps/([^/]+)/',
      },
      to: {
        path: '^apps/(?!$1)[^/]+/',
      },
    },
    {
      name: 'packages-never-import-apps',
      severity: 'error',
      comment: 'Packages must never import apps.',
      from: {
        path: '^packages/',
      },
      to: {
        path: '^apps/',
      },
    },
    {
      name: 'shared-imports-nothing-internal',
      severity: 'error',
      comment: 'packages/shared imports nothing internal.',
      from: {
        path: '^packages/shared/',
      },
      to: {
        path: '^packages/(?!shared/)|^@exzaestate/(?!shared$)',
      },
    },
    {
      name: 'ui-imports-only-shared',
      severity: 'error',
      comment: 'packages/ui may import packages/shared only.',
      from: {
        path: '^packages/ui/',
      },
      to: {
        path: '^packages/(?!ui/|shared/)|^@exzaestate/(?!shared$)',
      },
    },
    {
      name: 'api-client-imports-only-shared',
      severity: 'error',
      comment: 'packages/api-client may import packages/shared only.',
      from: {
        path: '^packages/api-client/',
      },
      to: {
        path: '^packages/(?!api-client/|shared/)|^@exzaestate/(?!shared$)',
      },
    },
    {
      name: 'app-core-allowed-imports',
      severity: 'error',
      comment: 'packages/app-core may import shared, api-client, ui only.',
      from: {
        path: '^packages/app-core/',
      },
      to: {
        path: '^packages/(?!app-core/|shared/|api-client/|ui/)|^@exzaestate/(?!shared$|api-client$|ui$)',
      },
    },
    {
      name: 'features-allowed-imports',
      severity: 'error',
      comment: 'packages/features may import app-core, ui, api-client, shared only.',
      from: {
        path: '^packages/features/',
      },
      to: {
        path: '^packages/(?!features/|app-core/|ui/|api-client/|shared/)|^@exzaestate/(?!app-core$|ui$|api-client$|shared$)',
      },
    },
    {
      name: 'modules-never-import-adapters',
      severity: 'error',
      comment: 'Backend modules/* may import ports/* but NEVER adapters/*. [ARCH-BACKEND]',
      from: {
        path: '^apps/backend/src/modules/',
      },
      to: {
        path: '^apps/backend/src/adapters/',
      },
    },
    {
      name: 'controllers-no-prisma-or-database',
      severity: 'error',
      comment: 'Controllers handle HTTP only and cannot import Prisma or database services.',
      from: {
        path: '^apps/backend/src/modules/.*\\.controller\\.ts$',
      },
      to: {
        path: '(@prisma/client|apps/backend/src/database)',
      },
    },
    {
      name: 'tauri-only-in-desktop-platform',
      severity: 'error',
      comment: '@tauri-apps/* importable only under apps/desktop/src/platform.',
      from: {
        pathNot: '^apps/desktop/src/platform/',
      },
      to: {
        path: '^@tauri-apps/',
      },
    },
    {
      name: 'layer-l0-no-higher-layers',
      severity: 'error',
      comment: 'L0 platform cannot depend on higher layers (modules/*).',
      from: {
        path: '^apps/backend/src/(common|config|database|ports|adapters|platform)/',
      },
      to: {
        path: '^apps/backend/src/modules/',
      },
    },
    {
      name: 'layer-l1-foundation-rules',
      severity: 'error',
      comment: 'L1 Foundation modules may only depend on L0, not L2-L5.',
      from: {
        path: '^apps/backend/src/modules/(auth|company|settings|documents|notifications|approvals|audit|realtime)/',
      },
      to: {
        path: '^apps/backend/src/modules/(land|project|property|crm|employee|assets|accounting|sales|collection|expense|procurement|development|maintenance|commission|reports|dashboard)/',
      },
    },
    {
      name: 'layer-l2-master-data-rules',
      severity: 'error',
      comment: 'L2 Master data modules may only depend on L0-L1, not L3-L5.',
      from: {
        path: '^apps/backend/src/modules/(land|project|property|crm|employee|assets)/',
      },
      to: {
        path: '^apps/backend/src/modules/(accounting|sales|collection|expense|procurement|development|maintenance|commission|reports|dashboard)/',
      },
    },
    {
      name: 'layer-l3-accounting-rules',
      severity: 'error',
      comment: 'L3 Accounting may depend only on L0-L1, not L2, L4-L5.',
      from: {
        path: '^apps/backend/src/modules/accounting/',
      },
      to: {
        path: '^apps/backend/src/modules/(land|project|property|crm|employee|assets|sales|collection|expense|procurement|development|maintenance|commission|reports|dashboard)/',
      },
    },
    {
      name: 'layer-l4-transactions-rules',
      severity: 'error',
      comment: 'L4 Transactions cannot depend on L5.',
      from: {
        path: '^apps/backend/src/modules/(sales|collection|expense|procurement|development|maintenance|commission)/',
      },
      to: {
        path: '^apps/backend/src/modules/(reports|dashboard)/',
      },
    },
    {
      name: 'layer-l4-intra-layer-sales-to-collection-only',
      severity: 'error',
      comment: 'Within L4 Transactions, only sales -> collection is permitted.',
      from: {
        path: '^apps/backend/src/modules/(collection|expense|procurement|development|maintenance|commission)/',
      },
      to: {
        path: '^apps/backend/src/modules/(sales|expense|procurement|development|maintenance|commission)/',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'packages/config/tsconfig.base.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types'],
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
