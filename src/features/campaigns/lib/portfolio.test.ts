import { describe, expect, it } from 'vitest';
import type { Campaign, DailyPoint } from '@/types';
import { buildPortfolioSummary } from './portfolio';

const day = (date: string, impressions: number, engagements: number): DailyPoint => ({
  date,
  impressions,
  viewable: Math.round(impressions * 0.8),
  plays: 0,
  engagements,
  ctaClicks: Math.round(engagements * 0.1),
  avgDwell: 0,
  uniqueUsers: 0,
});

const campaign = (id: string, status: Campaign['status'], daily: DailyPoint[]) =>
  ({
    id,
    status,
    primarySource: 'custom',
    salesforce: { bookedImpressions: 1_000_000 },
    sources: { atk: null, nexd: null, custom: { totals: { impressions: 1, engagementRate: 0, ctr: 0, viewability: 0 }, daily } },
  }) as unknown as Campaign;

const TODAY = new Date('2026-10-28T09:00:00+01:00');

describe('buildPortfolioSummary with a range', () => {
  const a = campaign('a', 'live', [day('2026-09-01', 1000, 100), day('2026-10-01', 1000, 50)]);
  const b = campaign('b', 'ended', [day('2026-06-01', 1000, 80)]);

  it('counts only campaigns that delivered inside the range', () => {
    const summary = buildPortfolioSummary([a, b], TODAY, { start: '2026-09-15', end: '2026-10-28' });
    expect(summary.campaignCount).toBe(1);
    expect(summary.liveCount).toBe(1);
  });

  it('judges a campaign on its days inside the range', () => {
    const summary = buildPortfolioSummary([a], TODAY, { start: '2026-09-01', end: '2026-09-30' });
    expect(summary.avgEngagementRate).toBeCloseTo(0.1);
    const both = buildPortfolioSummary([a], TODAY, { start: '2026-09-01', end: '2026-10-31' });
    expect(both.avgEngagementRate).toBeCloseTo(0.075);
  });

  it('is empty when nothing delivered in the range', () => {
    const summary = buildPortfolioSummary([a, b], TODAY, { start: '2025-01-01', end: '2025-12-31' });
    expect(summary.campaignCount).toBe(0);
    expect(summary.avgCtr).toBeNull();
  });
});
