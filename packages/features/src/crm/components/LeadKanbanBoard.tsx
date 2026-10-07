import { useState, useRef, useEffect, type ReactElement } from 'react';
import { StatusBadge } from '@exzaestate/ui';
import { formatMoney } from '@exzaestate/shared';
import {
  Phone,
  CalendarPlus,
  ArrowRightCircle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
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
  const currentStatus = (lead.status || 'NEW').toUpperCase();
  const rawPhone = lead.phone.replace(/[^0-9]/g, '');

  return (
    <div
      onClick={onSelect}
      className="group p-3 bg-surface rounded-card border border-border hover:border-primary/50 hover:shadow-md transition-all duration-150 cursor-pointer space-y-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-small text-text group-hover:text-primary transition-colors truncate">
          {lead.fullName}
        </h4>
        <StatusBadge domain="lead" value={currentStatus} />
      </div>

      <div className="flex items-center justify-between text-caption text-text-muted">
        <div className="flex items-center gap-1.5 truncate">
          <Phone className="w-3 h-3 text-text-muted/80 shrink-0" />
          <span className="font-mono truncate">{lead.phone}</span>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <a
            href={`https://wa.me/${rawPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Chat on WhatsApp"
            className="p-1 text-text-muted hover:text-success rounded hover:bg-surface-sunken transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
          </a>
        </div>
      </div>

      {lead.budgetMaxPaisa && (
        <div className="text-caption font-mono text-text-2 font-medium bg-surface-sunken/50 px-2 py-0.5 rounded border border-border/50 truncate">
          Budget: {formatMoney(BigInt(lead.budgetMaxPaisa))}
        </div>
      )}

      <div className="pt-2 border-t border-border flex items-center justify-between">
        <span className="text-caption text-text-muted font-medium uppercase tracking-wider">
          {lead.source}
        </span>
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label={`Follow-up for ${lead.fullName}`}
            className="p-1 text-text-muted hover:text-primary rounded hover:bg-surface-sunken transition-colors cursor-pointer"
            onClick={onAddFollowUp}
          >
            <CalendarPlus className="w-3.5 h-3.5" />
          </button>
          {currentStatus !== 'CUSTOMER' && (
            <button
              type="button"
              aria-label={`Convert ${lead.fullName}`}
              className="p-1 text-text-muted hover:text-success rounded hover:bg-surface-sunken transition-colors cursor-pointer"
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScrollIndicators = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    };

    updateScrollIndicators();
    container.addEventListener('scroll', updateScrollIndicators, { passive: true });
    window.addEventListener('resize', updateScrollIndicators);

    const onWheel = (e: WheelEvent) => {
      if (container.scrollWidth <= container.clientWidth) return;

      // When vertical wheel motion is detected
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        const target = e.target as HTMLElement | null;
        const columnBody = target?.closest('.column-card-list');

        if (columnBody && columnBody.scrollHeight > columnBody.clientHeight) {
          const atTop = columnBody.scrollTop <= 0 && e.deltaY < 0;
          const atBottom =
            columnBody.scrollTop + columnBody.clientHeight >= columnBody.scrollHeight - 1 &&
            e.deltaY > 0;
          if (!atTop && !atBottom) {
            return; // Let column scroll vertically
          }
        }

        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      container.removeEventListener('scroll', updateScrollIndicators);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', updateScrollIndicators);
    };
  }, [leads]);

  const scrollByAmount = (offset: number) => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-3">
      {/* Board Controls & Hint Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-caption text-text-muted">
          <HelpCircle className="w-3.5 h-3.5 text-text-muted" />
          <span>
            Tip: Hover and use mouse wheel or arrow buttons to scroll across pipeline stages
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollByAmount(-300)}
            disabled={!canScrollLeft}
            aria-label="Scroll pipeline left"
            className="p-1.5 rounded-button bg-surface border border-border text-text hover:bg-surface-sunken disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount(300)}
            disabled={!canScrollRight}
            aria-label="Scroll pipeline right"
            className="p-1.5 rounded-button bg-surface border border-border text-text hover:bg-surface-sunken disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Kanban Horizontal Board */}
      <div
        ref={containerRef}
        className="board-scroll flex gap-4 overflow-x-auto pb-4 pt-1 rounded-card focus:outline-none"
        tabIndex={0}
        aria-label="Lead Pipeline Kanban Board"
      >
        {KANBAN_STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => (l.status || '').toUpperCase() === stage.id);

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

              <div className="column-card-list space-y-2.5 overflow-y-auto flex-1 pr-1 sidebar-scroll">
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
    </div>
  );
}
