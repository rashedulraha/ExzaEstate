import type { ReactElement } from 'react';
import { StatusBadge } from '@exzaestate/ui';
import { formatMoney } from '@exzaestate/shared';
import { Phone, CalendarPlus, ArrowRightCircle } from 'lucide-react';
import type { LeadItem } from '../hooks/useLeadList.js';

interface LeadKanbanBoardProps {
  leads: LeadItem[];
  onSelectLead: (lead: LeadItem) => void;
  onConvertLead: (lead: LeadItem) => void;
  onAddFollowUp: (lead: LeadItem) => void;
}

const KANBAN_STAGES = [
  { id: 'NEW', title: 'New Leads' },
  { id: 'CONTACTED', title: 'Contacted' },
  { id: 'INTERESTED', title: 'Interested' },
  { id: 'QUALIFIED', title: 'Qualified' },
  { id: 'NEGOTIATION', title: 'Negotiation' },
  { id: 'CUSTOMER', title: 'Won / Customer' },
  { id: 'LOST', title: 'Lost' },
];

function LeadCard({
  lead,
  onSelect,
  onConvert,
  onAddFollowUp,
}: {
  lead: LeadItem;
  onSelect: () => void;
  onConvert: () => void;
  onAddFollowUp: () => void;
}): ReactElement {
  return (
    <div
      onClick={onSelect}
      className="p-3 bg-surface rounded-card border border-border hover:border-primary/50 shadow-sm transition-all cursor-pointer space-y-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-small text-text hover:text-primary truncate">
          {lead.fullName}
        </h4>
        <StatusBadge domain="lead" value={lead.status} />
      </div>

      <div className="text-caption text-text-muted flex items-center gap-1.5">
        <Phone className="w-3 h-3 text-text-muted/80" />
        <span>{lead.phone}</span>
      </div>

      {lead.budgetMaxPaisa && (
        <div className="text-caption font-mono text-text-2 font-medium">
          Budget: {formatMoney(BigInt(lead.budgetMaxPaisa))}
        </div>
      )}

      <div className="pt-2 border-t border-border flex items-center justify-between">
        <span className="text-caption text-text-muted uppercase">{lead.source}</span>
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label={`Follow-up for ${lead.fullName}`}
            className="p-1 text-text-muted hover:text-primary rounded-button"
            onClick={onAddFollowUp}
          >
            <CalendarPlus className="w-3.5 h-3.5" />
          </button>
          {lead.status.toUpperCase() !== 'CUSTOMER' && (
            <button
              type="button"
              aria-label={`Convert ${lead.fullName}`}
              className="p-1 text-text-muted hover:text-success rounded-button"
              onClick={onConvert}
            >
              <ArrowRightCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function LeadKanbanBoard({
  leads,
  onSelectLead,
  onConvertLead,
  onAddFollowUp,
}: LeadKanbanBoardProps): ReactElement {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
      {KANBAN_STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.status.toUpperCase() === stage.id);

        return (
          <div
            key={stage.id}
            className="w-72 shrink-0 bg-surface-sunken/60 rounded-card p-3 border border-border flex flex-col max-h-[750px]"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="font-semibold text-small text-text">{stage.title}</span>
              <span className="px-2 py-0.5 rounded-full text-caption font-bold bg-surface text-text-muted border border-border">
                {stageLeads.length}
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
              {stageLeads.length === 0 ? (
                <div className="py-8 text-center text-caption text-text-muted/60 border border-dashed border-border rounded-card">
                  No prospects
                </div>
              ) : (
                stageLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onSelect={() => onSelectLead(lead)}
                    onConvert={() => onConvertLead(lead)}
                    onAddFollowUp={() => onAddFollowUp(lead)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
