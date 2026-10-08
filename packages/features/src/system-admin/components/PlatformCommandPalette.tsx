import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Search, X } from 'lucide-react';
import { useSystemAdmin } from '../hooks/useSystemAdmin.js';
import type { TenantItem } from '../schemas/system-admin.schema.js';
import { PlatformPaletteResults, type PlatformActionItem } from './PlatformPaletteResults.js';
import { createPlatformActions } from './PlatformPaletteActions.js';

export interface PlatformCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOnboardModal?: () => void;
  onOpenLicenseModal?: (tenant?: TenantItem) => void;
  onViewTenant?: (tenant: TenantItem) => void;
}

export type PlatformFilterScope = 'all' | 'tenants' | 'actions' | 'licenses';

const SCOPES: { id: PlatformFilterScope; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'tenants', label: 'Companies' },
  { id: 'actions', label: 'Actions' },
  { id: 'licenses', label: 'Licenses' },
];

export function PlatformCommandPalette({
  isOpen,
  onClose,
  onOpenOnboardModal,
  onOpenLicenseModal,
  onViewTenant,
}: PlatformCommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeScope, setActiveScope] = useState<PlatformFilterScope>('all');

  const { tenants, licenses } = useSystemAdmin();

  // Platform Actions definition
  const actions: PlatformActionItem[] = useMemo(
    () =>
      createPlatformActions({
        navigate,
        onClose,
        onOpenOnboardModal,
        onOpenLicenseModal,
      }),
    [navigate, onClose, onOpenOnboardModal, onOpenLicenseModal],
  );

  // Filtered lists
  const query = searchTerm.trim().toLowerCase();

  const filteredTenants = useMemo(() => {
    if (activeScope === 'actions' || activeScope === 'licenses') return [];
    if (!query) return tenants.slice(0, 8);
    return tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.code.toLowerCase().includes(query) ||
        t.status.toLowerCase().includes(query),
    );
  }, [tenants, query, activeScope]);

  const filteredActions = useMemo(() => {
    if (activeScope === 'tenants' || activeScope === 'licenses') return [];
    if (!query) return actions;
    return actions.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query) ||
        a.badge?.toLowerCase().includes(query),
    );
  }, [actions, query, activeScope]);

  const filteredLicenses = useMemo(() => {
    if (activeScope === 'tenants' || activeScope === 'actions') return [];
    if (!query) return licenses.slice(0, 5);
    return licenses.filter(
      (l) =>
        l.licenseKey.toLowerCase().includes(query) ||
        l.companyName.toLowerCase().includes(query) ||
        l.companyCode.toLowerCase().includes(query) ||
        l.plan.toLowerCase().includes(query),
    );
  }, [licenses, query, activeScope]);

  const totalItems = filteredTenants.length + filteredActions.length + filteredLicenses.length;

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIndex(0);
      setActiveScope('all');
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectIndex = (index: number) => {
    let current = index;
    if (current < filteredActions.length) {
      filteredActions[current]?.run();
      return;
    }
    current -= filteredActions.length;
    if (current < filteredTenants.length) {
      const tenant = filteredTenants[current];
      if (tenant) {
        onViewTenant?.(tenant);
        onClose();
      }
      return;
    }
    current -= filteredTenants.length;
    if (current < filteredLicenses.length) {
      navigate('/system/licenses');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextIdx = (SCOPES.findIndex((s) => s.id === activeScope) + 1) % SCOPES.length;
      setActiveScope(SCOPES[nextIdx]!.id);
      setSelectedIndex(0);
      return;
    }
    if (totalItems === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelectIndex(selectedIndex);
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] sm:pt-[14vh] p-4 bg-black/60 backdrop-blur-sm transition-all duration-200 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Platform Quick Action Center"
        className="w-full max-w-2xl bg-surface-elevated border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all duration-150 ease-out animate-in fade-in zoom-in-95"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border gap-3 bg-surface">
          <Search className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search companies, quick actions, license keys..."
            className="flex-1 bg-transparent border-none outline-hidden text-body text-text placeholder:text-text-muted"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-sunken cursor-pointer transition-colors"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block text-caption bg-surface-sunken px-2 py-0.5 rounded border border-border font-mono text-text-muted">
            ESC
          </kbd>
        </div>

        {/* Scope Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-surface-sunken/40 overflow-x-auto text-caption">
          {SCOPES.map((scope) => (
            <button
              key={scope.id}
              type="button"
              onClick={() => {
                setActiveScope(scope.id);
                setSelectedIndex(0);
              }}
              className={`px-2.5 py-1 rounded-full text-caption font-medium transition-all cursor-pointer ${
                activeScope === scope.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-muted hover:text-text hover:bg-surface-sunken'
              }`}
            >
              {scope.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-text-muted/60 hidden sm:inline-block">
            Tab to switch scope
          </span>
        </div>

        {/* Items List with Stable Min-Height (Prevents layout jump) */}
        <div className="min-h-[320px] max-h-[460px] overflow-y-auto p-2 sidebar-scroll flex flex-col transition-[height] duration-150">
          <PlatformPaletteResults
            searchTerm={searchTerm}
            filteredActions={filteredActions}
            filteredTenants={filteredTenants}
            filteredLicenses={filteredLicenses}
            totalItems={totalItems}
            selectedIndex={selectedIndex}
            onSelectIndex={handleSelectIndex}
            onHoverIndex={setSelectedIndex}
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-surface-sunken border-t border-border flex items-center justify-between text-caption text-text-muted">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border text-[11px]">
                ↑
              </kbd>{' '}
              <kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border text-[11px]">
                ↓
              </kbd>{' '}
              to navigate
            </span>
            <span>
              <kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border text-[11px]">
                Enter
              </kbd>{' '}
              to execute
            </span>
          </div>
          <span className="text-[11px] text-text-muted/60">Super Admin Portal</span>
        </div>
      </div>
    </div>
  );
}
