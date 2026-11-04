import type { Campaign, DeliveryHealth } from '@/types';
import type { PillTone } from '@/components/ui';
import { primarySeries } from './sources';

export type { DeliveryHealth };

/**
 * Delivery has two separate reads, and they must not be confused:
 *  - the **percentage** is the current status — delivered impressions (the
 *    primary source's own count, same rule as everywhere else) ÷ what
 *    Salesforce booked;
 *  - the **colour** is the trend — `campaign.delivery.health`, the backend's
 *    judgement of that percentage against how much of the runtime has
 *    elapsed. 50% after day 5 of 10 is green; 50% on day 7 (target 70%) is
 *    not. The UI never derives the colour from the percentage.
 */
export function deliveryPacing(campaign: Campaign): number | null {
  const series = primarySeries(campaign);
  if (!series?.totals.impressions || !campaign.salesforce.bookedImpressions) return null;
  return series.totals.impressions / campaign.salesforce.bookedImpressions;
}

export const DELIVERY_HEALTH_TONE: Record<DeliveryHealth, PillTone> = {
  good: 'green',
  okay: 'amber',
  poor: 'red',
};

export const DELIVERY_HEALTH_BAR_CLASS: Record<DeliveryHealth, string> = {
  good: 'bg-green-500',
  okay: 'bg-amber-400',
  poor: 'bg-red-500',
};
