import { ChevronDown, PanelLeftClose, Plus, Search, Pin, HelpCircle } from 'lucide-react';
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
        className="p-1 rounded hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
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
        className="p-1 rounded hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
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
  return (
    <div className="h-12 px-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2 min-w-0 pr-1">
        <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center shrink-0">
          <ExzaLogoIcon size={16} variant="primary" />
        </div>
        <span className="text-[13px] font-medium text-white truncate flex items-center gap-1">
          {companyName}
          <ChevronDown className="w-3 h-3 text-white/40 shrink-0" />
        </span>
      </div>

      <div className="flex items-center gap-0.5 shrink-0 text-white/50">
        <button
          type="button"
          onClick={onQuickAction}
          className="p-1 rounded hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
          title="Search / Quick Action (⌘K)"
          aria-label="Quick Action"
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
    <div className="h-10 px-3 flex items-center justify-between text-caption text-white/40 shrink-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
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
          <span className="text-[11px] text-white/60">Live Sync</span>
        </div>
      </div>
      <span className="font-mono text-[10px] text-white/30">v2.4.0</span>
    </div>
  );
}

export function SidebarQuickAction({ onQuickAction }: { onQuickAction?: () => void }) {
  return (
    <div className="px-2 pt-1 pb-1">
      <button
        type="button"
        onClick={onQuickAction}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/75 hover:text-white border border-white/5 hover:border-white/10 text-caption font-medium transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Plus className="w-3.5 h-3.5 text-white/70" />
          <span>New Transaction</span>
        </span>
        <kbd className="bg-white/10 px-1.5 py-0.2 rounded text-[10px] font-mono text-white/60">
          ⌘K
        </kbd>
      </button>
    </div>
  );
}
