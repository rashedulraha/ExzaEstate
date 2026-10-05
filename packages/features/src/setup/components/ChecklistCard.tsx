import { useNavigate } from 'react-router';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
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

export function ChecklistCard({ item }: ChecklistCardProps) {
  const navigate = useNavigate();
  const { label, route } = resolveActionRoute(item.key);

  return (
    <div
      className={`rounded-card border p-5 transition-all ${
        item.isCompleted
          ? 'border-border bg-surface-elevated/70'
          : 'border-warning/30 bg-surface-elevated ring-1 ring-warning/10'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          {item.isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <Circle className="h-5 w-5 text-text-muted shrink-0 mt-0.5" aria-hidden="true" />
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
