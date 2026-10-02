import type { ReactNode } from 'react';
import { Rows3, Star, Unplug } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useSlidingIndicator } from '@/hooks/useSlidingIndicator';
import { cn } from '@/lib/cn';
import type { Campaign, SourceKey } from '@/types';
import { SOURCE_KEYS, sourceMeta } from '../lib/sources';

export type SourceTab = SourceKey | 'compare';

/**
 * RFC §4 rule 3 made visible. The headline belongs to exactly one source; the
 * others are checks you switch into. Nothing here adds two sources together,
 * and the tab strip is deliberately the loudest thing on the page so nobody
 * reads a number without knowing who counted it.
 *
 * The active fill is a single indicator sliding behind the tabs (measured off
 * the active tab's own box, same technique as SegmentedControl) rather than
 * each button repainting its own background.
 */
export function SourceSwitcher({
  campaign,
  active,
  onChange,
}: {
  campaign: Campaign;
  active: SourceTab;
  onChange: (t: SourceTab) => void;
}) {
  const { t } = useI18n();
  const { trackRef, rect } = useSlidingIndicator(active, 'source-tab');
  const order = [campaign.primarySource, ...SOURCE_KEYS.filter((s) => s !== campaign.primarySource)];

  return (
    <div ref={trackRef} className="relative flex flex-wrap items-center gap-2">
      {rect && (
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute left-0 top-0 rounded-xl shadow-sm transition-[transform,width,height,background-color] duration-200 ease-out',
            active === 'compare' ? 'bg-brame-purple' : 'bg-brame-teal'
          )}
          style={{ transform: `translate(${rect.left}px, ${rect.top}px)`, width: rect.width, height: rect.height }}
        />
      )}

      {order.map((key) => {
        const meta = sourceMeta(campaign, key);
        const isPrimary = key === campaign.primarySource;
        const isActive = active === key;
        const missing = meta.connector === 'not_configured';
        const role = isPrimary ? t('source.primarySource') : t('source.check');

        return (
          <SwitcherTab
            key={key}
            tab={key}
            active={isActive}
            onClick={() => onChange(key)}
            ariaLabel={`${meta.fullLabel} — ${role}${missing ? `, ${t('source.noConnector')}` : ''}`}
            title={
              <>
                {isPrimary && (
                  <Star size={12} className={isActive ? 'text-brame-lime' : 'text-brame-teal'} fill="currentColor" />
                )}
                {meta.label}
                {missing && <Unplug size={12} className={isActive ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'} />}
              </>
            }
            subtitle={missing ? t('source.noConnector') : role}
          />
        );
      })}

      <div className="mx-1 h-8 w-px bg-gray-200 dark:bg-white/10" />

      <SwitcherTab
        tab="compare"
        active={active === 'compare'}
        onClick={() => onChange('compare')}
        ariaLabel={t('source.compare')}
        icon={<Rows3 size={14} className={active === 'compare' ? 'text-white' : 'text-brame-purple'} />}
        title={t('source.compare')}
        subtitle={t('source.compareSub')}
      />
    </div>
  );
}

function SwitcherTab({
  tab,
  active,
  onClick,
  ariaLabel,
  icon,
  title,
  subtitle,
}: {
  tab: SourceTab;
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  icon?: ReactNode;
  title: ReactNode;
  subtitle: ReactNode;
}) {
  return (
    <button
      data-source-tab={tab}
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        'relative z-10 flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors',
        active
          ? 'border-transparent'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-brame-dark-light dark:hover:border-white/20 dark:hover:bg-white/5'
      )}
    >
      {icon}
      <div>
        <div
          className={cn(
            'flex items-center gap-1.5 text-sm font-semibold',
            active ? 'text-white' : 'text-brame-dark dark:text-gray-100'
          )}
        >
          {title}
        </div>
        <div className={cn('mt-0.5 text-[11px]', active ? 'text-white/75' : 'text-gray-500 dark:text-gray-400')}>
          {subtitle}
        </div>
      </div>
    </button>
  );
}
