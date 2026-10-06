import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  variant?: 'light' | 'dark';
}

function BreadcrumbItemContent({
  item,
  isLast,
  variant = 'light',
}: {
  item: BreadcrumbItem;
  isLast: boolean;
  variant?: 'light' | 'dark';
}) {
  const isDark = variant === 'dark';

  if (isLast) {
    return (
      <span
        className={`font-medium truncate ${isDark ? 'text-white' : 'text-text'}`}
        aria-current="page"
      >
        {item.label}
      </span>
    );
  }

  if (item.onClick || item.href) {
    return (
      <button
        type="button"
        onClick={item.onClick}
        className={`cursor-pointer transition-colors truncate focus:outline-none ${
          isDark ? 'text-white/60 hover:text-white' : 'text-text-muted hover:text-text'
        }`}
      >
        {item.label}
      </button>
    );
  }

  return (
    <span className={`truncate ${isDark ? 'text-white/60' : 'text-text-muted'}`}>{item.label}</span>
  );
}

export function Breadcrumbs({ items, className = '', variant = 'light' }: BreadcrumbsProps) {
  const isDark = variant === 'dark';

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center space-x-1.5 text-small ${className}`}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight
                className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-white/30' : 'text-text-muted/60'}`}
                aria-hidden="true"
              />
            )}
            <BreadcrumbItemContent item={item} isLast={isLast} variant={variant} />
          </React.Fragment>
        );
      })}
    </nav>
  );
}
