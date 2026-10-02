import type { ReactNode } from 'react';
import { Card } from '@/components/ui';

/** One connector's status card — name, a one-line description, the cadence
 *  badge, then whatever coverage/sync detail the connector has. */
export function ConnectorCard({
  name,
  description,
  badge,
  children,
}: {
  name: string;
  description: string;
  badge: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-brame-dark dark:text-gray-100">{name}</div>
          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</div>
        </div>
        {badge}
      </div>
      {children}
    </Card>
  );
}
