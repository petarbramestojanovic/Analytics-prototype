import type { Campaign } from '@/types';
import type { PillTone } from '@/components/ui';
import { primarySeries } from './sources';

/**
 * How good a campaign's delivery is — delivered impressions (its primary
 * source's own count, same rule as everywhere else) against what Salesforce
 * booked. A single, reused judgment call so the color never disagrees
 * between the Campaigns list, Overview and Campaign Details.
 */
export type DeliveryHealth = 'good' | 'okay' | 'poor';

const GOOD_THRESHOLD = 0.8;
const OKAY_THRESHOLD = 0.5;

export function deliveryPacing(campaign: Campaign): number | null {
  const series = primarySeries(campaign);
  if (!series?.totals.impressions || !campaign.salesforce.bookedImpressions) return null;
  return series.totals.impressions / campaign.salesforce.bookedImpressions;
}

export function deliveryHealth(pacing: number | null): DeliveryHealth | null {
  if (pacing == null) return null;
  if (pacing >= GOOD_THRESHOLD) return 'good';
  if (pacing >= OKAY_THRESHOLD) return 'okay';
  return 'poor';
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
