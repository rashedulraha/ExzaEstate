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
}

function BreadcrumbItemContent({ item, isLast }: { item: BreadcrumbItem; isLast: boolean }) {
  if (isLast) {
    return (
      <span className="font-medium text-text truncate" aria-current="page">
        {item.label}
      </span>
    );
  }

  if (item.onClick || item.href) {
    return (
      <button
        type="button"
        onClick={item.onClick}
        className="text-text-muted hover:text-text cursor-pointer transition-colors truncate focus:outline-none"
      >
        {item.label}
      </button>
    );
  }

  return <span className="text-text-muted truncate">{item.label}</span>;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
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
                className="w-3.5 h-3.5 text-text-muted/60 shrink-0"
                aria-hidden="true"
              />
            )}
            <BreadcrumbItemContent item={item} isLast={isLast} />
          </React.Fragment>
        );
      })}
    </nav>
  );
}
