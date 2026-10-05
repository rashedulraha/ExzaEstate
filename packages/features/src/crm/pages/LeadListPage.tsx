import { useState, type ReactElement } from 'react';
import { Breadcrumbs, Button } from '@exzaestate/ui';
import { PermissionGate } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { Plus, Table as TableIcon, Kanban as KanbanIcon } from 'lucide-react';
import { useLeadList, type LeadItem } from '../hooks/useLeadList.js';
import { useLeadActions } from '../hooks/useLeadActions.js';
import { useFollowUpActions } from '../hooks/useFollowUpList.js';
import { LeadDrawer } from '../components/LeadDrawer.js';
import { LeadFormModal } from '../components/LeadFormModal.js';
import { LeadConvertModal } from '../components/LeadConvertModal.js';
import { FollowUpModal } from '../components/FollowUpModal.js';
import { LeadKpiStrip, LeadListFilters, LeadListContent } from './LeadListComponents.js';

type ViewMode = 'table' | 'kanban';

export function LeadListPage(): ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [convertingLead, setConvertingLead] = useState<LeadItem | null>(null);
  const [followUpLead, setFollowUpLead] = useState<LeadItem | null>(null);

  const { leads, total, kpis, filters, setFilters, isLoading, isError, error, refetch } =
    useLeadList();

  const { createLead, changeStatus, convertLead, isCreating, isConverting } = useLeadActions();
  const { createFollowUp, isCreating: isScheduling } = useFollowUpActions();

  const handleRowClick = (lead: LeadItem) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  return (
    <div className="container-page space-y-6">
      {/* Tier 1: Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs items={[{ label: 'Overview', href: '/' }, { label: 'CRM & Sales Leads' }]} />
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-h1 font-semibold text-text">Lead Pipeline</h1>
            <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
              {total} Prospects
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface-sunken p-0.5 rounded-button border border-border">
            <button
              type="button"
              aria-label="Table View"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-btn rounded-button cursor-pointer transition-colors ${
                viewMode === 'table'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span className="hidden md:inline">Table</span>
            </button>
            <button
              type="button"
              aria-label="Kanban Board View"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-btn rounded-button cursor-pointer transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <KanbanIcon className="w-4 h-4" />
              <span className="hidden md:inline">Pipeline</span>
            </button>
          </div>

          <PermissionGate permission={PERMISSIONS.LEAD_CREATE}>
            <Button variant="primary" className="gap-2" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4" />
              <span>Add Lead</span>
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Tier 2: KPI Summary Strip */}
      <LeadKpiStrip kpis={kpis} />

      {/* Tier 3: Filters Row */}
      <LeadListFilters filters={filters} onFilterChange={setFilters} />

      {/* Main Content Area */}
      <LeadListContent
        leads={leads}
        viewMode={viewMode}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        onSelectLead={handleRowClick}
        onConvertLead={(lead) => setConvertingLead(lead)}
        onAddFollowUp={(lead) => setFollowUpLead(lead)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      {/* Inspection Drawer */}
      <LeadDrawer
        lead={selectedLead}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onConvert={(lead) => setConvertingLead(lead)}
        onAddFollowUp={(lead) => setFollowUpLead(lead)}
        onStatusChange={(id, status) => {
          void changeStatus(id, status);
          if (selectedLead && selectedLead.id === id) {
            setSelectedLead({ ...selectedLead, status });
          }
        }}
      />

      {/* Modals */}
      <LeadFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={async (data) => {
          await createLead(data);
        }}
        isLoading={isCreating}
      />

      <LeadConvertModal
        lead={convertingLead}
        isOpen={!!convertingLead}
        onClose={() => setConvertingLead(null)}
        onConvert={async (data) => {
          await convertLead(data);
        }}
        isLoading={isConverting}
      />

      <FollowUpModal
        lead={followUpLead}
        isOpen={!!followUpLead}
        onClose={() => setFollowUpLead(null)}
        onSubmit={async (data) => {
          await createFollowUp(data);
        }}
        isLoading={isScheduling}
      />
    </div>
  );
}
