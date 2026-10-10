import {
  Building,
  UserCheck,
  Layers,
  Compass,
  Clock,
  ArrowLeft,
  ShieldAlert,
  Edit,
  Trash2,
} from 'lucide-react';
import { Breadcrumbs, Button, StatusBadge } from '@exzaestate/ui';
import { formatMoney, formatArea, formatDate } from '@exzaestate/shared';
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

interface PropertyDetailHeaderProps {
  property: PropertyItem;
  canOverride: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  onNavigateBack: () => void;
  onOpenOverride: () => void;
  onOpenEdit: () => void;
  onDelete: () => void;
}

export function PropertyDetailHeader({
  property,
  canOverride,
  canEdit,
  canDelete,
  isDeleting,
  onNavigateBack,
  onOpenOverride,
  onOpenEdit,
  onDelete,
}: PropertyDetailHeaderProps) {
  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Overview', href: '/' },
          { label: 'Property Inventory', href: '/properties' },
          { label: property.code },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onNavigateBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <h1 className="text-h1 font-semibold text-text">{property.code}</h1>
          <StatusBadge domain="property" value={property.status} />
        </div>

        <div className="flex items-center gap-2">
          {canOverride && (
            <Button variant="secondary" size="md" onClick={onOpenOverride}>
              <ShieldAlert className="w-4 h-4 mr-1 text-warning" />
              Override Status
            </Button>
          )}
          {canEdit && (
            <Button variant="secondary" size="md" onClick={onOpenEdit}>
              <Edit className="w-4 h-4 mr-1" />
              Edit Unit
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" size="md" onClick={onDelete} isLoading={isDeleting}>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PropertySummaryStrip({ property }: { property: PropertyItem }) {
  const blockName = property.block ? property.block.name : '';
  const floorName = property.floor ? property.floor.name : '';
  let locationText = '—';
  if (blockName && floorName) locationText = `${blockName} · ${floorName}`;
  else if (blockName) locationText = blockName;
  else if (floorName) locationText = floorName;

  return (
    <div className="card-surface grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div>
        <p className="text-th">Net Price</p>
        <p className="text-h2 font-semibold text-primary tabular-nums mt-1">
          {formatMoney(property.netPricePaisa)}
        </p>
      </div>
      <div>
        <p className="text-th">Total Area</p>
        <p className="text-body font-semibold text-text mt-1">
          {formatArea(property.areaSqft, 'sqft')}
        </p>
        <p className="text-caption text-text-muted">≈ {formatArea(property.areaSqft, 'katha')}</p>
      </div>
      <div>
        <p className="text-th">Block & Floor</p>
        <p className="text-body font-semibold text-text mt-1">{locationText}</p>
      </div>
      <div>
        <p className="text-th">Unit Type</p>
        <p className="text-body font-semibold text-text uppercase mt-1">
          {property.type} ({property.ownerType})
        </p>
      </div>
    </div>
  );
}

export function PropertyOverviewTab({ property }: { property: PropertyItem }) {
  const blockName = property.block ? property.block.name : 'Not assigned';
  const floorName = property.floor ? property.floor.name : 'Not assigned';
  const facingText = property.facing ? property.facing.replace('_', ' ') : '—';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-th border-b border-border pb-1">Hierarchy & Location</h3>
          <div className="space-y-2 text-small">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-text-muted" />
              <span className="text-text-muted">Block / Zone:</span>
              <strong className="text-text font-medium">{blockName}</strong>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-text-muted" />
              <span className="text-text-muted">Floor / Road:</span>
              <strong className="text-text font-medium">{floorName}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-text-muted" />
              <span className="text-text-muted">Project ID:</span>
              <span className="font-mono text-caption text-text-2">{property.projectId}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-th border-b border-border pb-1">Dimensions & Facing</h3>
          <div className="space-y-2 text-small">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-text-muted" />
              <span className="text-text-muted">Gross Area:</span>
              <strong className="text-text font-medium">{property.areaSqft} sq ft</strong>
            </div>
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-text-muted" />
              <span className="text-text-muted">Facing Direction:</span>
              <strong className="text-text font-medium">{facingText}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-text-muted" />
              <span className="text-text-muted">Registered Date:</span>
              <span className="text-text">
                {formatDate(property.createdAt, 'Asia/Dhaka', 'dd MMM yyyy')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {property.description && (
        <div className="space-y-2 pt-4 border-t border-border">
          <h3 className="text-th">Boundary & Description</h3>
          <p className="text-body text-text bg-surface-sunken/30 p-4 rounded-card border border-border">
            {property.description}
          </p>
        </div>
      )}
    </div>
  );
}

export function PropertyPricingTab({ property }: { property: PropertyItem }) {
  const discountText = property.discountLimitPct ? `${property.discountLimitPct}%` : '0%';

  return (
    <div className="space-y-6 max-w-xl">
      <div className="space-y-3">
        <div className="flex justify-between py-2 border-b border-border text-body">
          <span className="text-text-muted">Base Price</span>
          <span className="font-medium text-text tabular-nums">
            {formatMoney(property.basePricePaisa)}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b border-border text-body">
          <span className="text-text-muted">Premium Price</span>
          <span className="font-medium text-text tabular-nums">
            {formatMoney(property.premiumPaisa)}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b border-border text-body">
          <span className="text-text-muted">Max Allowed Discount</span>
          <span className="font-medium text-text tabular-nums">{discountText}</span>
        </div>
        <div className="flex justify-between py-3 border-t-2 border-border text-h2 font-semibold">
          <span className="text-text">Net Price</span>
          <span className="text-primary tabular-nums">{formatMoney(property.netPricePaisa)}</span>
        </div>
      </div>
    </div>
  );
}

export function PropertyHistoryTab({ historyItems }: { historyItems: StatusHistoryRecord[] }) {
  if (historyItems.length === 0) {
    return <p className="text-caption text-text-muted">No status transitions recorded.</p>;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {historyItems.map((item) => (
        <div key={item.id} className="p-4 bg-surface rounded-card border border-border space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-text">
              {item.fromStatus ? `${item.fromStatus} → ${item.toStatus}` : item.toStatus}
            </span>
            <span className="text-caption text-text-muted">
              {formatDate(item.createdAt, 'Asia/Dhaka', 'dd MMM yyyy, hh:mm a')}
            </span>
          </div>
          {item.reason && <p className="text-small text-text-muted italic">"{item.reason}"</p>}
          {item.changedById && (
            <p className="text-caption text-text-disabled">Actor: {item.changedById}</p>
          )}
        </div>
      ))}
    </div>
  );
}
