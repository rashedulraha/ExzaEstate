import type { ReactElement } from 'react';
import { Input, Select, LoadingState, ErrorState, EmptyState, StickyToolbar } from '@exzaestate/ui';
import { Search, X, Plus } from 'lucide-react';
import type { LeadItem, LeadFilters, LeadKpis } from '../hooks/useLeadList.js';
import { LeadDataTable } from '../components/LeadDataTable.js';
import { LeadKanbanBoard } from '../components/LeadKanbanBoard.js';
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  type LeadStatusEnum,
  type CreateLeadInput,
} from '../schemas/crm.schema.js';

const STAGE_LABELS: Record<string, string> = {
  NEW: 'New Inquiries',
  CONTACTED: 'Contacted',
  INTERESTED: 'Interested',
  QUALIFIED: 'Qualified',
  SITE_VISIT: 'Site Visit',
  NEGOTIATION: 'In Negotiation',
  BOOKING: 'Booking Request',
  CUSTOMER: 'Converted',
  LOST: 'Lost',
};

const SOURCE_LABELS: Record<string, string> = {
  FACEBOOK: 'Facebook',
  GOOGLE: 'Google',
  NEWSPAPER: 'Newspaper',
  BILLBOARD: 'Billboard',
  REFERRAL: 'Referral',
  WALK_IN: 'Walk-in',
  FAIR: 'Fair / Expo',
  CALL_CENTER: 'Call Center',
  OTHER: 'Other',
};

export function LeadKpiStrip({ kpis }: { kpis: LeadKpis }): ReactElement {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <div className="card-stat">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
          Total Leads
        </span>
        <span className="text-hero-num font-bold text-text mt-1.5 block">{kpis.totalLeads}</span>
      </div>
      <div className="card-stat">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
          New Inquiries
        </span>
        <span className="text-hero-num font-bold text-text mt-1.5 block">{kpis.newLeads}</span>
      </div>
      <div className="card-stat">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
          In Negotiation
        </span>
        <span className="text-hero-num font-bold text-accent mt-1.5 block">
          {kpis.inNegotiation}
        </span>
      </div>
      <div className="card-stat">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
          Converted
        </span>
        <span className="text-hero-num font-bold text-success mt-1.5 block">{kpis.converted}</span>
      </div>
      <div className="card-stat">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted block">
          Lost
        </span>
        <span className="text-hero-num font-bold text-text-muted mt-1.5 block">{kpis.lost}</span>
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
  const hasActiveFilters = Boolean(filters.search || filters.status || filters.source);

  return (
    <StickyToolbar>
      <div className="shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 bg-surface rounded-card border border-border">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative w-full sm:w-72 md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <Input
              id="search-leads"
              inputSize="md"
              value={filters.search ?? ''}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              placeholder="Search by prospect name, phone, or email..."
              className="pl-9 text-small"
            />
          </div>
          <div className="w-40 sm:w-44">
            <Select
              id="filter-lead-status"
              inputSize="md"
              value={filters.status ?? ''}
              onChange={(val) => onFilterChange({ ...filters, status: val as LeadStatusEnum | '' })}
              options={[
                { label: 'All Stages', value: '' },
                ...LEAD_STATUSES.map((s) => ({ label: STAGE_LABELS[s] || s, value: s })),
              ]}
            />
          </div>
          <div className="w-36 sm:w-40">
            <Select
              id="filter-lead-source"
              inputSize="md"
              value={filters.source ?? ''}
              onChange={(val) =>
                onFilterChange({ ...filters, source: val as CreateLeadInput['source'] | '' })
              }
              options={[
                { label: 'All Sources', value: '' },
                ...LEAD_SOURCES.map((s) => ({ label: SOURCE_LABELS[s] || s, value: s })),
              ]}
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, search: '', status: '', source: '' })}
              className="flex items-center gap-1 px-2.5 py-1.5 text-small text-text-muted hover:text-text rounded-button hover:bg-surface-sunken transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>
    </StickyToolbar>
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
        dashedBorder
        title="No prospects found"
        description="Capture incoming inquiries or add your first sales lead to begin tracking."
        actionLabel="Add Lead"
        actionVariant="secondary"
        actionIcon={<Plus className="w-4 h-4" />}
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
