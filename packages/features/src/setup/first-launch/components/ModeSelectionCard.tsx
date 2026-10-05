import { type ReactElement } from 'react';
import type { RuntimeModeChoice } from '../schemas/first-launch.schema.js';

interface ModeOptionProps {
  mode: RuntimeModeChoice;
  selected: boolean;
  title: string;
  description: string;
  badges: string[];
  icon: ReactElement;
  onSelect: (mode: RuntimeModeChoice) => void;
}

function ModeOptionCard({
  mode,
  selected,
  title,
  description,
  badges,
  icon,
  onSelect,
}: ModeOptionProps): ReactElement {
  const borderClass = selected
    ? 'border-accent ring-2 ring-accent/30 bg-surface'
    : 'border-border bg-surface hover:border-border-input';

  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={`text-left w-full p-6 rounded-card border transition-all cursor-pointer shadow-sm relative focus:outline-none ${borderClass}`}
      aria-pressed={selected}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-card bg-surface-sunken flex items-center justify-center shrink-0 border border-border text-primary">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-h3 font-semibold text-text">{title}</h3>
            <span
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                selected ? 'border-accent bg-accent text-primary' : 'border-border-input'
              }`}
            >
              {selected && <span className="text-caption font-bold">✓</span>}
            </span>
          </div>
          <p className="mt-2 text-body text-text-muted leading-relaxed">{description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b}
                className="text-caption font-medium px-2.5 py-1 rounded-full bg-surface-sunken text-text-2 border border-border"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

interface ModeSelectionProps {
  selectedMode: RuntimeModeChoice;
  onSelectMode: (mode: RuntimeModeChoice) => void;
}

export function ModeSelectionCard({
  selectedMode,
  onSelectMode,
}: ModeSelectionProps): ReactElement {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-h2 font-bold text-text">Choose Runtime Engine</h2>
        <p className="mt-1 text-body text-text-muted">
          Select how your desktop client connects to the ExzaEstate financial system.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        <ModeOptionCard
          mode="cloud"
          selected={selectedMode === 'cloud'}
          title="Cloud-Hosted Multi-User"
          description="Connect to your organization's cloud deployment. Real-time multi-branch sync, browser portal access, and automatic server backups."
          badges={['Multi-Branch', 'Web Portal', 'Automatic Sync', 'Centralized Ledgers']}
          icon={
            <svg
              className="w-6 h-6"
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

        <ModeOptionCard
          mode="local"
          selected={selectedMode === 'local'}
          title="Local Standalone (100% Offline)"
          description="Run completely on this PC with an embedded database. Zero cloud data transmission, full accounting immutability, and hardware-bound encryption."
          badges={['100% Offline', 'Embedded Postgres', 'Zero Cloud Transmission', 'Air-Gapped']}
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              />
            </svg>
          }
          onSelect={onSelectMode}
        />
      </div>
    </div>
  );
}
