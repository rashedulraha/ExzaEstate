import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '../button/IconButton.js';

export type DrawerSize = 'md' | 'lg' | 'xl';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: DrawerSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const sizeClasses: Record<DrawerSize, string> = {
  md: 'max-w-md', // ~448px
  lg: 'max-w-xl', // ~576px
  xl: 'max-w-2xl', // ~672px
};

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'lg',
  children,
  footer,
}: DrawerProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-40 flex justify-end bg-black/45 backdrop-blur-[0.5px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={`w-full bg-surface-elevated border-l border-border shadow-lg flex flex-col h-full animate-in slide-in-from-right duration-160 ${sizeClasses[size]}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 id="drawer-title" className="text-h2 text-text font-semibold">
              {title}
            </h2>
            {subtitle && <p className="text-small text-text-muted mt-0.5">{subtitle}</p>}
          </div>
          <IconButton
            icon={<X className="w-4 h-4" />}
            aria-label="Close drawer"
            size="sm"
            onClick={onClose}
          />
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">{children}</div>

        {/* Footer Actions */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-sunken/30">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
