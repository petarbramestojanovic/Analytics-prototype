import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/cn';

type Align = 'left' | 'center' | 'right';

const alignClass: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/** A full-width table inside a horizontal-scroll wrapper — the shape of
 *  every data table in the app. */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <TableScroll className={className}>
      <table className="w-full">{children}</table>
    </TableScroll>
  );
}

/**
 * Horizontal-scroll wrapper with a fade on whichever edge still has content
 * to scroll toward — without it, a table cut off at a card's edge on a narrow
 * viewport reads as "that's all the columns" rather than "scroll for more".
 * Prefer `Table`; use this directly only around something that isn't a plain
 * `<table>` (e.g. a loading state that replaces it).
 */
export function TableScroll({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    update();
    el.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [children]);

  return (
    <div className="relative">
      <div ref={ref} className={cn('overflow-x-auto', className)}>
        {children}
      </div>
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent transition-opacity dark:from-brame-dark-light',
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent transition-opacity dark:from-brame-dark-light',
          canScrollRight ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
}

export function Th({
  children,
  align = 'left',
  className = '',
}: {
  children?: ReactNode;
  align?: Align;
  className?: string;
}) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-gray-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-white/10 dark:text-gray-400',
        alignClass[align],
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = 'left',
  className = '',
}: {
  children?: ReactNode;
  align?: Align;
  className?: string;
}) {
  return (
    <td
      className={cn(
        'border-b border-gray-100 px-4 py-3 text-sm dark:border-white/5',
        align === 'right' && 'tnum',
        alignClass[align],
        className
      )}
    >
      {children}
    </td>
  );
}

/** A body row with the standard hover highlight. */
export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn('transition-colors hover:bg-gray-50 dark:hover:bg-white/5', className)}>{children}</tr>;
}

/** The single full-width row a table body shows when it has nothing to list. */
export function TableEmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        {children}
      </td>
    </tr>
  );
}

/** The direction chevron a sortable header shows. */
export function SortIndicator({ direction }: { direction: 'asc' | 'desc' | false }) {
  if (direction === 'asc') return <ArrowUp size={11} />;
  if (direction === 'desc') return <ArrowDown size={11} />;
  return <ArrowUpDown size={11} className="text-gray-300 dark:text-gray-600" />;
}

/** The clickable label inside a sortable header cell. */
export function SortButton({
  children,
  direction,
  onClick,
}: {
  children: ReactNode;
  direction: 'asc' | 'desc' | false;
  onClick?: (event: unknown) => void;
}) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-brame-dark dark:hover:text-gray-200">
      {children}
      <SortIndicator direction={direction} />
    </button>
  );
}

/** Sortable column header. Generic over any sort-key type so callers keep
 *  their own comparator logic; this only owns the toggle affordance. */
export function SortableTh<K extends string>({
  children,
  col,
  sort,
  onToggle,
  align = 'left',
}: {
  children: ReactNode;
  col: K;
  sort: { key: K; desc: boolean };
  onToggle: (col: K) => void;
  align?: Align;
}) {
  return (
    <Th align={align}>
      <SortButton direction={sort.key === col ? (sort.desc ? 'desc' : 'asc') : false} onClick={() => onToggle(col)}>
        {children}
      </SortButton>
    </Th>
  );
}
