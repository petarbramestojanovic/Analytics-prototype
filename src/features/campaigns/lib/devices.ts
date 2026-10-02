import type { Campaign, SourceSeries } from '@/types';

/**
 * Mobile vs. desktop split of a campaign's delivered impressions — Tablet is
 * folded into Desktop so the split matches the Total/Mobile/Desktop tabs on
 * Campaign Details, which only ever offer those two device buckets.
 * Impressions-based, per the same "delivery" numbers the rest of the app
 * keys off — never a separate, unrelated device metric.
 */
export interface DeviceSplit {
  mobile: number;
  desktop: number;
}

export function deviceSplit(campaign: Campaign): DeviceSplit | null {
  const total = campaign.devices.reduce((sum, d) => sum + d.impressions, 0);
  if (!total) return null;
  const mobile = campaign.devices.find((d) => d.device === 'Mobile')?.impressions ?? 0;
  return { mobile: mobile / total, desktop: (total - mobile) / total };
}

/** Impression-weighted average of a rate (viewability, engagementRate) across
 *  a set of device rows — used to fold Tablet into Desktop without just
 *  averaging the two rates unweighted. */
export function weightedDeviceRate(
  rows: Campaign['devices'],
  metric: 'viewability' | 'engagementRate'
): number {
  const total = rows.reduce((sum, d) => sum + d.impressions, 0);
  if (!total) return 0;
  return rows.reduce((sum, d) => sum + d[metric] * d.impressions, 0) / total;
}

export type DeviceTab = 'total' | 'mobile' | 'desktop';

/**
 * Splits a source's own series by device for the Total/Mobile/Desktop tabs on
 * Campaign Details. There's no real per-day, per-device delivery in the mock
 * data, so volume metrics (impressions, plays, ctaClicks, uniqueUsers) are
 * scaled by that device's share of total impressions, while rate metrics
 * (viewability, engagementRate) switch to the actual per-device rate already
 * on `campaign.devices` rather than just being scaled along with volume.
 * CTR and dwell/completion have no per-device breakdown to switch to, so
 * those rates carry over unchanged.
 */
export function scaleSeriesForDevice(series: SourceSeries, campaign: Campaign, tab: DeviceTab): SourceSeries {
  if (tab === 'total') return series;
  const split = deviceSplit(campaign);
  if (!split) return series;
  const share = tab === 'mobile' ? split.mobile : split.desktop;
  const rows = tab === 'mobile' ? campaign.devices.filter((d) => d.device === 'Mobile') : campaign.devices.filter((d) => d.device !== 'Mobile');
  const viewability = weightedDeviceRate(rows, 'viewability');
  const engagementRate = weightedDeviceRate(rows, 'engagementRate');

  const daily = series.daily.map((d) => ({
    ...d,
    impressions: Math.round(d.impressions * share),
    viewable: Math.round(d.impressions * share * viewability),
    plays: Math.round(d.plays * share),
    engagements: Math.round(d.impressions * share * engagementRate),
    ctaClicks: Math.round(d.ctaClicks * share),
    uniqueUsers: Math.round(d.uniqueUsers * share),
  }));

  const scaledImpressions = series.totals.impressions != null ? Math.round(series.totals.impressions * share) : undefined;
  const totals: SourceSeries['totals'] = { ...series.totals };
  if (totals.impressions != null) totals.impressions = scaledImpressions;
  if (totals.viewable != null) totals.viewable = scaledImpressions != null ? Math.round(scaledImpressions * viewability) : undefined;
  if (totals.viewability != null) totals.viewability = viewability;
  if (totals.plays != null) totals.plays = Math.round(totals.plays * share);
  if (totals.engagementRate != null) totals.engagementRate = engagementRate;
  if (totals.ctaClicks != null) totals.ctaClicks = Math.round(totals.ctaClicks * share);
  if (totals.uniqueUsers != null) totals.uniqueUsers = Math.round(totals.uniqueUsers * share);
  // ctr, avgDwell, completionRate: rates with no per-device breakdown to
  // switch to, so they carry over from the campaign's overall totals.

  return { totals, daily };
}
