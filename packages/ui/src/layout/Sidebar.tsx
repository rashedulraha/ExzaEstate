import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cleanEnglishText } from '@exzaestate/shared';
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
    ? 'bg-primary/10 text-primary font-medium border border-primary/20'
    : 'text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover/80 border border-transparent';

  return (
    <li>
      <button
        type="button"
        aria-current={isActive ? 'page' : undefined}
        onClick={() => {
          item.onClick?.();
          onClick?.();
        }}
        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-button text-[13px] transition-all duration-150 cursor-pointer group text-left ${activeStyle}`}
      >
        <span
          className={`shrink-0 transition-transform duration-150 ${
            isActive
              ? 'text-primary scale-105'
              : 'text-sidebar-muted/80 group-hover:text-sidebar-fg group-hover:scale-105'
          }`}
        >
          {item.icon}
        </span>
        <span className="truncate flex-1">{item.label}</span>
        {item.badge !== undefined && (
          <span
            className={`ml-auto text-[10.5px] font-mono px-1.5 py-0.5 rounded-button tabular-nums transition-colors ${
              isActive
                ? 'bg-primary/20 text-primary font-semibold'
                : 'bg-surface-sunken text-sidebar-fg border border-sidebar-border/50'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    </li>
  );
}

function GroupHeaderTitle({ title, hasActiveItem }: { title: string; hasActiveItem: boolean }) {
  const titleClass = hasActiveItem
    ? 'text-sidebar-fg font-semibold'
    : 'text-sidebar-muted/70 group-hover:text-sidebar-fg';

  return (
    <span
      className={`text-[11px] font-semibold tracking-wider uppercase truncate transition-colors ${titleClass}`}
    >
      {title}
    </span>
  );
}

function GroupHeaderIndicator({
  hasActiveItem,
  isCollapsed,
  badge,
}: {
  hasActiveItem: boolean;
  isCollapsed: boolean;
  badge?: string | number;
}) {
  const showPulse = hasActiveItem && isCollapsed;

  return (
    <div className="flex items-center gap-1.5 shrink-0 ml-1">
      {showPulse && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
          title="Active page inside"
        />
      )}
      {badge !== undefined && (
        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-sidebar-hover text-sidebar-muted font-medium">
          {badge}
        </span>
      )}
      <span className="text-sidebar-muted/60 group-hover:text-sidebar-fg transition-transform duration-200">
        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </span>
    </div>
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
  const hasActiveItem = group.items.some((item) => item.id === currentRouteId);
  const btnHoverClass =
    hasActiveItem && isCollapsed ? 'bg-sidebar-hover/70' : 'hover:bg-sidebar-hover/50';

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!isCollapsed}
        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-button text-[11px] font-semibold transition-all duration-150 cursor-pointer select-none group text-left ${btnHoverClass}`}
      >
        <GroupHeaderTitle title={group.title} hasActiveItem={hasActiveItem} />
        <GroupHeaderIndicator
          hasActiveItem={hasActiveItem}
          isCollapsed={isCollapsed}
          badge={group.badge}
        />
      </button>

      {!isCollapsed && (
        <ul className="space-y-0.5 mt-0.5">
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
    <div className="flex-1 overflow-y-auto sidebar-scroll py-2.5 space-y-3 px-2">
      {groups.map((group, index) => (
        <React.Fragment key={group.id}>
          {index > 0 && <div className="border-t border-sidebar-border/30 my-1" />}
          <CollapsibleNavGroup
            group={group}
            currentRouteId={currentRouteId}
            isCollapsed={Boolean(collapsedGroups[group.id])}
            onToggle={() => onToggleGroup(group.id)}
            onItemClick={onItemClick}
          />
        </React.Fragment>
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
  const companyName = cleanEnglishText(props.companyName, 'ExzaEstate Development Ltd.');

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
