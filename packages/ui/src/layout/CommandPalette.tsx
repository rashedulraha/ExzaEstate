import { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight, CornerDownLeft } from 'lucide-react';

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: CommandItem[];
}

function handlePaletteShortcuts(e: KeyboardEvent, isOpen: boolean, onClose: () => void): boolean {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if (isOpen) onClose();
    return true;
  }
  if (e.key === 'Escape' && isOpen) {
    onClose();
    return true;
  }
  return false;
}

export function CommandPalette({ isOpen, onClose, items }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = query.trim()
    ? items.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase()),
      )
    : items;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (handlePaletteShortcuts(e, isOpen, onClose)) return;
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredItems[selectedIndex];
        if (selected) {
          selected.onSelect();
          onClose();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filteredItems, selectedIndex]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = Array.from(new Set(filteredItems.map((item) => item.category)));

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/45 backdrop-blur-[0.5px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        className="w-full max-w-xl bg-surface-elevated border border-border-strong rounded-modal shadow-lg overflow-hidden flex flex-col"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-border gap-3">
          <Search className="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search records..."
            className="w-full bg-transparent text-text placeholder-text-muted text-body outline-none"
          />
          <kbd className="text-caption bg-surface-sunken px-1.5 py-0.5 rounded border border-border text-text-muted font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-small text-text-muted">
              No commands or records found
            </div>
          ) : (
            categories.map((category) => {
              const categoryItems = filteredItems.filter((item) => item.category === category);
              return (
                <div key={category} className="space-y-1">
                  <h4 className="px-3 text-caption font-semibold uppercase tracking-wider text-text-muted">
                    {category}
                  </h4>
                  {categoryItems.map((item) => {
                    const globalIdx = filteredItems.indexOf(item);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          item.onSelect();
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`flex items-center justify-between px-3 py-2 rounded-button text-small cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/8 text-primary font-medium'
                            : 'text-text hover:bg-surface-sunken'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <span>{item.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.shortcut && (
                            <kbd className="text-caption bg-surface-sunken px-1.5 py-0.5 rounded border border-border font-mono text-text-muted">
                              {item.shortcut}
                            </kbd>
                          )}
                          {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-primary" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
