import type { ReactNode } from 'react';
import { StatTile } from '@/components/display';
import { Tooltip } from '@/components/ui';

/**
 * A headline number on a campaign's source view: a StatTile whose help tooltip
 * is hidden on a phone — hover help does nothing on touch, and it crowds the
 * icon. `emphasis` fills it deep teal, as the lead card of a row.
 */
export function KpiWidget({
  label,
  help,
  value,
  icon,
  footnote,
  emphasis = false,
}: {
  label: string;
  help?: string;
  value: ReactNode;
  icon?: ReactNode;
  footnote?: string;
  emphasis?: boolean;
}) {
  return (
    <StatTile
      tone={emphasis ? 'emphasis' : 'default'}
      label={
        <span className="flex items-center gap-1.5">
          {label}
          {help && (
            <span className="hidden sm:inline-flex">
              <Tooltip text={help} />
            </span>
          )}
        </span>
      }
      value={value}
      icon={icon}
      footnote={footnote}
    />
  );
}
