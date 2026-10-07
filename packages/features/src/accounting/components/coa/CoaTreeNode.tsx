import { useState } from 'react';
import { formatMoney } from '@exzaestate/shared';
import { ChevronRight, ChevronDown, Folder, FileText, Plus, Shield } from 'lucide-react';
import type { AccountTreeItem, AccountTypeEnum } from '../../schemas/accounting.schema.js';

export interface TreeNodeProps {
  item: AccountTreeItem;
  level: number;
  selectedId?: string;
  onSelect: (item: AccountTreeItem) => void;
  onAddChild?: (parent: AccountTreeItem) => void;
  forcedExpand?: boolean | null;
}

export function getTypeBadgeStyle(type: AccountTypeEnum): string {
  switch (type) {
    case 'ASSET':
      return 'bg-info/12 text-info border-info/20';
    case 'LIABILITY':
      return 'bg-warning/12 text-warning border-warning/20';
    case 'EQUITY':
      return 'bg-special/12 text-special border-special/20';
    case 'INCOME':
      return 'bg-success/12 text-success border-success/20';
    case 'EXPENSE':
      return 'bg-danger/12 text-danger border-danger/20';
  }
}

function NodeToggle({
  hasChildren,
  isExpanded,
  onToggle,
}: {
  hasChildren: boolean;
  isExpanded: boolean;
  onToggle: (e: React.MouseEvent) => void;
}) {
  if (!hasChildren) {
    return <span className="w-5 h-5 inline-block" />;
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      className="p-1 rounded-button hover:bg-surface-sunken text-text-muted hover:text-text transition-colors"
      aria-label={isExpanded ? 'Collapse' : 'Expand'}
    >
      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
    </button>
  );
}

function NodeIcon({ isGroup }: { isGroup: boolean }) {
  if (isGroup) {
    return <Folder className="w-4 h-4 text-primary shrink-0" />;
  }
  return <FileText className="w-4 h-4 text-text-muted shrink-0" />;
}

export function TreeNode({
  item,
  level,
  selectedId,
  onSelect,
  onAddChild,
  forcedExpand,
}: TreeNodeProps) {
  const [localExpanded, setLocalExpanded] = useState(level < 2);
  const isExpanded = forcedExpand ?? localExpanded;
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const isSelected = item.id === selectedId;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalExpanded((prev) => !prev);
  };

  const handleRowClick = () => {
    onSelect(item);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddChild?.(item);
  };

  const rowStyle = isSelected
    ? 'bg-surface-sunken border-primary text-text'
    : 'border-transparent hover:bg-surface-sunken/60 text-text';

  return (
    <div className="flex flex-col select-none">
      <div
        data-testid={`coa-node-${item.code}`}
        onClick={handleRowClick}
        className={`group flex items-center justify-between px-3 py-2 rounded-button cursor-pointer transition-colors border ${rowStyle}`}
        style={{ paddingLeft: `${Math.max(level * 20 + 8, 8)}px` }}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <NodeToggle hasChildren={hasChildren} isExpanded={isExpanded} onToggle={toggleExpand} />
          <NodeIcon isGroup={item.isGroup} />

          <span className="font-mono font-bold text-small tabular-nums text-text">{item.code}</span>

          <span className="font-medium text-body truncate text-text">{item.name}</span>

          {item.system && (
            <span
              title="System account: protected by posting rules"
              className="inline-flex items-center text-text-muted"
            >
              <Shield className="w-3.5 h-3.5" />
            </span>
          )}

          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-semibold border ${getTypeBadgeStyle(
              item.type,
            )}`}
          >
            {item.type}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-small font-semibold tabular-nums text-text">
            {formatMoney(item.balancePaisa)}
          </span>

          {item.isGroup && onAddChild && (
            <button
              type="button"
              onClick={handleAddClick}
              title={`Add sub-account under ${item.name}`}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-button hover:bg-surface-sunken text-primary transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="flex flex-col">
          {item.children?.map((child) => (
            <TreeNode
              key={child.id}
              item={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              forcedExpand={forcedExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}
