import { Users, Phone, DollarSign, PlusCircle } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';
import { Button, IconButton } from '@exzaestate/ui';
import type { BrokerItem } from '../../schemas/operations.schema.js';

export interface BrokerDataTableProps {
  brokers: BrokerItem[];
  isLoading?: boolean;
  onSelectBroker?: (broker: BrokerItem) => void;
  onPayCommission?: (broker: BrokerItem) => void;
  onCreateRule?: (broker: BrokerItem) => void;
}

function BrokerContactCell({ phone, email }: { phone: string; email?: string | null }) {
  return (
    <div className="space-y-0.5 text-caption">
      <div className="flex items-center gap-1.5 text-text">
        <Phone className="h-3 w-3 text-text-muted" />
        {phone}
      </div>
      {email && <div className="text-text-muted">{email}</div>}
    </div>
  );
}

function BrokerTaxCell({ nid, tin }: { nid?: string | null; tin?: string | null }) {
  if (!nid && !tin) return <span className="text-text-disabled text-caption">—</span>;
  return (
    <div className="space-y-0.5 text-caption text-text-muted">
      {nid && <div>NID: {nid}</div>}
      {tin && <div>TIN: {tin}</div>}
    </div>
  );
}

function BrokerTableRow({
  broker,
  onSelect,
  onPay,
  onCreateRule,
}: {
  broker: BrokerItem;
  onSelect?: (broker: BrokerItem) => void;
  onPay?: (broker: BrokerItem) => void;
  onCreateRule?: (broker: BrokerItem) => void;
}) {
  const outstandingPaisa = BigInt(broker.outstandingCommissionPaisa ?? '0');
  const earnedPaisa = BigInt(broker.totalCommissionEarnedPaisa ?? '0');

  return (
    <tr className="transition-colors hover:bg-surface-sunken/40">
      <td className="px-4 py-3 text-body font-semibold text-text">{broker.name}</td>
      <td className="px-4 py-3">
        <BrokerContactCell phone={broker.phone} email={broker.email} />
      </td>
      <td className="px-4 py-3">
        <BrokerTaxCell nid={broker.nid} tin={broker.tin} />
      </td>
      <td className="px-4 py-3 text-right text-body font-medium text-text tabular-nums">
        {formatMoney(earnedPaisa)}
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={`text-body font-semibold tabular-nums ${
            outstandingPaisa > 0n ? 'text-primary' : 'text-text-muted'
          }`}
        >
          {formatMoney(outstandingPaisa)}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-semibold ${
            broker.isActive
              ? 'border border-success/30 bg-success/10 text-success'
              : 'border border-border bg-surface-sunken text-text-muted'
          }`}
        >
          {broker.isActive ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {onCreateRule && (
            <IconButton
              variant="ghost"
              size="sm"
              icon={<PlusCircle className="h-4 w-4" />}
              aria-label="Add Commission Rule"
              title="Add Commission Rule"
              onClick={() => onCreateRule(broker)}
            />
          )}
          {onPay && outstandingPaisa > 0n && (
            <IconButton
              variant="ghost"
              size="sm"
              icon={<DollarSign className="h-4 w-4 text-success" />}
              aria-label="Disburse Commission"
              title="Disburse Commission"
              onClick={() => onPay(broker)}
            />
          )}
          {onSelect && (
            <Button variant="ghost" size="sm" onClick={() => onSelect(broker)}>
              View
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function BrokerDataTable({
  brokers,
  isLoading,
  onSelectBroker,
  onPayCommission,
  onCreateRule,
}: BrokerDataTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-card border border-border bg-surface-sunken/40">
        <p className="text-body text-text-muted">Loading brokers...</p>
      </div>
    );
  }

  if (brokers.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface-sunken/30 p-6 text-center">
        <Users className="mb-2 h-8 w-8 text-text-muted" />
        <p className="text-body font-medium text-text">No brokers registered</p>
        <p className="mt-1 text-caption text-text-muted">
          Register external agents or brokers to manage commission agreements.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto card-workspace">
      <table className="w-full text-left">
        <thead className="border-b border-border bg-surface-sunken/60">
          <tr>
            <th className="px-4 py-3 text-th">Broker / Agent</th>
            <th className="px-4 py-3 text-th">Phone & Email</th>
            <th className="px-4 py-3 text-th">NID / TIN</th>
            <th className="px-4 py-3 text-right text-th">Total Earned</th>
            <th className="px-4 py-3 text-right text-th">Outstanding</th>
            <th className="px-4 py-3 text-center text-th">Status</th>
            <th className="px-4 py-3 text-right text-th">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-body">
          {brokers.map((broker) => (
            <BrokerTableRow
              key={broker.id}
              broker={broker}
              onSelect={onSelectBroker}
              onPay={onPayCommission}
              onCreateRule={onCreateRule}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
