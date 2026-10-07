import type { ReactNode } from 'react';

export interface StickyToolbarProps {
  children: ReactNode;
  className?: string;
  id?: string;
  'data-testid'?: string;
}

/**
 * StickyToolbar provides a unified floating sticky wrapper for search and filter toolbars
 * across all ExzaEstate enterprise workspaces.
 *
 * Architecture & Physics:
 * - Pins flush to `top-0` with `z-20` and an opaque canvas background (`bg-bg`).
 * - Features `pt-3.5` (14px) optical breathing space so the child card floats smoothly below the header.
 * - Negative margins (`-mt-3.5` and `-mx-1.5 px-1.5`) maintain natural page flow when un-scrolled
 *   while extending the background mask slightly wider than the table cards.
 * - Guarantees that scrolling table rows, borders, and text pass underneath `bg-bg` and
 *   NEVER peek through the child card's rounded corners or emerge above its top border.
 */
export function StickyToolbar({
  children,
  className = '',
  id,
  'data-testid': testId,
}: StickyToolbarProps) {
  return (
    <div
      id={id}
      data-testid={testId}
      className={`sticky top-0 z-20 -mt-3.5 pt-3.5 pb-0 -mx-1.5 px-1.5 bg-bg ${className}`}
    >
      {children}
    </div>
  );
}
