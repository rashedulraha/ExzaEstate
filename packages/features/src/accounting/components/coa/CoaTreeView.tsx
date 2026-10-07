import { useState, useMemo } from 'react';
import { Button, Input, Select, EmptyState } from '@exzaestate/ui';
import { Plus, Search, X } from 'lucide-react';
import type { AccountTreeItem } from '../../schemas/accounting.schema.js';
import { TreeNode } from './CoaTreeNode.js';

export interface CoaTreeViewProps {
  tree: AccountTreeItem[];
  selectedAccountId?: string;
  onSelectAccount: (account: AccountTreeItem) => void;
  onAddAccount?: (parent?: AccountTreeItem) => void;
  isLoading?: boolean;
}

// Helper to filter tree by search query or account type
function filterAccountTree(
  nodes: AccountTreeItem[],
  query: string,
  typeFilter: string,
): AccountTreeItem[] {
  if (!query && !typeFilter) return nodes;

  return nodes.reduce<AccountTreeItem[]>((acc, node) => {
    const matchesQuery =
      !query || node.code.toLowerCase().includes(query) || node.name.toLowerCase().includes(query);
    const matchesType = !typeFilter || node.type === typeFilter;

    const filteredChildren = node.children
      ? filterAccountTree(node.children, query, typeFilter)
      : [];

    if ((matchesQuery && matchesType) || filteredChildren.length > 0) {
      acc.push({
        ...node,
        children: filteredChildren,
      });
    }

    return acc;
  }, []);
}

export function CoaTreeView({
  tree,
  selectedAccountId,
  onSelectAccount,
  onAddAccount,
  isLoading = false,
}: CoaTreeViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [expandAll, setExpandAll] = useState<boolean | null>(null);

  const filteredTree = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return filterAccountTree(tree, q, selectedType);
  }, [tree, searchQuery, selectedType]);

  const hasActiveFilters = Boolean(searchQuery || selectedType);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-text-muted rounded-card border border-border bg-surface">
        Loading chart of accounts structure...
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface p-12">
        <EmptyState
          icon={<Folder className="w-6 h-6" />}
          title="No Chart of Accounts Loaded"
          description="Initialize or create your enterprise chart of accounts to configure ledgers."
          actionLabel="Create First Account"
          onAction={onAddAccount ? () => onAddAccount() : undefined}
          dashedBorder
        />
      </div>
    );
  }

  return (
    <div
      data-testid="coa-tree-view"
      className="rounded-card border border-border bg-surface shadow-xs space-y-0"
    >
      {/* Workspace Card Header & Filter Toolbar */}
      <div className="p-4 border-b border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            id="coaSearchInput"
            placeholder="Search accounts by code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-44">
            <Select
              id="coaTypeFilter"
              value={selectedType}
              onChange={(val) => setSelectedType(val)}
              options={[
                { value: '', label: 'All Categories' },
                { value: 'ASSET', label: 'Assets' },
                { value: 'LIABILITY', label: 'Liabilities' },
                { value: 'EQUITY', label: 'Equity' },
                { value: 'INCOME', label: 'Income' },
                { value: 'EXPENSE', label: 'Expenses' },
              ]}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setExpandAll(true)}
              className="text-small whitespace-nowrap"
            >
              Expand All
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setExpandAll(false)}
              className="text-small whitespace-nowrap"
            >
              Collapse
            </Button>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedType('');
              }}
              className="text-text-muted hover:text-text text-small whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Reset
            </Button>
          )}

          {onAddAccount && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAddAccount()}
              data-testid="add-root-account-btn"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Account
            </Button>
          )}
        </div>
      </div>

      {/* Tree Content */}
      <div className="p-3 flex flex-col space-y-0.5">
        {filteredTree.length === 0 ? (
          <div className="py-10">
            <EmptyState
              icon={<Search className="w-6 h-6" />}
              title="No Accounts Match Filter"
              description="No accounts match your current code, name, or category filter."
              actionLabel="Clear Filters"
              onAction={() => {
                setSearchQuery('');
                setSelectedType('');
              }}
              dashedBorder
            />
          </div>
        ) : (
          filteredTree.map((root) => (
            <TreeNode
              key={root.id}
              item={root}
              level={0}
              selectedId={selectedAccountId}
              onSelect={onSelectAccount}
              onAddChild={onAddAccount}
              forcedExpand={hasActiveFilters ? true : expandAll}
            />
          ))
        )}
      </div>
    </div>
  );
}
