import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T extends string = string> {
  id?: string;
  options: SelectOption<T>[];
  value?: T;
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  isError?: boolean;
  inputSize?: 'md' | 'lg';
  className?: string;
  'aria-describedby'?: string;
}

function getOptionItemClass(isDisabled: boolean | undefined, isSelected: boolean): string {
  if (isDisabled) {
    return 'opacity-40 cursor-not-allowed';
  }
  if (isSelected) {
    return 'bg-surface-sunken font-medium text-text';
  }
  return 'hover:bg-surface-sunken text-text';
}

interface SelectListProps<T extends string> {
  options: SelectOption<T>[];
  value?: T;
  searchQuery: string;
  showSearch: boolean;
  onSearchChange: (query: string) => void;
  onSelect: (value: T) => void;
}

function SelectOptionsList<T extends string>({
  options,
  value,
  searchQuery,
  showSearch,
  onSearchChange,
  onSelect,
}: SelectListProps<T>) {
  return (
    <div
      role="listbox"
      className="absolute z-50 mt-1 min-w-full w-max max-w-xs bg-surface border border-border rounded-button shadow-xl py-1 max-h-60 overflow-y-auto focus:outline-none"
    >
      {showSearch && (
        <div className="p-2 border-b border-border sticky top-0 bg-surface">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-2 py-1 text-small bg-surface-sunken rounded border border-border outline-none focus:border-focus"
            />
          </div>
        </div>
      )}

      {options.length === 0 ? (
        <div className="py-3 px-4 text-small text-text-muted text-center">No options found</div>
      ) : (
        options.map((opt) => {
          const isSelected = opt.value === value;
          const itemClass = getOptionItemClass(opt.disabled, isSelected);
          return (
            <div
              key={opt.value}
              role="option"
              aria-selected={isSelected}
              onClick={() => {
                if (opt.disabled) return;
                onSelect(opt.value);
              }}
              className={`flex items-center justify-between px-3 py-2 text-small cursor-pointer transition-colors ${itemClass}`}
            >
              <span className="truncate">{opt.label}</span>
              {isSelected && <Check className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />}
            </div>
          );
        })
      )}
    </div>
  );
}

interface SelectTriggerProps {
  id?: string;
  disabled: boolean;
  isOpen: boolean;
  describedBy?: string;
  onClick: () => void;
  selectedLabel?: string;
  placeholder: string;
  inputSize: 'md' | 'lg';
  isError: boolean;
}

function SelectTrigger({
  id,
  disabled,
  isOpen,
  describedBy,
  onClick,
  selectedLabel,
  placeholder,
  inputSize,
  isError,
}: SelectTriggerProps) {
  const heightClass = inputSize === 'lg' ? 'h-10' : 'h-9';
  const textClass = inputSize === 'lg' ? 'text-body' : 'text-small';
  const borderClass = isError
    ? 'border-danger focus-visible:ring-danger'
    : 'border-border-input focus-visible:ring-focus';

  return (
    <button
      id={id}
      type="button"
      disabled={disabled}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-describedby={describedBy}
      onClick={onClick}
      className={`w-full flex items-center justify-between min-w-0 px-3 bg-surface text-text rounded-button border ${textClass} text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-0 disabled:bg-surface-sunken disabled:cursor-not-allowed ${heightClass} ${borderClass}`}
    >
      <span className={`truncate mr-2 ${selectedLabel ? 'text-text' : 'text-text-muted'}`}>
        {selectedLabel ?? placeholder}
      </span>
      <ChevronDown
        className={`w-4 h-4 shrink-0 text-text-muted transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        aria-hidden="true"
      />
    </button>
  );
}

export function Select<T extends string = string>({
  id,
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  isError = false,
  inputSize = 'lg',
  className = '',
  'aria-describedby': describedBy,
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const showSearch = options.length > 15;

  const filteredOptions = showSearch
    ? options.filter((opt) => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <SelectTrigger
        id={id}
        disabled={disabled}
        isOpen={isOpen}
        describedBy={describedBy}
        onClick={() => setIsOpen((prev) => !prev)}
        selectedLabel={selectedOption?.label}
        placeholder={placeholder}
        inputSize={inputSize}
        isError={isError}
      />

      {isOpen && (
        <SelectOptionsList
          options={filteredOptions}
          value={value}
          searchQuery={searchQuery}
          showSearch={showSearch}
          onSearchChange={setSearchQuery}
          onSelect={(val) => {
            onChange(val);
            setIsOpen(false);
            setSearchQuery('');
          }}
        />
      )}
    </div>
  );
}
