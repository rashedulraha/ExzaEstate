import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '../button/IconButton.js';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: DialogSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const sizeClasses: Record<DialogSize, string> = {
  sm: 'max-w-md', // ~448px
  md: 'max-w-lg', // ~512px
  lg: 'max-w-2xl', // ~672px
  xl: 'max-w-4xl', // ~896px
};

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? 'dialog-description' : undefined}
        className={`w-full bg-surface border border-border rounded-modal shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${sizeClasses[size]}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div>
            <h2 id="dialog-title" className="text-h2 text-text font-semibold">
              {title}
            </h2>
            {description && (
              <p id="dialog-description" className="text-small text-text-muted mt-0.5">
                {description}
              </p>
            )}
          </div>
          <IconButton
            icon={<X className="w-4 h-4" />}
            aria-label="Close dialog"
            size="sm"
            onClick={onClose}
          />
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">{children}</div>

        {/* Footer Actions */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
