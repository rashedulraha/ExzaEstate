import { ChevronDown, PanelLeftClose, Search, Pin, HelpCircle } from 'lucide-react';
import { cleanEnglishText } from '@exzaestate/shared';
import { ExzaLogoIcon } from '../components/brand/ExzaLogo.js';

export function SidebarHeaderControls({
  isPeek,
  onPin,
  onToggleCollapse,
}: {
  isPeek?: boolean;
  onPin?: () => void;
  onToggleCollapse?: () => void;
}) {
  if (isPeek && onPin) {
    return (
      <button
        type="button"
        onClick={onPin}
        className="p-1 rounded-button hover:bg-sidebar-hover text-sidebar-muted hover:text-sidebar-fg cursor-pointer transition-colors"
        title="Pin sidebar open"
        aria-label="Pin sidebar"
      >
        <Pin className="w-3.5 h-3.5" />
      </button>
    );
  }

  if (onToggleCollapse) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        className="p-1 rounded-button hover:bg-sidebar-hover text-sidebar-muted hover:text-sidebar-fg cursor-pointer transition-colors"
        title="Collapse sidebar ["
        aria-label="Collapse sidebar"
      >
        <PanelLeftClose className="w-3.5 h-3.5" />
      </button>
    );
  }

  return null;
}

export function SidebarHeader({
  companyName,
  onToggleCollapse,
  onQuickAction,
  isPeek,
  onPin,
}: {
  companyName: string;
  onToggleCollapse?: () => void;
  onQuickAction?: () => void;
  isPeek?: boolean;
  onPin?: () => void;
}) {
  const cleanName = cleanEnglishText(companyName, 'ExzaEstate Development Ltd.');

  return (
    <div className="h-14 px-3 flex items-center justify-between shrink-0 min-w-0">
      <div
        className="flex items-center gap-2 min-w-0 flex-1 pr-1.5 cursor-default select-none"
        title={cleanName}
      >
        <div className="w-6 h-6 rounded-button bg-primary/15 flex items-center justify-center shrink-0">
          <ExzaLogoIcon size={16} variant="primary" />
        </div>
        <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden" title={cleanName}>
          <span
            className="text-[13px] font-semibold text-sidebar-fg truncate block"
            title={cleanName}
          >
            {cleanName}
          </span>
          <ChevronDown className="w-3 h-3 text-sidebar-muted/60 shrink-0" aria-hidden="true" />
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0 text-sidebar-muted">
        <button
          type="button"
          onClick={onQuickAction}
          className="p-1 rounded-button hover:bg-sidebar-hover hover:text-sidebar-fg cursor-pointer transition-colors"
          title="Search records, actions, vouchers (Ctrl+K)"
          aria-label="Search records, actions, vouchers"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
        <SidebarHeaderControls isPeek={isPeek} onPin={onPin} onToggleCollapse={onToggleCollapse} />
      </div>
    </div>
  );
}

export function SidebarFooter() {
  return (
    <div className="h-10 px-3 flex items-center justify-between text-caption text-sidebar-muted shrink-0 border-t border-sidebar-border/50">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="p-1 rounded-button hover:bg-sidebar-hover hover:text-sidebar-fg transition-colors cursor-pointer"
          title="Help & Documentation"
          aria-label="Help"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          <span className="text-[11px] text-sidebar-muted font-medium">Live Sync</span>
        </div>
      </div>
      <span className="font-mono text-[10px] text-sidebar-muted/60">v2.4.0</span>
    </div>
  );
}

export function SidebarQuickAction({ onQuickAction }: { onQuickAction?: () => void }) {
  return (
    <div className="px-2 pt-2 pb-1">
      <button
        type="button"
        onClick={onQuickAction}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-button bg-sidebar-hover hover:bg-sidebar-active text-sidebar-fg border border-sidebar-border text-caption font-medium transition-colors cursor-pointer group"
        title="Search records, actions, vouchers (Ctrl+K)"
        aria-label="Search records, actions, vouchers"
      >
        <span className="flex items-center gap-2 min-w-0 pr-1">
          <Search className="w-3.5 h-3.5 text-primary shrink-0 group-hover:scale-105 transition-transform" />
          <span className="truncate text-sidebar-muted group-hover:text-sidebar-fg transition-colors">
            Search records, actions, vouchers...
          </span>
        </span>
        <kbd className="bg-surface-sunken border border-sidebar-border px-1.5 py-0.5 rounded-button text-[10px] font-mono text-sidebar-muted shrink-0 ml-1">
          Ctrl+K
        </kbd>
      </button>
    </div>
  );
}
