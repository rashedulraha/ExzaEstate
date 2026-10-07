import { ArrowRight } from 'lucide-react';
import type { GlobalSearchResultItem } from '../hooks/useGlobalSearch.js';
import type { NavCommand } from './search-palette.constants.js';

interface SearchPaletteResultsProps {
  searchTerm: string;
  isLoading: boolean;
  dbItems: GlobalSearchResultItem[];
  navCommands: NavCommand[];
  selectedIndex: number;
  onSelectItem: (item: GlobalSearchResultItem) => void;
  onSelectCommand: (cmd: NavCommand) => void;
  onHoverIndex: (idx: number) => void;
}

function DbResultRow({
  item,
  index,
  isSelected,
  onSelectItem,
  onHoverIndex,
}: {
  item: GlobalSearchResultItem;
  index: number;
  isSelected: boolean;
  onSelectItem: (item: GlobalSearchResultItem) => void;
  onHoverIndex: (idx: number) => void;
}) {
  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={() => onSelectItem(item)}
      onMouseEnter={() => onHoverIndex(index)}
      className={`px-3.5 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors duration-150 ${
        isSelected
          ? 'bg-surface-sunken text-text font-medium'
          : 'text-text hover:bg-surface-sunken/50'
      }`}
    >
      <div className="min-w-0 pr-4">
        <div className="text-small font-medium truncate flex items-center gap-2">
          <span className="truncate">{item.title}</span>
          {item.referenceNumber && (
            <span className="font-mono text-caption text-text-muted shrink-0">
              #{item.referenceNumber}
            </span>
          )}
        </div>
        {item.subtitle && (
          <div className="text-caption text-text-muted truncate mt-0.5">{item.subtitle}</div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {item.status && (
          <span className="px-2 py-0.5 rounded text-[11px] bg-surface-sunken border border-border text-text-muted font-medium font-mono">
            {item.status}
          </span>
        )}
        <span className="text-[11px] font-medium px-2 py-0.5 bg-surface-sunken/80 rounded text-text-muted">
          {item.entityType}
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-text-muted/50" />
      </div>
    </div>
  );
}

function NavCommandRow({
  cmd,
  index,
  isSelected,
  onSelectCommand,
  onHoverIndex,
}: {
  cmd: NavCommand;
  index: number;
  isSelected: boolean;
  onSelectCommand: (cmd: NavCommand) => void;
  onHoverIndex: (idx: number) => void;
}) {
  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={() => onSelectCommand(cmd)}
      onMouseEnter={() => onHoverIndex(index)}
      className={`px-3.5 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors duration-150 ${
        isSelected
          ? 'bg-surface-sunken text-text font-medium'
          : 'text-text hover:bg-surface-sunken/50'
      }`}
    >
      <div className="min-w-0 pr-4 flex flex-col">
        <span className="text-small font-medium truncate">{cmd.title}</span>
        <span className="text-caption text-text-muted mt-0.5">{cmd.category}</span>
      </div>
      <span className="text-caption text-text-muted/60 flex items-center gap-1.5 shrink-0">
        <span className="text-[11px]">Jump</span>
        <ArrowRight className="w-3.5 h-3.5 text-text-muted/50" />
      </span>
    </div>
  );
}

function EmptySearchState({ searchTerm }: { searchTerm: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-muted text-small space-y-1.5 min-h-[280px]">
      <p className="font-semibold text-text">No matches for &ldquo;{searchTerm}&rdquo;</p>
      <p className="text-caption max-w-sm">
        Try typing a module name (e.g. &ldquo;leads&rdquo;, &ldquo;bookings&rdquo;,
        &ldquo;reports&rdquo;) or a customer name / plot number.
      </p>
    </div>
  );
}

export function SearchPaletteResults({
  searchTerm,
  isLoading,
  dbItems,
  navCommands,
  selectedIndex,
  onSelectItem,
  onSelectCommand,
  onHoverIndex,
}: SearchPaletteResultsProps) {
  const hasDbItems = dbItems.length > 0;
  const hasNavCommands = navCommands.length > 0;
  const isTyping = searchTerm.trim().length > 0;

  if (!hasDbItems && !hasNavCommands) {
    if (isLoading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[280px]">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mb-2" />
          <span className="text-caption text-text-muted">Searching records...</span>
        </div>
      );
    }
    return <EmptySearchState searchTerm={searchTerm} />;
  }

  return (
    <div className="space-y-4">
      {/* 1. Live Database Search Results */}
      {hasDbItems && (
        <div className="space-y-1">
          <div className="px-3 py-1 text-caption font-semibold text-text-muted/70 uppercase tracking-wider flex items-center justify-between">
            <span>Database Records</span>
            <span className="font-mono tabular-nums text-[11px]">{dbItems.length} records</span>
          </div>
          {dbItems.map((item, idx) => (
            <DbResultRow
              key={item.id}
              item={item}
              index={idx}
              isSelected={selectedIndex === idx}
              onSelectItem={onSelectItem}
              onHoverIndex={onHoverIndex}
            />
          ))}
        </div>
      )}

      {/* 2. Navigation Commands */}
      {hasNavCommands && (
        <div className="space-y-1">
          <div className="px-3 py-1 text-caption font-semibold text-text-muted/70 uppercase tracking-wider flex items-center justify-between">
            <span>{isTyping ? 'Matching Sections & Pages' : 'Quick Navigation'}</span>
            <span className="font-mono tabular-nums text-[11px]">
              {navCommands.length} destinations
            </span>
          </div>
          {navCommands.map((cmd, idx) => {
            const globalIdx = dbItems.length + idx;
            return (
              <NavCommandRow
                key={cmd.id}
                cmd={cmd}
                index={globalIdx}
                isSelected={selectedIndex === globalIdx}
                onSelectCommand={onSelectCommand}
                onHoverIndex={onHoverIndex}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
