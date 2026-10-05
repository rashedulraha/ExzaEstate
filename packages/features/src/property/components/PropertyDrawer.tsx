import { Drawer, Button } from '@exzaestate/ui';
import { PERMISSIONS } from '@exzaestate/shared';
import { usePermission } from '@exzaestate/app-core';
import { usePropertyControllerGetStatusHistory } from '@exzaestate/api-client';
import { ExternalLink, Edit } from 'lucide-react';
import type { PropertyItem } from '../hooks/usePropertyList.js';
import {
  DrawerQuickActions,
  DrawerPricingCard,
  DrawerSpecificationsCard,
  DrawerStatusHistoryCard,
  type StatusHistoryRecord,
} from './PropertyDrawerSections.js';

export interface PropertyDrawerProps {
  property: PropertyItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (property: PropertyItem) => void;
  onOverrideStatus?: (property: PropertyItem) => void;
  onHold?: (property: PropertyItem) => void;
  onReleaseHold?: (property: PropertyItem) => void;
  onBlock?: (property: PropertyItem) => void;
  onUnblock?: (property: PropertyItem) => void;
  onViewDetails?: (property: PropertyItem) => void;
}

export function PropertyDrawer({
  property,
  isOpen,
  onClose,
  onEdit,
  onOverrideStatus,
  onHold,
  onReleaseHold,
  onBlock,
  onUnblock,
  onViewDetails,
}: PropertyDrawerProps) {
  const { hasPermission: canEdit } = usePermission(PERMISSIONS.PROPERTY_EDIT);
  const { hasPermission: canOverride } = usePermission(PERMISSIONS.PROPERTY_OVERRIDE_STATUS);

  const propertyId = property ? property.id : '';
  const historyQuery = usePropertyControllerGetStatusHistory<StatusHistoryRecord[]>(propertyId, {
    query: {
      enabled: isOpen && Boolean(propertyId),
    },
  });

  if (!property) return null;

  const historyItems: StatusHistoryRecord[] =
    (historyQuery.data as unknown as StatusHistoryRecord[]) || [];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={property.code}
      subtitle={property.title || `${property.type} Unit`}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {onViewDetails && (
              <Button variant="secondary" size="sm" onClick={() => onViewDetails(property)}>
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Full Page
              </Button>
            )}
            {canEdit && onEdit && (
              <Button variant="secondary" size="sm" onClick={() => onEdit(property)}>
                <Edit className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <DrawerQuickActions
          property={property}
          canOverride={canOverride}
          canEdit={canEdit}
          onOverrideStatus={onOverrideStatus}
          onHold={onHold}
          onReleaseHold={onReleaseHold}
          onBlock={onBlock}
          onUnblock={onUnblock}
        />

        <DrawerPricingCard property={property} />

        <DrawerSpecificationsCard property={property} />

        <DrawerStatusHistoryCard historyItems={historyItems} isLoading={historyQuery.isLoading} />
      </div>
    </Drawer>
  );
}
