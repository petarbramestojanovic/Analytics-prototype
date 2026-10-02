import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui';

/** A square icon tile — teal when the thing it represents is active. */
export function IconBadge({ icon, active = true, className }: { icon: ReactNode; active?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-shrink-0 items-center justify-center rounded-lg p-2',
        active
          ? 'bg-brame-teal/10 text-brame-teal dark:bg-brame-teal/20 dark:text-brame-turquoise-light'
          : 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500',
        className
      )}
    >
      {icon}
    </div>
  );
}

/**
 * One saved thing in a card list — an email report, an alert rule: icon,
 * title with badges, detail lines, and its own actions on the right.
 */
export function ItemCard({
  icon,
  active = true,
  title,
  badges,
  children,
  actions,
}: {
  icon: ReactNode;
  active?: boolean;
  title: ReactNode;
  badges?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <IconBadge icon={icon} active={active} className="mt-0.5" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-brame-dark dark:text-gray-100">{title}</span>
              {badges}
            </div>
            {children}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </Card>
  );
}

/** The dashed placeholder a card list shows when it has nothing in it. */
export function EmptyCard({ children }: { children: ReactNode }) {
  return (
    <Card className="border-dashed text-center dark:border-white/15">
      <p className="py-6 text-sm text-gray-500 dark:text-gray-400">{children}</p>
    </Card>
  );
}
