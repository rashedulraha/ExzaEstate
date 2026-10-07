import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { formatMoney } from '@exzaestate/shared';
import { Button, Breadcrumbs } from '@exzaestate/ui';
import { Plus } from 'lucide-react';
import { useCoaTree } from '../hooks/useCoaTree.js';
import { CoaTreeView } from '../components/coa/CoaTreeView.js';
import { AccountDrawer } from '../components/coa/AccountDrawer.js';
import { AccountModal } from '../components/coa/AccountModal.js';
import type { AccountTreeItem, AccountFormInput } from '../schemas/accounting.schema.js';

function parseBigIntSafe(val?: string | null): bigint {
  if (!val) {
    return 0n;
  }
  try {
    return BigInt(val);
  } catch {
    return 0n;
  }
}

function countAccounts(nodes: AccountTreeItem[]): {
  total: number;
  groups: number;
  terminals: number;
  assetsPaisa: bigint;
  liabilitiesPaisa: bigint;
} {
  let total = 0;
  let groups = 0;
  let terminals = 0;
  let assetsPaisa = 0n;
  let liabilitiesPaisa = 0n;

  function traverse(list: AccountTreeItem[]) {
    for (const node of list) {
      total++;
      if (node.isGroup) {
        groups++;
      } else {
        terminals++;
      }

      if (node.type === 'ASSET') {
        assetsPaisa += parseBigIntSafe(node.balancePaisa);
      } else if (node.type === 'LIABILITY') {
        liabilitiesPaisa += parseBigIntSafe(node.balancePaisa);
      }

      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(nodes);
  return { total, groups, terminals, assetsPaisa, liabilitiesPaisa };
}

export function CoaPage() {
  const navigate = useNavigate();
  const { tree, isLoading, createAccount, updateAccount, isSubmitting } = useCoaTree();

  const [selectedAccount, setSelectedAccount] = useState<AccountTreeItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountTreeItem | null>(null);
  const [parentAccount, setParentAccount] = useState<AccountTreeItem | null>(null);

  const stats = useMemo(() => countAccounts(tree), [tree]);

  const handleSelectAccount = (account: AccountTreeItem) => {
    setSelectedAccount(account);
    setIsDrawerOpen(true);
  };

  const handleAddAccount = (parent?: AccountTreeItem) => {
    setEditingAccount(null);
    setParentAccount(parent || null);
    setIsModalOpen(true);
  };

  const handleEditAccount = (account: AccountTreeItem) => {
    setEditingAccount(account);
    setParentAccount(null);
    setIsDrawerOpen(false);
    setIsModalOpen(true);
  };

  const handleViewLedger = (account: AccountTreeItem) => {
    navigate(`/accounting/ledger?accountId=${account.id}`);
  };

  const handleFormSubmit = async (data: AccountFormInput) => {
    if (editingAccount) {
      await updateAccount(editingAccount.id, data);
    } else {
      await createAccount(data);
    }
  };

  return (
    <div className="container-page space-y-6" data-testid="coa-page">
      {/* Tier 1: Page Shell & Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
              { label: 'Finance & Accounts' },
              { label: 'Chart of Accounts' },
            ]}
          />
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-h1 font-bold text-text">Chart of Accounts</h1>
            <span className="text-caption font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
              {stats.total} {stats.total === 1 ? 'Account' : 'Accounts'}
            </span>
            <span className="text-caption font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              FY 2026–27
            </span>
          </div>
          <p className="text-small text-text-muted mt-1">
            General ledger hierarchy, account groups, and automated double-entry posting rules.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => handleAddAccount()}
          leftIcon={<Plus className="w-4 h-4" />}
          data-testid="add-account-header-btn"
        >
          Add Account
        </Button>
      </div>

      {/* Tier 2: Responsive KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Total Accounts
            </span>
            <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-surface-sunken text-text-muted">
              Active
            </span>
          </div>
          <span className="text-hero-num font-bold text-text mt-1.5 block tabular-nums">
            {stats.total}
          </span>
          <span className="text-caption text-text-muted mt-1 block">
            {stats.terminals} terminal posting accounts
          </span>
        </div>

        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Account Groups
            </span>
            <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Hierarchy
            </span>
          </div>
          <span className="text-hero-num font-bold text-primary mt-1.5 block tabular-nums">
            {stats.groups}
          </span>
          <span className="text-caption text-text-muted mt-1 block">
            Header categories & summary groups
          </span>
        </div>

        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Asset Holdings
            </span>
            <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-info/10 text-info">
              Assets
            </span>
          </div>
          <span className="text-hero-num font-bold text-info mt-1.5 block tabular-nums">
            {formatMoney(stats.assetsPaisa.toString())}
          </span>
          <span className="text-caption text-text-muted mt-1 block">
            Aggregated bank, cash & property assets
          </span>
        </div>

        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Liabilities & Payables
            </span>
            <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning">
              Liabilities
            </span>
          </div>
          <span className="text-hero-num font-bold text-text mt-1.5 block tabular-nums">
            {formatMoney(stats.liabilitiesPaisa.toString())}
          </span>
          <span className="text-caption text-text-muted mt-1 block">
            Supplier payables & customer advances
          </span>
        </div>
      </div>

      {/* Tier 3: Unified COA Tree View Workspace Card */}
      <CoaTreeView
        tree={tree}
        selectedAccountId={selectedAccount?.id}
        onSelectAccount={handleSelectAccount}
        onAddAccount={handleAddAccount}
        isLoading={isLoading}
      />

      <AccountDrawer
        account={selectedAccount}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onEdit={handleEditAccount}
        onViewLedger={handleViewLedger}
      />

      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialAccount={editingAccount}
        parentAccount={parentAccount}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
