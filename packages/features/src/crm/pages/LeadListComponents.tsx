import type { ReactElement } from 'react';
import { Input, Select, LoadingState, ErrorState, EmptyState } from '@exzaestate/ui';
import { Search, Users, Target, UserCheck, CheckCircle2, XCircle } from 'lucide-react';
import type { LeadItem, LeadFilters, LeadKpis } from '../hooks/useLeadList.js';
import { LeadDataTable } from '../components/LeadDataTable.js';
import { LeadKanbanBoard } from '../components/LeadKanbanBoard.js';
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  type LeadStatusEnum,
  type CreateLeadInput,
} from '../schemas/crm.schema.js';

export function LeadKpiStrip({ kpis }: { kpis: LeadKpis }): ReactElement {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <div className="card-stat flex items-center gap-3">
        <div className="p-2 rounded-button bg-primary/12 text-primary">
          <Users className="w-4 h-4" />
        </div>
        <div>
          <span className="text-caption text-text-muted block">Total Leads</span>
          <span className="text-hero-num font-bold text-text">{kpis.totalLeads}</span>
        </div>
      </div>
      <div className="card-stat flex items-center gap-3">
        <div className="p-2 rounded-button bg-info/12 text-info">
          <Target className="w-4 h-4" />
        </div>
        <div>
          <span className="text-caption text-text-muted block">New Inquiries</span>
          <span className="text-hero-num font-bold text-text">{kpis.newLeads}</span>
        </div>
      </div>
      <div className="card-stat flex items-center gap-3">
        <div className="p-2 rounded-button bg-warning/12 text-warning">
          <UserCheck className="w-4 h-4" />
        </div>
        <div>
          <span className="text-caption text-text-muted block">In Negotiation</span>
          <span className="text-hero-num font-bold text-text">{kpis.inNegotiation}</span>
        </div>
      </div>
      <div className="card-stat flex items-center gap-3">
        <div className="p-2 rounded-button bg-success/12 text-success">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div>
          <span className="text-caption text-text-muted block">Converted</span>
          <span className="text-hero-num font-bold text-text">{kpis.converted}</span>
        </div>
      </div>
      <div className="card-stat flex items-center gap-3">
        <div className="p-2 rounded-button bg-surface-sunken text-text-muted">
          <XCircle className="w-4 h-4" />
        </div>
        <div>
          <span className="text-caption text-text-muted block">Lost</span>
          <span className="text-hero-num font-bold text-text">{kpis.lost}</span>
        </div>
      </div>
    </div>
  );
}

export function LeadListFilters({
  filters,
  onFilterChange,
}: {
  filters: LeadFilters;
  onFilterChange: (filters: LeadFilters) => void;
}): ReactElement {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-surface rounded-card border border-border">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input
            id="search-leads"
            value={filters.search ?? ''}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            placeholder="Search by prospect name, phone, or email..."
            className="pl-9 h-9"
          />
        </div>
        <div className="w-40">
          <Select
            id="filter-lead-status"
            value={filters.status ?? ''}
            onChange={(val) => onFilterChange({ ...filters, status: val as LeadStatusEnum | '' })}
            options={[
              { label: 'All Stages', value: '' },
              ...LEAD_STATUSES.map((s) => ({ label: s, value: s })),
            ]}
          />
        </div>
        <div className="w-40">
          <Select
            id="filter-lead-source"
            value={filters.source ?? ''}
            onChange={(val) =>
              onFilterChange({ ...filters, source: val as CreateLeadInput['source'] | '' })
            }
            options={[
              { label: 'All Sources', value: '' },
              ...LEAD_SOURCES.map((s) => ({ label: s, value: s })),
            ]}
          />
        </div>
      </div>
    </div>
  );
}

interface LeadListContentProps {
  leads: LeadItem[];
  viewMode: 'table' | 'kanban';
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onSelectLead: (lead: LeadItem) => void;
  onConvertLead: (lead: LeadItem) => void;
  onAddFollowUp: (lead: LeadItem) => void;
  onOpenAddModal: () => void;
}

export function LeadListContent({
  leads,
  viewMode,
  isLoading,
  isError,
  error,
  onRetry,
  onSelectLead,
  onConvertLead,
  onAddFollowUp,
  onOpenAddModal,
}: LeadListContentProps): ReactElement {
  if (isLoading) {
    return <LoadingState variant="table" />;
  }

  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load leads'}
        onRetry={onRetry}
      />
    );
  }

  if (leads.length === 0) {
    return (
      <EmptyState
        title="No prospects found"
        description="Capture incoming inquiries or add your first sales lead to begin tracking."
        actionLabel="Add First Lead"
        onAction={onOpenAddModal}
      />
    );
  }

  if (viewMode === 'table') {
    return (
      <LeadDataTable
        leads={leads}
        isLoading={isLoading}
        onSelectLead={onSelectLead}
        onConvertLead={onConvertLead}
        onAddFollowUp={onAddFollowUp}
      />
    );
  }

  return (
    <LeadKanbanBoard
      leads={leads}
      onSelectLead={onSelectLead}
      onConvertLead={onConvertLead}
      onAddFollowUp={onAddFollowUp}
    />
  );
}
