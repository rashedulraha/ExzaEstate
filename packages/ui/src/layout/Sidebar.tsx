import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  type SidebarNavItem,
  type SidebarNavGroup,
  defaultSidebarGroups,
} from './sidebar.constants.js';
import { SidebarResizer, type SidebarResizerProps } from './SidebarResizer.js';
import { SidebarHeader, SidebarFooter, SidebarQuickAction } from './SidebarSections.js';

export {
  type SidebarNavItem,
  type SidebarNavGroup,
  defaultSidebarGroups,
} from './sidebar.constants.js';

export interface SidebarProps {
  currentRouteId?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onQuickAction?: () => void;
  groups?: SidebarNavGroup[];
  companyName?: string;
  className?: string;
  width?: number;
  isDragging?: boolean;
  isHoveringResizer?: boolean;
  setIsHoveringResizer?: (val: boolean) => void;
  handleMouseDown?: (e: React.MouseEvent) => void;
  isPeek?: boolean;
  onClosePeek?: () => void;
  onPin?: () => void;
  onItemClick?: () => void;
  onMouseLeave?: () => void;
}

function SidebarItem({
  item,
  isActive,
  onClick,
}: {
  item: SidebarNavItem;
  isActive: boolean;
  onClick?: () => void;
}) {
  const activeStyle = isActive
    ? 'bg-white/10 text-white font-medium shadow-xs'
    : 'text-white/60 hover:text-white hover:bg-white/5';

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          item.onClick?.();
          onClick?.();
        }}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors duration-150 cursor-pointer ${activeStyle}`}
      >
        <span className={`shrink-0 ${isActive ? 'text-white' : 'text-white/60'}`}>{item.icon}</span>
        <span className="truncate">{item.label}</span>
        {item.badge !== undefined && (
          <span className="ml-auto text-[11px] bg-white/10 px-1.5 py-0.2 rounded text-white/80 font-mono tabular-nums">
            {item.badge}
          </span>
        )}
      </button>
    </li>
  );
}

function CollapsibleNavGroup({
  group,
  currentRouteId,
  isCollapsed,
  onToggle,
  onItemClick,
}: {
  group: SidebarNavGroup;
  currentRouteId: string;
  isCollapsed: boolean;
  onToggle: () => void;
  onItemClick?: () => void;
}) {
  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-white/40 hover:text-white/75 uppercase tracking-wider rounded transition-colors cursor-pointer select-none group"
      >
        <span>{group.title}</span>
        <span className="text-white/30 group-hover:text-white/60 transition-transform">
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </span>
      </button>

      {!isCollapsed && (
        <ul className="space-y-0.5 pl-3 border-l border-white/5 ml-2 mt-0.5">
          {group.items.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={item.id === currentRouteId}
              onClick={onItemClick}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SidebarGroupList({
  groups,
  currentRouteId,
  collapsedGroups,
  onToggleGroup,
  onItemClick,
}: {
  groups: SidebarNavGroup[];
  currentRouteId: string;
  collapsedGroups: Record<string, boolean>;
  onToggleGroup: (id: string) => void;
  onItemClick?: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto sidebar-scroll py-2 space-y-3 px-2">
      {groups.map((group) => (
        <CollapsibleNavGroup
          key={group.id}
          group={group}
          currentRouteId={currentRouteId}
          isCollapsed={Boolean(collapsedGroups[group.id])}
          onToggle={() => onToggleGroup(group.id)}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  );
}

function getSidebarClass(extraClass?: string): string {
  const base = 'h-full bg-sidebar flex flex-col select-none relative';
  const custom = extraClass ?? '';
  return `${base} ${custom}`;
}

function ResizerSlot({ isPeek, ...props }: { isPeek: boolean } & SidebarResizerProps) {
  if (isPeek) return null;
  return <SidebarResizer {...props} />;
}

export function Sidebar(props: SidebarProps) {
  const isPeek = Boolean(props.isPeek);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const effectiveWidth = props.width ?? 250;
  const groups = props.groups ?? defaultSidebarGroups;
  const currentRouteId = props.currentRouteId ?? 'properties';
  const companyName = props.companyName ?? 'Exza Holdings Ltd.';

  return (
    <aside
      aria-label="Sidebar navigation"
      style={{ width: `${effectiveWidth}px` }}
      className={getSidebarClass(props.className)}
    >
      <SidebarHeader
        companyName={companyName}
        onToggleCollapse={props.onToggleCollapse}
        onQuickAction={props.onQuickAction}
        isPeek={isPeek}
        onPin={props.onPin}
      />

      <SidebarQuickAction onQuickAction={props.onQuickAction} />

      <SidebarGroupList
        groups={groups}
        currentRouteId={currentRouteId}
        collapsedGroups={collapsedGroups}
        onToggleGroup={toggleGroup}
        onItemClick={props.onItemClick}
      />

      <SidebarFooter />

      <ResizerSlot
        isPeek={isPeek}
        onMouseDown={props.handleMouseDown}
        isHovering={props.isHoveringResizer}
        setIsHovering={props.setIsHoveringResizer}
        isDragging={props.isDragging}
        onDoubleClick={props.onToggleCollapse}
      />
    </aside>
  );
}
