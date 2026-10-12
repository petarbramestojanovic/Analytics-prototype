import { NavLink } from 'react-router-dom';
import { useId, type ReactNode } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-brame-lime/70';

function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto flex h-4 min-w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
      {count}
    </span>
  );
}

export function NavItem({
  to,
  label,
  icon: Icon,
  collapsed,
  badge,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
  badge?: number;
}) {
  const hasBadge = !!badge && badge > 0;
  return (
    <NavLink
      to={to}
      title={collapsed ? (hasBadge ? `${label} (${badge})` : label) : undefined}
      className={({ isActive }) =>
        cn(
          // Inset pill; the active one gets a lime bar pinned to its left edge.
          'relative mx-2 flex items-center gap-3 rounded-lg py-2 text-sm motion-safe:transition-colors',
          focusRing,
          collapsed ? 'justify-center px-0' : 'px-3',
          isActive
            ? 'bg-white/10 font-semibold text-brame-lime before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-brame-lime'
            : 'font-medium text-white/80 hover:bg-white/5 hover:text-white'
        )
      }
    >
      <span className="relative flex-shrink-0">
        <Icon size={18} />
        {collapsed && hasBadge && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-brame-teal" />
        )}
      </span>
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {hasBadge && <CountBadge count={badge} />}
        </>
      )}
    </NavLink>
  );
}

const sectionLabel = 'text-[10px] font-semibold uppercase tracking-widest text-brame-lime/60';

/**
 * A labelled group of nav items. Collapsible groups fold behind their header
 * (showing the group's combined badge while folded); in the collapsed rail
 * every group is a plain divider-separated icon list, since there's no room
 * for a header to unfold.
 */
export function NavSection({
  label,
  collapsed,
  first = false,
  collapsible,
  open,
  onToggle,
  badge,
  children,
}: {
  label: string;
  collapsed: boolean;
  first?: boolean;
  collapsible: boolean;
  open: boolean;
  onToggle: () => void;
  /** Combined count of the group's item badges — shown only while folded. */
  badge?: number;
  children: ReactNode;
}) {
  const bodyId = useId();

  if (collapsed) {
    return (
      <>
        {!first && <div className="mx-4 my-3 border-t border-brame-teal-light" />}
        <div className="space-y-0.5">{children}</div>
      </>
    );
  }

  if (!collapsible) {
    return (
      <div className={cn(!first && 'pt-3')}>
        <div className={cn('px-5 pb-1.5', sectionLabel)}>{label}</div>
        <div className="space-y-0.5">{children}</div>
      </div>
    );
  }

  return (
    <div className={cn(!first && 'pt-3')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className={cn(
          'mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-lg px-3 py-1.5 text-left hover:bg-white/5 motion-safe:transition-colors',
          focusRing
        )}
      >
        <span className={cn('truncate', sectionLabel)}>{label}</span>
        {!open && !!badge && badge > 0 && <CountBadge count={badge} />}
        <ChevronRight
          size={14}
          className={cn(
            'flex-shrink-0 text-brame-lime/60 motion-safe:transition-transform',
            (open || !badge) && 'ml-auto',
            open && 'rotate-90'
          )}
        />
      </button>
      {/* 0fr → 1fr animates to the content's natural height without measuring. */}
      <div
        id={bodyId}
        inert={!open}
        className={cn(
          'grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          {/* Padding lives inside the clip so a folded group is truly 0px tall;
              it keeps the focus ring of the first/last item unclipped. */}
          <div className="space-y-0.5 py-0.5">{children}</div>
        </div>
      </div>
    </div>
  );
}
