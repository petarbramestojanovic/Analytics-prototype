import { describe, expect, it } from 'vitest';
import type { BenchmarkCampaign, BenchmarkCreative } from '@/types';
import {
  benchmarkContext,
  DIRECT_ACCOUNT_KEY,
  groupMechanics,
  marketSplit,
  meetsSample,
  rankBuckets,
  sliceStats,
} from './benchmarks';

const NOW = new Date('2026-10-28T09:00:00+01:00');

let seq = 0;
const bm = (over: Partial<BenchmarkCampaign>): BenchmarkCampaign => ({
  id: `c${seq++}`,
  name: 'Campaign',
  companyId: 'co-a',
  companyName: 'A',
  industry: 'Automotive',
  accountId: null,
  accountName: null,
  market: 'AT',
  flightStart: '2026-08-01',
  flightEnd: '2026-09-01',
  activeDays: 20,
  impressions: 1_000_000,
  ctr: 0.01,
  viewability: 0.8,
  engagementRate: 0.05,
  deliveryPacing: 1,
  ctaClicks: null,
  deliveryHealth: 'good',
  ...over,
});

describe('sliceStats', () => {
  const pool = [
    bm({ id: 'a1', market: 'AT', engagementRate: 0.06 }),
    bm({ id: 'a2', market: 'AT', engagementRate: 0.08 }),
    bm({ id: 'a3', market: 'DE', engagementRate: 0.04 }),
    bm({ id: 'b1', companyId: 'co-b', industry: 'Retail', market: 'DE', engagementRate: 0.1 }),
  ];

  it('averages every campaign in all the given buckets at once', () => {
    const stats = sliceStats(pool, NOW, [
      { dim: 'industry', value: 'Automotive' },
      { dim: 'market', value: 'AT' },
    ]);
    expect(stats.engagementRate?.avg).toBeCloseTo(0.07);
    expect(stats.engagementRate?.n).toBe(2);
  });

  it('is all of KLEA with no buckets', () => {
    expect(sliceStats(pool, NOW, []).engagementRate?.n).toBe(4);
  });

  it('leaves the campaign being judged out of its own benchmark', () => {
    const stats = sliceStats(pool, NOW, [{ dim: 'market', value: 'AT' }], 'a1');
    expect(stats.engagementRate?.n).toBe(1);
    expect(stats.engagementRate?.avg).toBeCloseTo(0.08);
  });

  it('puts direct bookings in one bucket of their own', () => {
    const direct = [bm({ id: 'd1' }), bm({ id: 'd2', accountId: 'ag-x', accountName: 'X' })];
    expect(sliceStats(direct, NOW, [{ dim: 'account', value: DIRECT_ACCOUNT_KEY }]).ctr?.n).toBe(1);
  });
});

describe('rankBuckets', () => {
  it('ranks buckets best first and drops those under the sample floor', () => {
    const pool = [
      ...[0.05, 0.05, 0.05].map((engagementRate) => bm({ market: 'AT', engagementRate })),
      ...[0.07, 0.07, 0.07].map((engagementRate) => bm({ market: 'DE', engagementRate })),
      bm({ market: 'FR', engagementRate: 0.2 }),
    ];
    const ranked = rankBuckets(pool, NOW, 'market', 'engagementRate');
    expect(ranked.map((r) => r.key)).toEqual(['DE', 'AT']);
  });

  it('follows a chosen period and markets instead of the rolling window', () => {
    const pool = [
      ...[0.05, 0.05, 0.05].map((engagementRate) =>
        bm({ market: 'AT', engagementRate, flightStart: '2026-10-05', flightEnd: '2026-10-20' }),
      ),
      ...[0.07, 0.07, 0.07].map((engagementRate) =>
        bm({ market: 'DE', engagementRate, flightStart: '2026-02-01', flightEnd: '2026-02-20' }),
      ),
    ];
    const q4 = { range: { start: '2026-10-01', end: '2026-12-31' } };
    expect(rankBuckets(pool, NOW, 'market', 'engagementRate', q4).map((r) => r.key)).toEqual(['AT']);
    expect(
      rankBuckets(pool, NOW, 'market', 'engagementRate', { markets: ['DE'] }).map((r) => r.key),
    ).toEqual(['DE']);
    expect(sliceStats(pool, NOW, [], undefined, q4).engagementRate?.avg).toBeCloseTo(0.05);
  });
});

describe('marketSplit', () => {
  const pool = [
    bm({ market: 'AT', ctaClicks: 100 }),
    bm({ market: 'AT', ctaClicks: 300 }),
    bm({ market: 'DE', ctaClicks: 50 }),
    bm({ companyId: 'co-b', industry: 'Retail', market: 'DE', ctaClicks: 900 }),
  ];

  it('splits everything by market, with clicks averaged per campaign', () => {
    const { rows, all } = marketSplit(pool, NOW);
    expect(rows.map((r) => r.market)).toEqual(['AT', 'DE']);
    expect(rows[0].clicks?.avg).toBe(200);
    expect(all.ctr?.n).toBe(4);
  });

  it('can be narrowed to some industries', () => {
    const { rows } = marketSplit(pool, NOW, ['Automotive']);
    expect(rows.find((r) => r.market === 'DE')?.campaigns).toBe(1);
  });
});

describe('benchmarkContext', () => {
  const pool = [bm({ companyId: 'co-a' }), bm({ companyId: 'co-b', companyName: 'B' })];

  it('leaves KLEA out unless asked, so clients never see it', () => {
    expect(benchmarkContext(pool, 'co-a', NOW, false).brame).toBeNull();
    expect(benchmarkContext(pool, 'co-a', NOW, true).brame).not.toBeNull();
  });

  it('finds the client and its industry', () => {
    const ctx = benchmarkContext(pool, 'co-a', NOW, false);
    expect(ctx.industryName).toBe('Automotive');
    expect(ctx.client.ctr?.n).toBe(1);
    expect(ctx.industry.ctr?.n).toBe(2);
  });
});

describe('mechanics', () => {
  const creative = (over: Partial<BenchmarkCreative>): BenchmarkCreative => ({
    id: `cr${seq++}`,
    campaignId: 'k1',
    campaignName: 'K',
    companyId: 'co-a',
    companyName: 'A',
    industry: 'Automotive',
    market: 'AT',
    format: '300x250',
    mechanic: 'Tap to Reveal',
    flightStart: '2026-08-01',
    flightEnd: '2026-09-01',
    activeDays: 20,
    impressions: 100_000,
    ctr: 0.01,
    viewability: 0.8,
    engagementRate: 0.05,
    ...over,
  });

  it('groups creatives by whatever mechanics the data holds, including new ones', () => {
    const groups = groupMechanics(
      [
        creative({}),
        creative({ mechanic: 'Carousel' }),
        creative({ mechanic: 'Brand New Mechanic' }),
      ],
      NOW,
    );
    expect(groups.map((g) => g.mechanic).sort()).toEqual([
      'Brand New Mechanic',
      'Carousel',
      'Tap to Reveal',
    ]);
  });

  it('lets one campaign run several mechanics', () => {
    const groups = groupMechanics(
      [
        creative({ mechanic: 'Tap to Reveal', format: '300x250' }),
        creative({ mechanic: 'Matchmaker', format: '320x480' }),
      ],
      NOW,
    );
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.campaignCount === 1)).toBe(true);
  });

  it('counts creatives and distinct campaigns separately', () => {
    const [g] = groupMechanics(
      [
        creative({ campaignId: 'k1' }),
        creative({ campaignId: 'k1', format: '320x480' }),
        creative({ campaignId: 'k2' }),
      ],
      NOW,
    );
    expect(g.creativeCount).toBe(3);
    expect(g.campaignCount).toBe(2);
  });
});

describe('meetsSample', () => {
  it('needs at least three campaigns', () => {
    expect(meetsSample({ avg: 1, p50: 1, p75: 1, p90: 1, n: 2 })).toBe(false);
    expect(meetsSample({ avg: 1, p50: 1, p75: 1, p90: 1, n: 3 })).toBe(true);
    expect(meetsSample(null)).toBe(false);
  });
});
