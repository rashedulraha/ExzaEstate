import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button, ErrorState } from '@exzaestate/ui';
import { PERMISSIONS } from '@exzaestate/shared';
import { usePermission } from '@exzaestate/app-core';
import {
  usePropertyControllerGetPropertyById,
  usePropertyControllerGetStatusHistory,
} from '@exzaestate/api-client';
import { ArrowLeft } from 'lucide-react';
import type { PropertyItem } from '../hooks/usePropertyList.js';
import { usePropertyActions } from '../hooks/usePropertyActions.js';
import { PropertyFormModal } from '../components/PropertyFormModal.js';
import { PropertyStatusOverrideModal } from '../components/PropertyStatusOverrideModal.js';
import {
  PropertyDetailHeader,
  PropertySummaryStrip,
  type StatusHistoryRecord,
} from './PropertyDetailComponents.js';
import { PropertyDetailTabs } from './PropertyDetailTabs.js';

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { hasPermission: canEdit } = usePermission(PERMISSIONS.PROPERTY_EDIT);
  const { hasPermission: canOverride } = usePermission(PERMISSIONS.PROPERTY_OVERRIDE_STATUS);
  const { hasPermission: canDelete } = usePermission(PERMISSIONS.PROPERTY_DELETE);

  const { deleteProperty, isDeleting } = usePropertyActions();

  const [activeTab, setActiveTab] = useState<'overview' | 'pricing' | 'history'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  const propertyId = id || '';
  const propertyQuery = usePropertyControllerGetPropertyById<PropertyItem>(propertyId, {
    query: { enabled: Boolean(propertyId) },
  });

  const historyQuery = usePropertyControllerGetStatusHistory<StatusHistoryRecord[]>(propertyId, {
    query: { enabled: Boolean(propertyId) },
  });

  const property = propertyQuery.data as unknown as PropertyItem | undefined;
  const historyItems = (historyQuery.data as unknown as StatusHistoryRecord[]) || [];

  if (propertyQuery.isLoading) {
    return (
      <div className="container-page space-y-6">
        <div className="h-6 w-48 bg-surface-sunken rounded-button animate-skeleton-breathe" />
        <div className="h-24 bg-surface rounded-card border border-border animate-skeleton-breathe" />
        <div className="h-80 bg-surface rounded-card border border-border animate-skeleton-breathe" />
      </div>
    );
  }

  if (propertyQuery.isError || !property) {
    return (
      <div className="p-8">
        <ErrorState
          title="Property unit not found"
          message="The requested property record could not be loaded or may have been deleted."
          onRetry={() => propertyQuery.refetch()}
        />
        <div className="mt-4 text-center">
          <Button variant="secondary" onClick={() => navigate('/properties')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Property Inventory
          </Button>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to soft delete property ${property.code}?`,
    );
    if (!confirmed) return;
    try {
      await deleteProperty(property.id);
      navigate('/properties');
    } catch {
      // Handled by toast
    }
  };

  return (
    <div className="container-page space-y-6">
      <PropertyDetailHeader
        property={property}
        canOverride={Boolean(canOverride)}
        canEdit={Boolean(canEdit)}
        canDelete={Boolean(canDelete)}
        isDeleting={isDeleting}
        onNavigateBack={() => navigate('/properties')}
        onOpenOverride={() => setIsOverrideModalOpen(true)}
        onOpenEdit={() => setIsEditModalOpen(true)}
        onDelete={handleDelete}
      />

      <PropertySummaryStrip property={property} />

      <PropertyDetailTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        property={property}
        historyItems={historyItems}
      />

      <PropertyFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        property={property}
      />

      <PropertyStatusOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        property={property}
      />
    </div>
  );
}
