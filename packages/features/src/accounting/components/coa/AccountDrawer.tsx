import { formatMoney } from '@exzaestate/shared';
import { Drawer, Button } from '@exzaestate/ui';
import { Shield, BookOpen, Edit2 } from 'lucide-react';
import type { AccountTreeItem } from '../../schemas/accounting.schema.js';

export interface AccountDrawerProps {
  account: AccountTreeItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (account: AccountTreeItem) => void;
  onViewLedger?: (account: AccountTreeItem) => void;
}

export function AccountDrawer({
  account,
  isOpen,
  onClose,
  onEdit,
  onViewLedger,
}: AccountDrawerProps) {
  if (!account) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`${account.code} · ${account.name}`}
      subtitle="General ledger account details and balance overview"
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            {onViewLedger && !account.isGroup && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onViewLedger(account)}
                data-testid="view-account-ledger-btn"
              >
                <BookOpen className="w-4 h-4 mr-1.5" />
                View Ledger
              </Button>
            )}

            {onEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onEdit(account)}
                data-testid="edit-account-btn"
              >
                <Edit2 className="w-4 h-4 mr-1.5" />
                Edit Account
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-text" data-testid="account-drawer-content">
        {/* Balance Card */}
        <div className="p-4 rounded-card border border-border bg-surface-sunken">
          <span className="text-h6 text-text-muted uppercase tracking-wider font-semibold block">
            Current Account Balance
          </span>
          <span className="text-h2 font-extrabold text-text tabular-nums mt-1 block">
            {formatMoney(account.balancePaisa)}
          </span>
          <span className="text-caption text-text-muted mt-1 block">
            Aggregated from posted double-entry journal lines (Asia/Dhaka)
          </span>
        </div>

        {/* Account Details List */}
        <div className="space-y-3 border-t border-border pt-4">
          <h4 className="text-h4 font-bold text-text">Account Attributes</h4>

          <div className="grid grid-cols-2 gap-3 text-body">
            <div>
              <span className="text-caption text-text-muted block">Account Code</span>
              <span className="font-mono font-semibold text-text">{account.code}</span>
            </div>

            <div>
              <span className="text-caption text-text-muted block">Account Category</span>
              <span className="font-medium text-text">{account.type}</span>
            </div>

            <div>
              <span className="text-caption text-text-muted block">Structure Type</span>
              <span className="font-medium text-text">
                {account.isGroup ? 'Summary / Header Group' : 'Posting Account (Terminal)'}
              </span>
            </div>

            <div>
              <span className="text-caption text-text-muted block">System Protection</span>
              <span className="font-medium text-text flex items-center gap-1">
                {account.system ? (
                  <>
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    <span>System Protected</span>
                  </>
                ) : (
                  'Custom User Account'
                )}
              </span>
            </div>

            {account.partyType && (
              <div className="col-span-2">
                <span className="text-caption text-text-muted block">Subledger Party Type</span>
                <span className="font-medium text-text">{account.partyType}</span>
              </div>
            )}

            {account.description && (
              <div className="col-span-2">
                <span className="text-caption text-text-muted block">Purpose & Notes</span>
                <p className="text-body text-text mt-0.5">{account.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Protection notices */}
        {account.system && (
          <div className="p-3.5 rounded-card border border-border bg-surface-sunken/60 text-caption text-text-muted">
            <span className="font-semibold text-text block mb-1">
              Automatic Posting System Anchor
            </span>
            This account is referenced by core automated posting rules (e.g., booking money,
            commissions, or refunds) and cannot be deleted or re-categorized while active.
          </div>
        )}
      </div>
    </Drawer>
  );
}
