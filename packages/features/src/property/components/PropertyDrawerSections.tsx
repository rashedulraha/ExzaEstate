import { StatusBadge, Button } from '@exzaestate/ui';
import { formatMoney, formatArea, formatDate } from '@exzaestate/shared';
import {
  Clock,
  Layers,
  Compass,
  Building,
  UserCheck,
  ShieldAlert,
  Lock,
  Unlock,
} from 'lucide-react';
import type { PropertyItem } from '../hooks/usePropertyList.js';

export interface StatusHistoryRecord {
  id: string;
  propertyId: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  changedById: string | null;
  createdAt: string;
}

interface DrawerQuickActionsProps {
  property: PropertyItem;
  canOverride: boolean;
  canEdit: boolean;
  onOverrideStatus?: (property: PropertyItem) => void;
  onHold?: (property: PropertyItem) => void;
  onReleaseHold?: (property: PropertyItem) => void;
  onBlock?: (property: PropertyItem) => void;
  onUnblock?: (property: PropertyItem) => void;
}

interface DrawerLifecycleButtonsProps {
  property: PropertyItem;
  canEdit: boolean;
  onHold?: (property: PropertyItem) => void;
  onReleaseHold?: (property: PropertyItem) => void;
  onBlock?: (property: PropertyItem) => void;
  onUnblock?: (property: PropertyItem) => void;
}

function DrawerLifecycleButtons({
  property,
  canEdit,
  onHold,
  onReleaseHold,
  onBlock,
  onUnblock,
}: DrawerLifecycleButtonsProps) {
  if (!canEdit) return null;
  const statusUpper = property.status.toUpperCase();

  if (statusUpper === 'AVAILABLE') {
    return (
      <>
        {onHold && (
          <Button variant="secondary" size="sm" onClick={() => onHold(property)}>
            <Clock className="w-3.5 h-3.5 mr-1" />
            Hold
          </Button>
        )}
        {onBlock && (
          <Button variant="secondary" size="sm" onClick={() => onBlock(property)}>
            <Lock className="w-3.5 h-3.5 mr-1" />
            Block
          </Button>
        )}
      </>
    );
  }

  if (statusUpper === 'HOLD' && onReleaseHold) {
    return (
      <Button variant="secondary" size="sm" onClick={() => onReleaseHold(property)}>
        Release Hold
      </Button>
    );
  }

  if (statusUpper === 'BLOCKED' && onUnblock) {
    return (
      <Button variant="secondary" size="sm" onClick={() => onUnblock(property)}>
        <Unlock className="w-3.5 h-3.5 mr-1" />
        Unblock
      </Button>
    );
  }

  return null;
}

export function DrawerQuickActions({
  property,
  canOverride,
  canEdit,
  onOverrideStatus,
  onHold,
  onReleaseHold,
  onBlock,
  onUnblock,
}: DrawerQuickActionsProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-surface-sunken/40 rounded-card border border-border">
      <div className="flex items-center gap-2">
        <span className="text-caption text-text-muted font-medium uppercase">Current Status:</span>
        <StatusBadge domain="property" value={property.status} />
      </div>

      <div className="flex items-center gap-1.5">
        {canOverride && onOverrideStatus && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOverrideStatus(property)}
            className="text-warning text-caption"
          >
            <ShieldAlert className="w-3.5 h-3.5 mr-1" />
            Override
          </Button>
        )}
        <DrawerLifecycleButtons
          property={property}
          canEdit={canEdit}
          onHold={onHold}
          onReleaseHold={onReleaseHold}
          onBlock={onBlock}
          onUnblock={onUnblock}
        />
      </div>
    </div>
  );
}

export function DrawerPricingCard({ property }: { property: PropertyItem }) {
  const discountText = property.discountLimitPct ? `${property.discountLimitPct}%` : '0%';

  return (
    <div className="p-4 bg-surface rounded-card border border-border space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="text-th">Pricing Breakdown</span>
        <span className="text-caption text-text-muted">BDT (Paisa Canonical)</span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-small">
        <div>
          <p className="text-text-muted">Base Price</p>
          <p className="text-body font-medium text-text tabular-nums">
            {formatMoney(property.basePricePaisa)}
          </p>
        </div>
        <div>
          <p className="text-text-muted">Premium Price</p>
          <p className="text-body font-medium text-text tabular-nums">
            {formatMoney(property.premiumPaisa)}
          </p>
        </div>
        <div>
          <p className="text-text-muted">Discount Limit</p>
          <p className="text-body font-medium text-text tabular-nums">{discountText}</p>
        </div>
        <div>
          <p className="text-text-muted">Owner Type</p>
          <p className="text-body font-medium text-text uppercase">{property.ownerType}</p>
        </div>
      </div>

      <div className="pt-2 border-t border-border flex items-center justify-between">
        <span className="text-body font-semibold text-text">Net Price</span>
        <span className="text-h2 font-semibold text-primary tabular-nums">
          {formatMoney(property.netPricePaisa)}
        </span>
      </div>
    </div>
  );
}

export function DrawerSpecificationsCard({ property }: { property: PropertyItem }) {
  const facingText = property.facing ? property.facing.replace('_', ' ') : '—';
  const blockText = property.block ? property.block.name : '—';
  const floorText = property.floor ? property.floor.name : '—';

  return (
    <div className="p-4 bg-surface rounded-card border border-border space-y-3">
      <span className="text-th">Specifications</span>

      <div className="grid grid-cols-2 gap-y-3 text-small">
        <div className="flex items-center gap-2 text-text-2">
          <Layers className="w-4 h-4 text-text-muted" />
          <span>
            Area:{' '}
            <strong className="text-text font-medium">
              {formatArea(property.areaSqft, 'sqft')} ({formatArea(property.areaSqft, 'katha')})
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2 text-text-2">
          <Compass className="w-4 h-4 text-text-muted" />
          <span>
            Facing: <strong className="text-text font-medium">{facingText}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 text-text-2">
          <Building className="w-4 h-4 text-text-muted" />
          <span>
            Block: <strong className="text-text font-medium">{blockText}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 text-text-2">
          <UserCheck className="w-4 h-4 text-text-muted" />
          <span>
            Floor: <strong className="text-text font-medium">{floorText}</strong>
          </span>
        </div>
      </div>

      {property.description && (
        <div className="pt-2 border-t border-border">
          <p className="text-caption text-text-muted">Description</p>
          <p className="text-small text-text mt-0.5">{property.description}</p>
        </div>
      )}

      {property.blockReason && (
        <div className="p-2.5 bg-danger/12 border border-danger/30 rounded-button">
          <p className="text-caption font-semibold text-danger">Blocking Reason</p>
          <p className="text-small text-text mt-0.5">{property.blockReason}</p>
        </div>
      )}
    </div>
  );
}

export function DrawerStatusHistoryCard({
  historyItems,
  isLoading,
}: {
  historyItems: StatusHistoryRecord[];
  isLoading: boolean;
}) {
  return (
    <div className="p-4 bg-surface rounded-card border border-border space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="text-th">Status Audit History</span>
        {isLoading && <span className="text-caption text-text-muted">Loading history...</span>}
      </div>

      {historyItems.length === 0 && !isLoading && (
        <p className="text-caption text-text-muted py-2">No previous transitions recorded.</p>
      )}

      <div className="space-y-3">
        {historyItems.map((item) => (
          <div
            key={item.id}
            className="relative pl-4 border-l-2 border-border text-small space-y-0.5"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text">
                {item.fromStatus ? `${item.fromStatus} → ${item.toStatus}` : item.toStatus}
              </span>
              <span className="text-caption text-text-muted">
                {formatDate(item.createdAt, 'Asia/Dhaka', 'dd MMM yyyy, hh:mm a')}
              </span>
            </div>
            {item.reason && <p className="text-caption text-text-muted italic">"{item.reason}"</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
