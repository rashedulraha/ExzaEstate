import { useMemo } from 'react';
import { Eye, Edit3, ShieldAlert } from 'lucide-react';
import { DataTable, type ColumnDef, StatusBadge, IconButton } from '@exzaestate/ui';
import { formatMoney, formatArea, PERMISSIONS } from '@exzaestate/shared';
import { usePermission } from '@exzaestate/app-core';
import type { PropertyItem } from '../hooks/usePropertyList.js';

export interface PropertyDataTableProps {
  properties: PropertyItem[];
  isLoading: boolean;
  onSelectProperty: (property: PropertyItem) => void;
  onEditProperty?: (property: PropertyItem) => void;
  onOverrideStatus?: (property: PropertyItem) => void;
  selectedPropertyId?: string;
  emptyState?: React.ReactNode;
}

export function PropertyDataTable({
  properties,
  isLoading,
  onSelectProperty,
  onEditProperty,
  onOverrideStatus,
  selectedPropertyId,
  emptyState,
}: PropertyDataTableProps) {
  const { hasPermission: canEdit } = usePermission(PERMISSIONS.PROPERTY_EDIT);
  const { hasPermission: canOverride } = usePermission(PERMISSIONS.PROPERTY_OVERRIDE_STATUS);

  const columns: ColumnDef<PropertyItem>[] = useMemo(
    () => [
      {
        key: 'code',
        header: 'Unit Code',
        sortable: true,
        render: (row) => (
          <div className="flex flex-col">
            <span className="text-body font-semibold text-text hover:text-primary cursor-pointer transition-colors">
              {row.code}
            </span>
            {row.title && (
              <span className="text-caption text-text-muted truncate max-w-xs">{row.title}</span>
            )}
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        sortable: true,
        render: (row) => (
          <span className="text-caption font-medium uppercase px-2 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
            {row.type}
          </span>
        ),
      },
      {
        key: 'hierarchy',
        header: 'Block / Floor',
        render: (row) => {
          const blockName = row.block?.name;
          const floorName = row.floor?.name;
          if (!blockName && !floorName) {
            return <span className="text-text-disabled text-caption">—</span>;
          }
          return (
            <span className="text-small text-text-2">
              {blockName ?? ''}
              {blockName && floorName ? ' · ' : ''}
              {floorName ?? ''}
            </span>
          );
        },
      },
      {
        key: 'area',
        header: 'Size & Area',
        sortable: true,
        render: (row) => {
          const sqftStr = formatArea(row.areaSqft, 'sqft');
          const kathaStr = formatArea(row.areaSqft, 'katha');
          return (
            <div className="flex flex-col">
              <span className="text-small font-medium text-text">{sqftStr}</span>
              <span className="text-caption text-text-muted">({kathaStr})</span>
            </div>
          );
        },
      },
      {
        key: 'facing',
        header: 'Facing',
        render: (row) => (
          <span className="text-small text-text-2">
            {row.facing ? row.facing.replace('_', ' ') : '—'}
          </span>
        ),
      },
      {
        key: 'netPricePaisa',
        header: 'Net Price',
        isMoney: true,
        align: 'right',
        sortable: true,
        render: (row) => (
          <div className="flex flex-col items-end">
            <span className="text-body font-semibold text-text tabular-nums">
              {formatMoney(row.netPricePaisa)}
            </span>
            {row.premiumPaisa && row.premiumPaisa !== '0' && (
              <span className="text-caption text-text-muted">
                +{formatMoney(row.premiumPaisa)} prem.
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => <StatusBadge domain="property" value={row.status} />,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <IconButton
              variant="ghost"
              size="sm"
              icon={<Eye className="w-3.5 h-3.5 text-text-muted hover:text-text" />}
              aria-label={`Inspect unit ${row.code}`}
              onClick={() => onSelectProperty(row)}
            />
            {canEdit && onEditProperty && (
              <IconButton
                variant="ghost"
                size="sm"
                icon={<Edit3 className="w-3.5 h-3.5 text-text-muted hover:text-text" />}
                aria-label={`Edit unit ${row.code}`}
                onClick={() => onEditProperty(row)}
              />
            )}
            {canOverride && onOverrideStatus && (
              <IconButton
                variant="ghost"
                size="sm"
                icon={<ShieldAlert className="w-3.5 h-3.5 text-warning hover:text-warning" />}
                aria-label={`Override status for ${row.code}`}
                onClick={() => onOverrideStatus(row)}
              />
            )}
          </div>
        ),
      },
    ],
    [canEdit, canOverride, onSelectProperty, onEditProperty, onOverrideStatus],
  );

  return (
    <DataTable<PropertyItem>
      columns={columns}
      data={properties}
      keyExtractor={(item) => item.id}
      isLoading={isLoading}
      onRowClick={onSelectProperty}
      emptyState={emptyState}
      selectedIds={selectedPropertyId ? new Set([selectedPropertyId]) : undefined}
      className="border-none shadow-none"
    />
  );
}
