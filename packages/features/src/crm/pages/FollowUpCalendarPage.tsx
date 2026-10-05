import type { ReactElement } from 'react';
import { Breadcrumbs, Button, StatusBadge, LoadingState, EmptyState } from '@exzaestate/ui';
import { formatDate } from '@exzaestate/shared';
import {
  Calendar,
  AlertCircle,
  Phone,
  Video,
  MapPin,
  Mail,
  MessageSquare,
  CheckCircle,
} from 'lucide-react';
import {
  useFollowUpList,
  useFollowUpActions,
  type FollowUpItem,
} from '../hooks/useFollowUpList.js';

function getFollowUpIcon(type: string): ReactElement {
  switch (type.toUpperCase()) {
    case 'CALL':
      return <Phone className="w-4 h-4 text-info" />;
    case 'MEETING':
      return <Video className="w-4 h-4 text-primary" />;
    case 'SITE_VISIT':
      return <MapPin className="w-4 h-4 text-warning" />;
    case 'EMAIL':
      return <Mail className="w-4 h-4 text-secondary" />;
    case 'WHATSAPP':
      return <MessageSquare className="w-4 h-4 text-success" />;
    default:
      return <Calendar className="w-4 h-4 text-text-muted" />;
  }
}

function FollowUpCard({
  item,
  onComplete,
  isCompleting,
}: {
  item: FollowUpItem;
  onComplete: (id: string) => void;
  isCompleting: boolean;
}): ReactElement {
  const isOverdue =
    item.status.toUpperCase() === 'PENDING' && new Date(item.scheduledAt) < new Date();

  return (
    <div
      className={`p-4 bg-surface rounded-card border ${
        isOverdue ? 'border-danger/40 bg-danger/12' : 'border-border'
      } shadow-sm space-y-3 transition-colors`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-button bg-surface-sunken">{getFollowUpIcon(item.type)}</div>
          <div>
            <h4 className="font-semibold text-small text-text">
              {item.lead?.fullName ?? 'Unnamed Prospect'}
            </h4>
            <span className="text-caption text-text-muted">{item.lead?.phone}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOverdue && (
            <span className="inline-flex items-center gap-1 text-caption font-bold px-2 py-0.5 rounded-full bg-danger/12 text-danger border border-danger/30">
              <AlertCircle className="w-3 h-3" />
              Overdue
            </span>
          )}
          <StatusBadge value={item.status} />
        </div>
      </div>

      <p className="text-small text-text-2 bg-surface-sunken p-2.5 rounded-card border border-border">
        {item.notes}
      </p>

      <div className="flex items-center justify-between pt-1 text-caption text-text-muted">
        <span>Scheduled: {formatDate(item.scheduledAt, 'Asia/Dhaka')}</span>
        {item.status.toUpperCase() === 'PENDING' && (
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() => onComplete(item.id)}
            disabled={isCompleting}
          >
            <CheckCircle className="w-3.5 h-3.5 text-success" />
            <span>Mark Resolved</span>
          </Button>
        )}
      </div>
    </div>
  );
}

function FollowUpGrid({
  followUps,
  isLoading,
  onComplete,
  isCompleting,
}: {
  followUps: FollowUpItem[];
  isLoading: boolean;
  onComplete: (id: string) => void;
  isCompleting: boolean;
}): ReactElement {
  if (isLoading) {
    return <LoadingState variant="cards" />;
  }

  if (followUps.length === 0) {
    return (
      <EmptyState
        title="No follow-up activities"
        description="Schedule calls, site visits, and meetings from the prospect pipeline."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {followUps.map((item) => (
        <FollowUpCard
          key={item.id}
          item={item}
          onComplete={onComplete}
          isCompleting={isCompleting}
        />
      ))}
    </div>
  );
}

export function FollowUpCalendarPage(): ReactElement {
  const { followUps, overdueCount, isLoading, refetch } = useFollowUpList();
  const { completeFollowUp, isCompleting } = useFollowUpActions();

  return (
    <div className="container-page space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: 'Overview', href: '/' },
              { label: 'CRM', href: '/crm/leads' },
              { label: 'Follow-ups & Activities' },
            ]}
          />
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-h1 font-semibold text-text">Follow-up Schedule</h1>
            {overdueCount > 0 && (
              <span className="text-caption font-bold px-2.5 py-0.5 rounded-full bg-danger/12 text-danger border border-danger/30">
                {overdueCount} Overdue
              </span>
            )}
          </div>
        </div>
      </div>

      <FollowUpGrid
        followUps={followUps}
        isLoading={isLoading}
        onComplete={(id) => {
          void completeFollowUp(id);
          void refetch();
        }}
        isCompleting={isCompleting}
      />
    </div>
  );
}
