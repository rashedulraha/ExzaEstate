import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Search, X } from 'lucide-react';
import { useGlobalSearch, type GlobalSearchResultItem } from '../hooks/useGlobalSearch.js';
import {
  DEFAULT_COMMANDS,
  filterNavCommands,
  type NavCommand,
  resolveEntityPath,
} from './search-palette.constants.js';
import { SearchPaletteResults } from './SearchPaletteResults.js';

export interface GlobalSearchCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export type SearchFilterScope = 'all' | 'pages' | 'customers' | 'properties' | 'finance';

const FILTER_SCOPES: { id: SearchFilterScope; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pages', label: 'Navigation' },
  { id: 'customers', label: 'Customers' },
  { id: 'properties', label: 'Properties' },
  { id: 'finance', label: 'Finance' },
];

export function GlobalSearchCommandPalette({ isOpen, onClose }: GlobalSearchCommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeScope, setActiveScope] = useState<SearchFilterScope>('all');

  const { searchTerm, setSearchTerm, results, isLoading } = useGlobalSearch();

  const dbItems: GlobalSearchResultItem[] = results?.items ?? [];
  const isTyping = searchTerm.trim().length > 0;
  const filteredCommands: NavCommand[] = useMemo(() => {
    return isTyping ? filterNavCommands(searchTerm) : DEFAULT_COMMANDS;
  }, [isTyping, searchTerm]);

  const displayedDbItems = useMemo(() => {
    if (activeScope === 'all') return dbItems;
    if (activeScope === 'pages') return [];
    if (activeScope === 'customers') {
      return dbItems.filter((item) => ['CUSTOMER', 'LEAD'].includes(item.entityType.toUpperCase()));
    }
    if (activeScope === 'properties') {
      return dbItems.filter((item) =>
        ['PROPERTY', 'PROJECT'].includes(item.entityType.toUpperCase()),
      );
    }
    if (activeScope === 'finance') {
      return dbItems.filter((item) =>
        ['PAYMENT', 'RECEIPT', 'VOUCHER', 'BOOKING'].includes(item.entityType.toUpperCase()),
      );
    }
    return dbItems;
  }, [dbItems, activeScope]);

  const displayedCommands = useMemo(() => {
    if (activeScope === 'all') return filteredCommands;
    if (activeScope === 'pages') return filteredCommands;
    if (activeScope === 'customers') {
      return filteredCommands.filter((cmd) => cmd.category === 'CRM & Sales');
    }
    if (activeScope === 'properties') {
      return filteredCommands.filter((cmd) => cmd.category === 'Property');
    }
    if (activeScope === 'finance') {
      return filteredCommands.filter((cmd) =>
        ['Finance', 'Collections', 'Overview'].includes(cmd.category),
      );
    }
    return filteredCommands;
  }, [filteredCommands, activeScope]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
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
      setActiveScope('all');
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen, setSearchTerm]);

  if (!isOpen) return null;

  const totalCount = displayedDbItems.length + displayedCommands.length;

  const handleSelectCommand = (cmd: NavCommand) => {
    navigate(cmd.path);
    onClose();
  };

  const handleSelectItem = (item: GlobalSearchResultItem) => {
    navigate(resolveEntityPath(item.entityType));
    onClose();
  };

  const handleKeyDownInList = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const currentIndex = FILTER_SCOPES.findIndex((s) => s.id === activeScope);
      const nextScope = FILTER_SCOPES[(currentIndex + 1) % FILTER_SCOPES.length]!.id;
      setActiveScope(nextScope);
      setSelectedIndex(0);
      return;
    }

    if (totalCount === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % totalCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalCount) % totalCount);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < displayedDbItems.length) {
        const item = displayedDbItems[selectedIndex];
        if (item) handleSelectItem(item);
      } else {
        const cmdIdx = selectedIndex - displayedDbItems.length;
        const cmd = displayedCommands[cmdIdx];
        if (cmd) handleSelectCommand(cmd);
      }
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
        aria-label="Global Search and Command Palette"
        className="w-full max-w-2xl bg-surface-elevated border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all duration-150 ease-out animate-in fade-in zoom-in-95"
        onKeyDown={handleKeyDownInList}
      >
        {/* Search Bar Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-border gap-3 bg-surface">
          <Search className="w-5 h-5 text-accent-text shrink-0" aria-hidden="true" />
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
          {isLoading && (
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          <kbd className="hidden sm:inline-block text-caption bg-surface-sunken px-2 py-0.5 rounded border border-border font-mono text-text-muted">
            ESC
          </kbd>
        </div>

        {/* Scope Filter Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-surface-sunken/40 overflow-x-auto text-caption">
          {FILTER_SCOPES.map((scope) => (
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
            Tab to switch
          </span>
        </div>

        {/* Results List or Quick Commands with Stable Min-Height */}
        <div className="min-h-[320px] max-h-[460px] overflow-y-auto p-2 sidebar-scroll flex flex-col transition-[height] duration-150">
          <SearchPaletteResults
            searchTerm={searchTerm}
            isLoading={isLoading}
            dbItems={displayedDbItems}
            navCommands={displayedCommands}
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
              to select
            </span>
          </div>
          <span className="text-[11px] text-text-muted/60">ExzaEstate Universal Search</span>
        </div>
      </div>
    </div>
  );
}
