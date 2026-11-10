import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLabelTip } from '@/components/ui';

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
  // In the narrow rail there's no text, so the label appears on hover.
  const tip = useLabelTip<HTMLAnchorElement>(label, { side: 'right', detail: hasBadge ? String(badge) : undefined, disabled: !collapsed });
  return (
    <>
    <NavLink
      to={to}
      ref={tip.ref}
      {...tip.bind}
      aria-describedby={tip.describedBy}
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
    {tip.tip}
    </>
  );
}

/** A run of nav items, stacked one under the other. Sections are not labelled,
 *  foldable or divided — the sidebar is one plain list. */
export function NavGroup({ children }: { children: ReactNode }) {
  return <div className="space-y-0.5">{children}</div>;
}
