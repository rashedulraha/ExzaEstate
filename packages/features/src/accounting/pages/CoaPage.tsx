import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCoaTree } from '../hooks/useCoaTree.js';
import { CoaTreeView } from '../components/coa/CoaTreeView.js';
import { AccountDrawer } from '../components/coa/AccountDrawer.js';
import { AccountModal } from '../components/coa/AccountModal.js';
import type { AccountTreeItem, AccountFormInput } from '../schemas/accounting.schema.js';

export function CoaPage() {
  const navigate = useNavigate();
  const { tree, isLoading, createAccount, updateAccount, isSubmitting } = useCoaTree();

  const [selectedAccount, setSelectedAccount] = useState<AccountTreeItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountTreeItem | null>(null);
  const [parentAccount, setParentAccount] = useState<AccountTreeItem | null>(null);

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
    <div className="space-y-6" data-testid="coa-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-text">Chart of Accounts (COA)</h1>
          <p className="text-small text-text-muted mt-1">
            General ledger hierarchy, account groups, and automated posting configuration.
          </p>
        </div>
      </div>

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
