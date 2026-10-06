import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'exza_sidebar_width';
const MIN_WIDTH = 200;
const MAX_WIDTH = 380;
const DEFAULT_WIDTH = 250;
const COLLAPSE_THRESHOLD = 140;

export function useSidebarResize(isCollapsed: boolean, onToggleCollapse?: () => void) {
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDTH;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return DEFAULT_WIDTH;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isHoveringResizer, setIsHoveringResizer] = useState(false);
  const onToggleCollapseRef = useRef(onToggleCollapse);
  onToggleCollapseRef.current = onToggleCollapse;

  // Global [ shortcut to toggle sidebar collapse
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '[' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        onToggleCollapseRef.current?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const newWidth = moveEvent.clientX;
        if (newWidth < COLLAPSE_THRESHOLD) {
          if (!isCollapsed) {
            onToggleCollapseRef.current?.();
          }
          return;
        }

        const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
        setWidth(clamped);
        try {
          localStorage.setItem(STORAGE_KEY, clamped.toString());
        } catch {
          // Ignore storage errors
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [isCollapsed],
  );

  return {
    width,
    isDragging,
    isHoveringResizer,
    setIsHoveringResizer,
    handleMouseDown,
  };
}
