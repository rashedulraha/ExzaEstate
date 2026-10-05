import type { ReactElement } from 'react';
import { formatDate } from '@exzaestate/shared';
import { History, CheckCircle2, FileText, UserPlus, ShieldAlert } from 'lucide-react';
import type { CustomerTimelineItem } from '../hooks/useCustomerDetail.js';

interface CustomerTimelineViewProps {
  timeline: CustomerTimelineItem[];
}

function getEventIcon(eventType: string): ReactElement {
  switch (eventType.toUpperCase()) {
    case 'KYC_VERIFIED':
      return <CheckCircle2 className="w-4 h-4 text-success" />;
    case 'KYC_REJECTED':
      return <ShieldAlert className="w-4 h-4 text-danger" />;
    case 'DOCUMENT_ATTACHED':
      return <FileText className="w-4 h-4 text-info" />;
    case 'CO_BUYER_ADDED':
    case 'NOMINEE_ADDED':
      return <UserPlus className="w-4 h-4 text-primary" />;
    default:
      return <History className="w-4 h-4 text-text-muted" />;
  }
}

export function CustomerTimelineView({ timeline }: CustomerTimelineViewProps): ReactElement {
  if (timeline.length === 0) {
    return (
      <div className="p-8 text-center bg-surface rounded-card border border-border text-text-muted text-small">
        No recorded lifecycle events yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
      {timeline.map((event) => (
        <div key={event.id} className="relative flex items-start gap-3">
          <div className="absolute -left-6 top-1 p-1 rounded-full bg-surface border border-border">
            {getEventIcon(event.eventType)}
          </div>
          <div className="flex-1 p-3 bg-surface rounded-card border border-border shadow-xs">
            <div className="flex items-center justify-between text-caption">
              <span className="font-semibold text-text uppercase">{event.eventType}</span>
              <span className="text-text-muted font-mono">
                {formatDate(event.createdAt, 'Asia/Dhaka')}
              </span>
            </div>
            <p className="text-small text-text mt-1">{event.description}</p>
            {event.actorName && (
              <span className="text-caption text-text-muted mt-1 block">
                Actor: {event.actorName}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
