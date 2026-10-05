import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Search } from 'lucide-react';
import { useGlobalSearch, type GlobalSearchResultItem } from '../hooks/useGlobalSearch.js';
import {
  DEFAULT_COMMANDS,
  type NavCommand,
  resolveEntityPath,
} from './search-palette.constants.js';
import { SearchPaletteResults } from './SearchPaletteResults.js';

export interface GlobalSearchCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchCommandPalette({ isOpen, onClose }: GlobalSearchCommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { searchTerm, setSearchTerm, debouncedQuery, results, isLoading } = useGlobalSearch();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen, setSearchTerm]);

  if (!isOpen) return null;

  const items: GlobalSearchResultItem[] = results?.items ?? [];
  const isSearchActive = debouncedQuery.length >= 2;
  const activeCount = isSearchActive ? items.length : DEFAULT_COMMANDS.length;

  const handleSelectCommand = (cmd: NavCommand) => {
    navigate(cmd.path);
    onClose();
  };

  const handleSelectItem = (item: GlobalSearchResultItem) => {
    navigate(resolveEntityPath(item.entityType));
    onClose();
  };

  const handleKeyDownInList = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (activeCount || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + activeCount) % (activeCount || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isSearchActive && items[selectedIndex]) {
        handleSelectItem(items[selectedIndex]!);
      } else if (!isSearchActive && DEFAULT_COMMANDS[selectedIndex]) {
        handleSelectCommand(DEFAULT_COMMANDS[selectedIndex]!);
      }
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/45 backdrop-blur-[0.5px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global Search and Command Palette"
        className="w-full max-w-2xl bg-surface-elevated border border-border-strong rounded-modal shadow-lg overflow-hidden flex flex-col"
        onKeyDown={handleKeyDownInList}
      >
        {/* Search Bar Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-border gap-3 bg-surface">
          <Search className="w-5 h-5 text-text-muted shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search across customers, leads, bookings, properties, payments, vouchers..."
            className="flex-1 bg-transparent border-none outline-hidden text-body text-text placeholder:text-text-muted"
          />
          {isLoading && (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          <kbd className="hidden sm:inline-block text-caption bg-surface-sunken px-2 py-0.5 rounded border border-border font-mono text-text-muted">
            ESC to close
          </kbd>
        </div>

        {/* Results List or Quick Commands */}
        <div className="max-h-[420px] overflow-y-auto p-2 divide-y divide-border/50">
          <SearchPaletteResults
            isSearchActive={isSearchActive}
            isLoading={isLoading}
            items={items}
            selectedIndex={selectedIndex}
            onSelectItem={handleSelectItem}
            onSelectCommand={handleSelectCommand}
            onHoverIndex={setSelectedIndex}
          />
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-surface-sunken border-t border-border flex items-center justify-between text-caption text-text-muted">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-surface px-1 py-0.5 rounded border border-border">↑</kbd>{' '}
              <kbd className="font-mono bg-surface px-1 py-0.5 rounded border border-border">↓</kbd>{' '}
              to navigate
            </span>
            <span>
              <kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border">
                Enter
              </kbd>{' '}
              to select
            </span>
          </div>
          <span>ExzaEstate Universal Search</span>
        </div>
      </div>
    </div>
  );
}
