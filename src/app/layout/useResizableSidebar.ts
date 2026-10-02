import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { usePersistentState } from '@/hooks/usePersistentState';
import { codecs, type StorageCodec } from '@/lib/storage';

export const SIDEBAR_MIN_WIDTH = 216;
export const SIDEBAR_MAX_WIDTH = 400;
export const SIDEBAR_DEFAULT_WIDTH = 264;
export const SIDEBAR_COLLAPSED_WIDTH = 76;

const clampWidth = (w: number) => Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, w));

const widthCodec: StorageCodec<number> = {
  ...codecs.number,
  parse: (raw) => {
    const n = codecs.number.parse(raw);
    return n !== undefined && n >= SIDEBAR_MIN_WIDTH && n <= SIDEBAR_MAX_WIDTH ? n : undefined;
  },
};

/**
 * The desktop sidebar's persisted width and collapsed state, plus the
 * drag-to-resize handle's mouse wiring. `enabled` is false below the desktop
 * breakpoint, where the sidebar is a drawer and the persisted collapse state
 * is simply not applied (it reapplies as-is once the viewport grows again).
 */
export function useResizableSidebar(enabled: boolean) {
  const [collapsed, setCollapsed] = usePersistentState(STORAGE_KEYS.sidebarCollapsed, false, codecs.boolean);
  const [width, setWidth] = usePersistentState(STORAGE_KEYS.sidebarWidth, SIDEBAR_DEFAULT_WIDTH, widthCodec);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);

  const effectiveCollapsed = enabled && collapsed;

  const onResizeStart = useCallback(
    (e: ReactMouseEvent) => {
      if (effectiveCollapsed) return;
      e.preventDefault();
      draggingRef.current = true;
      setDragging(true);
    },
    [effectiveCollapsed]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current) setWidth(clampWidth(e.clientX));
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [setWidth]);

  useEffect(() => {
    if (!dragging) return;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragging]);

  return {
    collapsed: effectiveCollapsed,
    toggleCollapsed: () => setCollapsed((c) => !c),
    width: effectiveCollapsed ? SIDEBAR_COLLAPSED_WIDTH : width,
    dragging,
    onResizeStart,
  };
}
