import { Building2, KeyRound, ShieldCheck, ShieldAlert, type LucideIcon } from 'lucide-react';
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
  filteredActions: PlatformActionItem[];
  filteredTenants: TenantItem[];
  filteredLicenses: PlatformLicenseItem[];
  totalItems: number;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onHoverIndex: (index: number) => void;
}

export function PlatformPaletteResults({
  filteredActions,
  filteredTenants,
  filteredLicenses,
  totalItems,
  selectedIndex,
  onSelectIndex,
  onHoverIndex,
}: PlatformPaletteResultsProps) {
  if (totalItems === 0) {
    return (
      <div className="py-12 text-center text-text-muted">
        <p className="text-body font-medium text-text">No matching records found</p>
        <p className="text-caption text-text-muted">Try searching with a company name or code.</p>
      </div>
    );
  }

  return (
    <div className="max-h-[440px] overflow-y-auto p-2 space-y-4">
      {/* Platform Actions */}
      {filteredActions.length > 0 && (
        <div className="space-y-1">
          <div className="px-2 py-1 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Platform Operations
          </div>
          {filteredActions.map((action, idx) => {
            const isSelected = selectedIndex === idx;
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => onSelectIndex(idx)}
                onMouseEnter={() => onHoverIndex(idx)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-button text-left transition cursor-pointer ${
                  isSelected ? 'bg-primary/10 text-primary' : 'text-text hover:bg-surface-sunken'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  <div className="truncate">
                    <div className="font-medium text-small truncate">{action.title}</div>
                    <div className="text-caption text-text-muted truncate">
                      {action.description}
                    </div>
                  </div>
                </div>
                {action.badge && (
                  <span className="text-[10px] font-mono uppercase bg-surface-sunken px-1.5 py-0.5 rounded text-text-muted shrink-0 ml-2">
                    {action.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Tenants */}
      {filteredTenants.length > 0 && (
        <div className="space-y-1">
          <div className="px-2 py-1 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Tenant Companies
          </div>
          {filteredTenants.map((tenant, idx) => {
            const itemIndex = filteredActions.length + idx;
            const isSelected = selectedIndex === itemIndex;
            const isActive = tenant.status === 'ACTIVE';
            return (
              <button
                key={tenant.id}
                type="button"
                onClick={() => onSelectIndex(itemIndex)}
                onMouseEnter={() => onHoverIndex(itemIndex)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-button text-left transition cursor-pointer ${
                  isSelected ? 'bg-primary/10 text-primary' : 'text-text hover:bg-surface-sunken'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Building2 className="w-4 h-4 text-text-muted shrink-0" />
                  <div className="truncate">
                    <div className="font-medium text-small flex items-center gap-2">
                      <span className="truncate">{tenant.name}</span>
                      <span className="font-mono text-caption px-1.5 py-0.2 rounded bg-surface-sunken border border-border">
                        {tenant.code}
                      </span>
                    </div>
                    <div className="text-caption text-text-muted truncate">
                      {tenant.timezone || 'Asia/Dhaka'}
                    </div>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                    isActive
                      ? 'bg-success/10 text-success border-success/20'
                      : 'bg-danger/10 text-danger border-danger/20'
                  }`}
                >
                  {isActive ? (
                    <ShieldCheck className="w-3 h-3" />
                  ) : (
                    <ShieldAlert className="w-3 h-3" />
                  )}
                  {tenant.status}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Cryptographic Licenses */}
      {filteredLicenses.length > 0 && (
        <div className="space-y-1">
          <div className="px-2 py-1 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Cryptographic Licenses
          </div>
          {filteredLicenses.map((lic, idx) => {
            const itemIndex = filteredActions.length + filteredTenants.length + idx;
            const isSelected = selectedIndex === itemIndex;
            return (
              <button
                key={lic.id}
                type="button"
                onClick={() => onSelectIndex(itemIndex)}
                onMouseEnter={() => onHoverIndex(itemIndex)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-button text-left transition cursor-pointer ${
                  isSelected ? 'bg-primary/10 text-primary' : 'text-text hover:bg-surface-sunken'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <KeyRound className="w-4 h-4 text-warning shrink-0" />
                  <div className="truncate">
                    <div className="font-medium font-mono text-small text-text truncate">
                      {lic.licenseKey}
                    </div>
                    <div className="text-caption text-text-muted truncate">
                      {lic.companyName} ({lic.companyCode}) · {lic.plan} Tier
                    </div>
                  </div>
                </div>
                <span className="text-caption text-text-muted tabular-nums shrink-0 ml-2">
                  Valid to {new Date(lic.validUntil).toLocaleDateString('en-GB')}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
