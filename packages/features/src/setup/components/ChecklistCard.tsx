import { useNavigate } from 'react-router';
import { CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@exzaestate/ui';
import type { ChecklistItem } from '../schemas/setup.schema.js';

export interface ChecklistCardProps {
  item: ChecklistItem;
}

function resolveActionRoute(key: string): { label: string; route: string } {
  switch (key) {
    case 'USERS_ROLES':
      return { label: 'Manage Users', route: '/users' };
    case 'NUMBERING_PATTERNS':
      return { label: 'Configure Series', route: '/settings' };
    case 'POLICY_SETTINGS':
      return { label: 'Review Policies', route: '/settings' };
    case 'BRANCHES':
    case 'DEPARTMENTS':
    case 'COMPANY_PROFILE':
    default:
      return { label: 'Configure in Settings', route: '/settings' };
  }
}

function getCardBorderClass(isCompleted: boolean, isMandatory: boolean): string {
  if (isCompleted) return 'border-border';
  if (isMandatory) return 'border-warning/30 ring-1 ring-warning/15';
  return 'border-border';
}

export function ChecklistCard({ item }: ChecklistCardProps) {
  const navigate = useNavigate();
  const { label, route } = resolveActionRoute(item.key);
  const borderClass = getCardBorderClass(item.isCompleted, item.isMandatory);

  return (
    <div className={`rounded-card border p-5 transition-all bg-surface ${borderClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          {item.isCompleted ? (
            <div className="p-1 rounded-full bg-success/15 text-success shrink-0 mt-0.5">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </div>
          ) : (
            <div className="p-1 rounded-full bg-surface-sunken text-warning shrink-0 mt-0.5 border border-border">
              <Clock className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-body font-semibold text-text">{item.title}</h4>
              {item.isMandatory && (
                <span className="text-caption font-semibold bg-danger/10 text-danger px-2 py-0.5 rounded-full border border-danger/20">
                  Mandatory
                </span>
              )}
            </div>
            <p className="text-body-sm text-text-muted mt-1 leading-relaxed">{item.description}</p>
          </div>
        </div>

        <Button
          variant={item.isCompleted ? 'ghost' : 'secondary'}
          size="sm"
          onClick={() => navigate(route)}
          className="shrink-0 space-x-1"
        >
          <span>{label}</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
