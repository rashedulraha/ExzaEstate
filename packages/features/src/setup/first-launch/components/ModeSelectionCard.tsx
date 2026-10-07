import { type ReactElement, useState } from 'react';
import { Button } from '@exzaestate/ui';
import type { RuntimeModeChoice } from '../schemas/first-launch.schema.js';

interface ModeOptionProps {
  mode: RuntimeModeChoice;
  selected: boolean;
  title: string;
  badgeText?: string;
  description: string;
  details: string[];
  icon: ReactElement;
  onSelect: (mode: RuntimeModeChoice) => void;
}

function ModeListItem({
  mode,
  selected,
  title,
  badgeText,
  description,
  details,
  icon,
  onSelect,
}: ModeOptionProps): ReactElement {
  const [showDetails, setShowDetails] = useState(false);

  const borderClass = selected
    ? 'border-primary ring-1 ring-primary/40 bg-primary/[0.03]'
    : 'border-border bg-surface hover:border-border-strong hover:bg-surface-elevated/40';

  return (
    <div
      onClick={() => onSelect(mode)}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onSelect(mode);
        }
      }}
      className={`text-left w-full p-5 sm:p-6 rounded-card border transition-all cursor-pointer relative ${borderClass}`}
    >
      <div className="flex items-start gap-4">
        {/* Modern Icon Box */}
        <div className="w-11 h-11 rounded-button bg-surface-sunken flex items-center justify-center shrink-0 border border-border text-primary">
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-h3 font-semibold text-text">{title}</h3>
              {badgeText && (
                <span className="badge-pill badge-primary text-caption font-semibold">
                  {badgeText}
                </span>
              )}
            </div>

            {/* Radio Selection Indicator */}
            <span
              className={`w-5 h-5 rounded-full border shrink-0 flex items-center justify-center transition-colors ${
                selected ? 'border-primary bg-primary text-on-primary' : 'border-border-input'
              }`}
            >
              {selected && <span className="text-caption font-bold leading-none">✓</span>}
            </span>
          </div>

          <p className="mt-1.5 text-body text-text-muted leading-relaxed">{description}</p>

          {/* Expandable Details Toggle */}
          <div className="mt-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails((prev) => !prev);
              }}
              className="text-caption font-medium text-text-muted hover:text-primary transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{showDetails ? 'Hide details' : 'More details'}</span>
              <span aria-hidden="true">{showDetails ? '▲' : '▼'}</span>
            </button>

            {showDetails && (
              <ul className="mt-2.5 space-y-1.5 text-caption text-text-2 bg-surface-sunken/60 p-3 rounded-button border border-border/50">
                {details.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ModeSelectionProps {
  selectedMode: RuntimeModeChoice;
  onSelectMode: (mode: RuntimeModeChoice) => void;
  onNext?: () => void;
  onBack?: () => void;
}

export function ModeSelectionCard({
  selectedMode,
  onSelectMode,
  onNext,
  onBack,
}: ModeSelectionProps): ReactElement {
  return (
    <div className="flex flex-col justify-between flex-1 space-y-4">
      <div>
        <h2 className="text-h2 font-bold text-text">Choose How to Run ExzaEstate</h2>
        <p className="mt-1 text-body text-text-muted leading-relaxed">
          Select where your organization's data will be stored.
        </p>
      </div>

      <div className="space-y-3.5 pt-1">
        <ModeListItem
          mode="cloud"
          selected={selectedMode === 'cloud'}
          title="Cloud-Hosted Multi-User"
          badgeText="Recommended for Teams"
          description="Your company data is securely hosted in the cloud. Multiple branch offices and team members can collaborate in real-time from any computer or browser."
          details={[
            'Secure cloud database with automatic real-time sync',
            'Log in from both desktop app and web browser',
            'Centralized accounting ledgers and automated backups',
          ]}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"
              />
            </svg>
          }
          onSelect={onSelectMode}
        />

        <ModeListItem
          mode="local"
          selected={selectedMode === 'local'}
          title="Local Standalone (100% Offline)"
          description="All company data stays strictly on this computer. Works 100% offline with no internet required. No data is ever transmitted to the cloud."
          details={[
            'Complete offline privacy — no internet connection needed',
            'Embedded database running locally on this PC',
            'Full property inventory, customer bookings, and installment accounts',
          ]}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 17L9 20m0 0l3-1.5m-3 1.5l-3-1.5m6-17H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2h-3.75"
              />
            </svg>
          }
          onSelect={onSelectMode}
        />
      </div>

      <div className="pt-4 flex items-center justify-between border-t border-border/40 mt-6">
        {onBack ? (
          <Button type="button" variant="secondary" onClick={onBack}>
            ← Back to Welcome
          </Button>
        ) : (
          <div />
        )}
        {onNext && (
          <Button
            type="button"
            variant="primary"
            onClick={onNext}
            className="px-6 py-2.5 font-semibold text-btn shadow-sm"
          >
            Continue to Workspace Setup →
          </Button>
        )}
      </div>
    </div>
  );
}
