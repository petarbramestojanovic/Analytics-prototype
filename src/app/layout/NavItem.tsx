import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

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
          'flex w-full items-center gap-3 py-2.5 transition-colors',
          collapsed ? 'justify-center px-0' : 'px-4',
          isActive ? 'bg-brame-teal-dark text-brame-lime' : 'text-white hover:bg-brame-teal-light'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative flex-shrink-0">
            <Icon size={18} className={isActive ? 'text-brame-lime' : ''} />
            {collapsed && hasBadge && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-brame-teal" />
            )}
          </span>
          {!collapsed && (
            <>
              <span className="truncate text-sm font-medium">{label}</span>
              {hasBadge && (
                <span className="ml-auto flex h-4 min-w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {badge}
                </span>
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  );
}

/** A labelled group of nav items — the label becomes a divider when the
 *  rail is collapsed. */
export function NavSection({
  label,
  collapsed,
  first = false,
  children,
}: {
  label: string;
  collapsed: boolean;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {collapsed ? (
        !first && <div className="mx-4 my-4 border-t border-brame-teal-light" />
      ) : (
        <div
          className={cn(
            'px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-brame-lime/60',
            !first && 'pt-5'
          )}
        >
          {label}
        </div>
      )}
      {children}
    </>
  );
}
