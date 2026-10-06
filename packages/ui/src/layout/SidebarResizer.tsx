import React from 'react';

export interface SidebarResizerProps {
  onMouseDown?: (e: React.MouseEvent) => void;
  isHovering?: boolean;
  setIsHovering?: (val: boolean) => void;
  isDragging?: boolean;
  onDoubleClick?: () => void;
}

export function SidebarResizer({
  onMouseDown,
  isHovering,
  setIsHovering,
  isDragging,
  onDoubleClick,
}: SidebarResizerProps) {
  if (!onMouseDown) return null;

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setIsHovering?.(true)}
      onMouseLeave={() => setIsHovering?.(false)}
      className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-40 transition-colors select-none ${
        isHovering || isDragging ? 'bg-white/15' : 'bg-transparent hover:bg-white/10'
      }`}
    >
      {isHovering && !isDragging && (
        <div className="absolute left-3 top-20 pointer-events-none z-50 bg-[#22222b] text-white text-[11px] px-2.5 py-1.5 rounded-md shadow-2xl border border-white/10 whitespace-nowrap flex flex-col gap-0.5 animate-in fade-in duration-100">
          <span className="font-medium text-white/90">Drag to resize</span>
          <span className="text-white/50 flex items-center gap-1">
            Click to collapse{' '}
            <kbd className="font-mono bg-white/10 px-1 py-0.2 rounded text-[10px] text-white/80">
              [
            </kbd>
          </span>
        </div>
      )}
    </div>
  );
}
