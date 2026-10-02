import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * One selectable row in a master–detail list (seats, campaigns in setup):
 * optional icon tile, title, subtitle. The selected row is tinted teal.
 */
export function ListItemButton({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-0 dark:border-white/5',
        active ? 'bg-brame-teal/5 dark:bg-brame-teal/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'
      )}
    >
      {icon && (
        <div
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
            active ? 'bg-brame-teal text-white' : 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500'
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <div
          className={cn(
            'truncate text-sm font-medium',
            active ? 'text-brame-teal dark:text-brame-turquoise-light' : 'text-brame-dark dark:text-gray-100'
          )}
        >
          {title}
        </div>
        {subtitle && <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{subtitle}</div>}
      </div>
    </button>
  );
}
