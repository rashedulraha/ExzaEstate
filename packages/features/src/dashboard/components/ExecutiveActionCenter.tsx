import { useNavigate, useInRouterContext } from 'react-router';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { formatMoney } from '@exzaestate/shared';

export interface ExecutiveActionCenterProps {
  overdueAmountPaisa?: string;
  overdueCount?: number;
  accountsPayablePaisa?: string;
  totalSalesCount?: number;
}

interface ActionCenterViewProps extends ExecutiveActionCenterProps {
  onNavigate: (path: string) => void;
}

interface ActionItem {
  id: string;
  tag: string;
  tagColor: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

function buildActionItems(props: ActionCenterViewProps): ActionItem[] {
  const items: ActionItem[] = [];
  const overdueCount = props.overdueCount ?? 0;
  const overduePaisa = props.overdueAmountPaisa ? BigInt(props.overdueAmountPaisa) : 0n;
  const apPaisa = props.accountsPayablePaisa ? BigInt(props.accountsPayablePaisa) : 0n;

  if (overdueCount > 0 || overduePaisa > 0n) {
    items.push({
      id: 'overdue-recovery',
      tag: 'Critical Recovery',
      tagColor: 'bg-danger/10 text-danger border-danger/25',
      title: `${overdueCount} Overdue Installments (${formatMoney(overduePaisa)})`,
      description: 'Accounts exceeding scheduled due date; requires recovery officer follow-up.',
      actionLabel: 'Open Collections',
      onAction: () => props.onNavigate('/collection/receipts'),
    });
  }

  if (apPaisa > 0n) {
    items.push({
      id: 'ap-maturity',
      tag: 'Payables Due',
      tagColor: 'bg-warning/10 text-warning border-warning/25',
      title: `Outstanding Payables (${formatMoney(apPaisa)})`,
      description: 'Vendor bills and contractor claims verified; awaiting authorization.',
      actionLabel: 'Operations AP',
      onAction: () => props.onNavigate('/operations/expenses'),
    });
  }

  return items;
}

function ActionCenterView(props: ActionCenterViewProps) {
  const actionItems = buildActionItems(props);
  const hasItems = actionItems.length > 0;

  return (
    <div className="card-workspace p-5 sm:p-6 space-y-4 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-1 border-b border-border/80">
        <div>
          <h3 className="text-body font-bold text-text">Executive Action Center</h3>
          <p className="text-caption text-text-muted">
            High-priority operations requiring management intervention
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-semibold tabular-nums border ${
            hasItems
              ? 'bg-danger/10 text-danger border-danger/25'
              : 'bg-success/10 text-success border-success/25'
          }`}
        >
          {hasItems ? `${actionItems.length} Pending` : 'All Clear'}
        </span>
      </div>

      {/* Action Items List or Empty All-Clear State */}
      {hasItems ? (
        <div className="space-y-3">
          {actionItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-button bg-surface-sunken/40 hover:bg-surface-sunken/70 transition-all border border-border/70 hover:border-border"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-small font-bold text-text">{item.title}</span>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-caption font-medium border ${item.tagColor}`}
                  >
                    {item.tag}
                  </span>
                </div>
                <p className="text-caption text-text-muted leading-relaxed">{item.description}</p>
              </div>

              <button
                type="button"
                onClick={item.onAction}
                className="inline-flex items-center gap-1.5 text-small font-semibold text-text hover:text-primary transition-all self-end sm:self-center shrink-0 cursor-pointer active:scale-[0.96] px-3 py-1.5 rounded-button bg-surface border border-border hover:border-primary/40"
              >
                <span>{item.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-2 rounded-card bg-surface-sunken/30 border border-border/60 my-auto">
          <div className="w-10 h-10 rounded-full bg-success/10 border border-success/25 flex items-center justify-center text-success mb-1">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h4 className="text-body font-bold text-text">All Operational Workflows Up To Date</h4>
          <p className="text-caption text-text-muted max-w-sm">
            No overdue installments or past-due vendor payables requiring urgent executive action.
          </p>
        </div>
      )}
    </div>
  );
}

function RouterActionCenter(props: ExecutiveActionCenterProps) {
  const navigate = useNavigate();
  return <ActionCenterView {...props} onNavigate={navigate} />;
}

export function ExecutiveActionCenter(props: ExecutiveActionCenterProps) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <RouterActionCenter {...props} />;
  }
  return <ActionCenterView {...props} onNavigate={() => {}} />;
}
