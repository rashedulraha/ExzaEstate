import {
  Building2,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import type { TenantItem, PlatformLicenseItem } from '../schemas/system-admin.schema.js';

export interface PlatformActionItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  run: () => void;
  badge?: string;
}

interface PlatformPaletteResultsProps {
  searchTerm: string;
  filteredActions: PlatformActionItem[];
  filteredTenants: TenantItem[];
  filteredLicenses: PlatformLicenseItem[];
  totalItems: number;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onHoverIndex: (index: number) => void;
}

function EmptyPaletteState({ searchTerm }: { searchTerm: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-muted text-small space-y-1.5 min-h-[280px]">
      <p className="font-semibold text-text">No matches for &ldquo;{searchTerm}&rdquo;</p>
      <p className="text-caption max-w-sm">
        Try typing a company name, code, or action (e.g. &ldquo;register&rdquo;,
        &ldquo;license&rdquo;, &ldquo;status&rdquo;).
      </p>
    </div>
  );
}

function ActionRow({
  action,
  index,
  isSelected,
  onSelect,
  onHover,
}: {
  action: PlatformActionItem;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onHover: (idx: number) => void;
}) {
  const Icon = action.icon;
  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={onSelect}
      onMouseEnter={() => onHover(index)}
      className={`px-3.5 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors duration-150 ${
        isSelected
          ? 'bg-surface-sunken text-text font-medium'
          : 'text-text hover:bg-surface-sunken/50'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 pr-4">
        <div className="w-7 h-7 rounded-md bg-surface-sunken flex items-center justify-center shrink-0 border border-border/40">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="truncate">
          <div className="font-medium text-small truncate text-text">{action.title}</div>
          <div className="text-caption text-text-muted truncate mt-0.5">{action.description}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {action.badge && (
          <span className="text-[10px] font-mono uppercase bg-surface-sunken border border-border px-1.5 py-0.5 rounded text-text-muted">
            {action.badge}
          </span>
        )}
        <ArrowRight className="w-3.5 h-3.5 text-text-muted/50" />
      </div>
    </div>
  );
}

function TenantRow({
  tenant,
  index,
  isSelected,
  onSelect,
  onHover,
}: {
  tenant: TenantItem;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onHover: (idx: number) => void;
}) {
  const isActive = tenant.status === 'ACTIVE';
  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={onSelect}
      onMouseEnter={() => onHover(index)}
      className={`px-3.5 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors duration-150 ${
        isSelected
          ? 'bg-surface-sunken text-text font-medium'
          : 'text-text hover:bg-surface-sunken/50'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 pr-4">
        <div className="w-7 h-7 rounded-md bg-surface-sunken flex items-center justify-center shrink-0 border border-border/40">
          <Building2 className="w-4 h-4 text-text-muted" />
        </div>
        <div className="truncate">
          <div className="font-medium text-small flex items-center gap-2 truncate text-text">
            <span className="truncate">{tenant.name}</span>
            <span className="font-mono text-caption px-1.5 py-0.5 rounded bg-surface-sunken border border-border text-text-muted">
              {tenant.code}
            </span>
          </div>
          <div className="text-caption text-text-muted truncate mt-0.5">
            {tenant.timezone || 'Asia/Dhaka'}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
            isActive
              ? 'bg-success/10 text-success border-success/20'
              : 'bg-danger/10 text-danger border-danger/20'
          }`}
        >
          {isActive ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
          {tenant.status}
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-text-muted/50" />
      </div>
    </div>
  );
}

function LicenseRow({
  license,
  index,
  isSelected,
  onSelect,
  onHover,
}: {
  license: PlatformLicenseItem;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onHover: (idx: number) => void;
}) {
  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={onSelect}
      onMouseEnter={() => onHover(index)}
      className={`px-3.5 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors duration-150 ${
        isSelected
          ? 'bg-surface-sunken text-text font-medium'
          : 'text-text hover:bg-surface-sunken/50'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 pr-4">
        <div className="w-7 h-7 rounded-md bg-surface-sunken flex items-center justify-center shrink-0 border border-border/40">
          <KeyRound className="w-4 h-4 text-warning" />
        </div>
        <div className="truncate">
          <div className="font-medium font-mono text-small text-text truncate">
            {license.licenseKey}
          </div>
          <div className="text-caption text-text-muted truncate mt-0.5">
            {license.companyName} ({license.companyCode}) · {license.plan} Tier
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-caption text-text-muted tabular-nums">
          Valid to {new Date(license.validUntil).toLocaleDateString('en-GB')}
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-text-muted/50" />
      </div>
    </div>
  );
}

export function PlatformPaletteResults({
  searchTerm,
  filteredActions,
  filteredTenants,
  filteredLicenses,
  totalItems,
  selectedIndex,
  onSelectIndex,
  onHoverIndex,
}: PlatformPaletteResultsProps) {
  if (totalItems === 0) {
    return <EmptyPaletteState searchTerm={searchTerm} />;
  }

  return (
    <div className="space-y-4">
      {/* Platform Actions */}
      {filteredActions.length > 0 && (
        <div className="space-y-1">
          <div className="px-3 py-1 text-caption font-semibold text-text-muted/70 uppercase tracking-wider flex items-center justify-between">
            <span>Platform Actions</span>
            <span className="font-mono tabular-nums text-[11px]">
              {filteredActions.length} actions
            </span>
          </div>
          {filteredActions.map((action, idx) => (
            <ActionRow
              key={action.id}
              action={action}
              index={idx}
              isSelected={selectedIndex === idx}
              onSelect={() => onSelectIndex(idx)}
              onHover={onHoverIndex}
            />
          ))}
        </div>
      )}

      {/* Tenants */}
      {filteredTenants.length > 0 && (
        <div className="space-y-1">
          <div className="px-3 py-1 text-caption font-semibold text-text-muted/70 uppercase tracking-wider flex items-center justify-between">
            <span>Registered Companies</span>
            <span className="font-mono tabular-nums text-[11px]">
              {filteredTenants.length} companies
            </span>
          </div>
          {filteredTenants.map((tenant, idx) => {
            const itemIndex = filteredActions.length + idx;
            return (
              <TenantRow
                key={tenant.id}
                tenant={tenant}
                index={itemIndex}
                isSelected={selectedIndex === itemIndex}
                onSelect={() => onSelectIndex(itemIndex)}
                onHover={onHoverIndex}
              />
            );
          })}
        </div>
      )}

      {/* Cryptographic Licenses */}
      {filteredLicenses.length > 0 && (
        <div className="space-y-1">
          <div className="px-3 py-1 text-caption font-semibold text-text-muted/70 uppercase tracking-wider flex items-center justify-between">
            <span>Software Licenses</span>
            <span className="font-mono tabular-nums text-[11px]">
              {filteredLicenses.length} licenses
            </span>
          </div>
          {filteredLicenses.map((lic, idx) => {
            const itemIndex = filteredActions.length + filteredTenants.length + idx;
            return (
              <LicenseRow
                key={lic.id}
                license={lic}
                index={itemIndex}
                isSelected={selectedIndex === itemIndex}
                onSelect={() => onSelectIndex(itemIndex)}
                onHover={onHoverIndex}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
