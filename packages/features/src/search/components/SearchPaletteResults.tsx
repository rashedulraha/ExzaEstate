import { ArrowRight, Sparkles } from 'lucide-react';
import type { GlobalSearchResultItem } from '../hooks/useGlobalSearch.js';
import { DEFAULT_COMMANDS, type NavCommand, getEntityIcon } from './search-palette.constants.js';

interface SearchPaletteResultsProps {
  isSearchActive: boolean;
  isLoading: boolean;
  items: GlobalSearchResultItem[];
  selectedIndex: number;
  onSelectItem: (item: GlobalSearchResultItem) => void;
  onSelectCommand: (cmd: NavCommand) => void;
  onHoverIndex: (idx: number) => void;
}

function SearchResultsList({
  items,
  selectedIndex,
  onSelectItem,
  onHoverIndex,
}: {
  items: GlobalSearchResultItem[];
  selectedIndex: number;
  onSelectItem: (item: GlobalSearchResultItem) => void;
  onHoverIndex: (idx: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="px-3 py-1.5 text-caption font-semibold text-text-muted uppercase tracking-wider flex items-center justify-between">
        <span>Search Results</span>
        <span className="font-mono tabular-nums">{items.length} records</span>
      </div>
      {items.map((item, idx) => {
        const isSelected = selectedIndex === idx;
        return (
          <div
            key={item.id}
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelectItem(item)}
            onMouseEnter={() => onHoverIndex(idx)}
            className={`px-3 py-2.5 rounded-button flex items-center justify-between cursor-pointer transition-colors ${
              isSelected
                ? 'bg-surface-sunken text-text font-medium'
                : 'text-text hover:bg-surface-sunken/60'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded bg-surface border border-border shrink-0">
                {getEntityIcon(item.entityType)}
              </div>
              <div className="min-w-0">
                <div className="text-small font-semibold truncate flex items-center gap-2">
                  <span>{item.title}</span>
                  {item.referenceNumber && (
                    <span className="font-mono text-caption text-text-muted">
                      ({item.referenceNumber})
                    </span>
                  )}
                </div>
                {item.subtitle && (
                  <div className="text-caption text-text-muted truncate">{item.subtitle}</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {item.status && (
                <span className="px-2 py-0.5 rounded-full text-caption bg-surface border border-border text-text-muted font-medium">
                  {item.status}
                </span>
              )}
              <span className="text-caption text-text-muted uppercase px-1.5 py-0.5 bg-surface-sunken rounded text-[10px]">
                {item.entityType}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QuickCommandsList({
  selectedIndex,
  onSelectCommand,
  onHoverIndex,
}: {
  selectedIndex: number;
  onSelectCommand: (cmd: NavCommand) => void;
  onHoverIndex: (idx: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="px-3 py-1.5 text-caption font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        <span>Quick Navigation</span>
      </div>
      {DEFAULT_COMMANDS.map((cmd, idx) => {
        const isSelected = selectedIndex === idx;
        return (
          <div
            key={cmd.id}
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelectCommand(cmd)}
            onMouseEnter={() => onHoverIndex(idx)}
            className={`px-3 py-2.5 rounded-button flex items-center justify-between cursor-pointer transition-colors ${
              isSelected
                ? 'bg-surface-sunken text-text font-medium'
                : 'text-text hover:bg-surface-sunken/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-surface border border-border">{cmd.icon}</div>
              <span className="text-small font-medium">{cmd.title}</span>
            </div>
            <span className="text-caption text-text-muted flex items-center gap-1">
              <span>Jump</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EmptySearchState() {
  return (
    <div className="p-8 text-center text-text-muted text-small space-y-1">
      <p className="font-semibold text-text">No matching records found</p>
      <p className="text-caption">
        Try searching with customer name, phone number, booking code, or plot number
      </p>
    </div>
  );
}

export function SearchPaletteResults({
  isSearchActive,
  isLoading,
  items,
  selectedIndex,
  onSelectItem,
  onSelectCommand,
  onHoverIndex,
}: SearchPaletteResultsProps) {
  if (!isSearchActive) {
    return (
      <QuickCommandsList
        selectedIndex={selectedIndex}
        onSelectCommand={onSelectCommand}
        onHoverIndex={onHoverIndex}
      />
    );
  }

  if (items.length > 0) {
    return (
      <SearchResultsList
        items={items}
        selectedIndex={selectedIndex}
        onSelectItem={onSelectItem}
        onHoverIndex={onHoverIndex}
      />
    );
  }

  if (!isLoading) {
    return <EmptySearchState />;
  }

  return null;
}
