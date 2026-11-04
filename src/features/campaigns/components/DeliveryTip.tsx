import type { ReactNode } from 'react';
import { useI18n } from '@/i18n';
import { fmtPct } from '@/lib/format';
import { cn } from '@/lib/cn';
import { FloatingTip, TipRow, TipText, TipTitle } from '@/components/ui';
import type { DeliveryHealth } from '@/types';
import { DELIVERY_HEALTH_BAR_CLASS } from '../lib/delivery';

/** The hover card behind every delivery bar: the pace status (the colour,
 *  spelled out — colour alone isn't accessible) and the two numbers it was
 *  judged on. Wraps `children` as the trigger. */
export function DeliveryTip({
  pacing,
  health,
  expectedPacing,
  side,
  children,
  className,
}: {
  pacing: number;
  health: DeliveryHealth | null;
  expectedPacing: number | null;
  side?: 'top' | 'bottom';
  children: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <FloatingTip
      side={side}
      focusable
      className={className}
      content={
        <>
          <TipTitle>
            {health && <span className={cn('h-2 w-2 flex-shrink-0 rounded-full', DELIVERY_HEALTH_BAR_CLASS[health])} />}
            {health ? t(`delivery.status.${health}`) : t('campaigns.col.delivery')}
          </TipTitle>
          <TipText>{health ? t(`delivery.health.${health}`) : t('delivery.help')}</TipText>
          <TipRow label={t('delivery.delivered')} value={fmtPct(pacing, 0)} />
          {expectedPacing != null && <TipRow label={t('delivery.expectedLabel')} value={fmtPct(expectedPacing, 0)} />}
        </>
      }
    >
      {children}
    </FloatingTip>
  );
}
