import { useState } from 'react';
import { Send, Calendar, Building2 } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Drawer, Button } from '@exzaestate/ui';
import type { VendorBillItem } from '../../schemas/operations.schema.js';

export interface VendorBillDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bill: VendorBillItem | null;
  onPostToAp?: (billId: string) => Promise<void>;
}

export function VendorBillDrawer({ isOpen, onClose, bill, onPostToAp }: VendorBillDrawerProps) {
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !bill) return null;

  const handlePost = async () => {
    if (!onPostToAp) return;
    setIsPosting(true);
    setError(null);
    try {
      await onPostToAp(bill.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post bill to AP');
    } finally {
      setIsPosting(false);
    }
  };

  const getStatusBadge = (status: VendorBillItem['status']) => {
    switch (status) {
      case 'DRAFT':
        return 'border-border bg-surface-sunken text-text-muted';
      case 'POSTED':
        return 'border-info/30 bg-info/10 text-info';
      case 'PAID':
        return 'border-success/30 bg-success/10 text-success';
      case 'CANCELLED':
        return 'border-danger/30 bg-danger/10 text-danger';
    }
  };

  const footerAction =
    bill.status === 'DRAFT' && onPostToAp ? (
      <Button
        variant="primary"
        onClick={handlePost}
        disabled={isPosting}
        isLoading={isPosting}
        leftIcon={<Send className="h-4 w-4" />}
        className="w-full"
      >
        Post to Accounts Payable (AP)
      </Button>
    ) : undefined;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={bill.billNumber}
      subtitle="Vendor Bill / Accounts Payable"
      size="lg"
      footer={footerAction}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-caption font-semibold ${getStatusBadge(
              bill.status,
            )}`}
          >
            {bill.status}
          </span>
        </div>

        {error && (
          <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-caption text-danger">
            {error}
          </div>
        )}

        <div className="rounded-card border border-border bg-surface-sunken/40 p-4">
          <div className="flex items-center gap-2 text-small text-text-muted">
            <Building2 className="h-4 w-4 text-accent" />
            <span>Vendor / Supplier:</span>
            <span className="font-semibold text-text">{bill.vendorName}</span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-caption text-text-muted">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-text-muted" />
              <span>Date: {bill.billDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-text-muted" />
              <span>Due: {bill.dueDate || '—'}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-th">Line Items</h3>
          <div className="overflow-hidden card-workspace">
            <table className="w-full text-left">
              <thead className="bg-surface-sunken/60 font-semibold border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-th">Account</th>
                  <th className="px-3 py-2 text-th">Description</th>
                  <th className="px-3 py-2 text-right text-th">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-body">
                {bill.lines.map((line, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 font-mono text-caption text-text-muted">
                      {line.accountCode}
                    </td>
                    <td className="px-3 py-2 text-text">{line.description}</td>
                    <td className="px-3 py-2 text-right font-medium text-text tabular-nums">
                      {formatMoney(BigInt(line.amountPaisa))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-card border border-border bg-surface-sunken/50 p-4 space-y-2 text-small">
          <div className="flex justify-between text-text-muted">
            <span>Gross Subtotal</span>
            <span className="font-medium text-text tabular-nums">
              {formatMoney(BigInt(bill.subtotalPaisa))}
            </span>
          </div>
          {BigInt(bill.taxWithholdingPaisa) > 0n && (
            <div className="flex justify-between text-text-muted">
              <span>(-) TDS (Tax Withholding)</span>
              <span className="text-danger tabular-nums">
                -{formatMoney(BigInt(bill.taxWithholdingPaisa))}
              </span>
            </div>
          )}
          {BigInt(bill.vatWithholdingPaisa) > 0n && (
            <div className="flex justify-between text-text-muted">
              <span>(-) VDS (VAT Withholding)</span>
              <span className="text-danger tabular-nums">
                -{formatMoney(BigInt(bill.vatWithholdingPaisa))}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 text-body font-semibold">
            <span className="text-text">Net Payable to Vendor</span>
            <span className="text-primary tabular-nums">
              {formatMoney(BigInt(bill.netPayablePaisa))}
            </span>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
