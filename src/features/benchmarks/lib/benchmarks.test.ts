import { describe, expect, it } from 'vitest';
import type { BenchmarkCampaign, BenchmarkCreative } from '@/types';
import { benchmarkContext, buildLadder, crossCompareByMarket, groupMechanics, meetsSample } from './benchmarks';

const NOW = new Date('2026-10-28T09:00:00+01:00');

let seq = 0;
const bm = (over: Partial<BenchmarkCampaign>): BenchmarkCampaign => ({
  id: `c${seq++}`,
  name: 'Campaign',
  companyId: 'co-a',
  companyName: 'A',
  industry: 'Automotive',
  agencyId: null,
  agencyName: null,
  market: 'AT',
  flightStart: '2026-08-01',
  flightEnd: '2026-09-01',
  activeDays: 20,
  impressions: 1_000_000,
  ctr: 0.01,
  viewability: 0.8,
  engagementRate: 0.05,
  deliveryPacing: 1,
  deliveryHealth: 'good',
  ...over,
});

describe('buildLadder', () => {
  const pool = [
    bm({ id: 'a1', companyId: 'co-a', market: 'AT', engagementRate: 0.06 }),
    bm({ id: 'a2', companyId: 'co-a', market: 'DE', engagementRate: 0.04 }),
    bm({ id: 'b1', companyId: 'co-b', companyName: 'B', industry: 'Retail', market: 'AT', engagementRate: 0.08 }),
  ];

  it('puts a campaign next to its client, industry, market and BRAME averages', () => {
    const rows = buildLadder(pool, 'campaign', 'engagementRate', NOW);
    const a1 = rows.find((r) => r.key === 'a1')!;
    expect(a1.value).toBe(0.06);
    expect(a1.client?.avg).toBeCloseTo(0.05);
    expect(a1.industry?.avg).toBeCloseTo(0.05);
    expect(a1.market?.avg).toBeCloseTo(0.07);
    expect(a1.brame?.avg).toBeCloseTo(0.06);
  });

  it('sorts best first and drops campaigns that do not measure the metric', () => {
    const rows = buildLadder([...pool, bm({ id: 'x', engagementRate: null })], 'campaign', 'engagementRate', NOW);
    expect(rows.map((r) => r.key)).toEqual(['b1', 'a1', 'a2']);
  });

  it('has no market column for a client row', () => {
    const [first] = buildLadder(pool, 'client', 'engagementRate', NOW);
    expect(first.key).toBe('co-b');
    expect(first.market).toBeNull();
  });
});

describe('crossCompareByMarket', () => {
  it('splits one industry by market', () => {
    const pool = [
      bm({ market: 'AT', engagementRate: 0.06 }),
      bm({ market: 'AT', engagementRate: 0.08 }),
      bm({ market: 'DE', engagementRate: 0.04 }),
      bm({ companyId: 'co-b', industry: 'Retail', market: 'DE', engagementRate: 0.1 }),
    ];
    const result = crossCompareByMarket(pool, { dimension: 'industry', key: 'Automotive' }, NOW);
    expect(result.columns.map((c) => c.market)).toEqual(['AT', 'DE']);
    expect(result.columns[0].stats.engagementRate?.avg).toBeCloseTo(0.07);
    expect(result.columns[1].campaigns).toBe(1);
    expect(result.brame.engagementRate?.n).toBe(4);
  });
});

describe('benchmarkContext', () => {
  const pool = [bm({ companyId: 'co-a' }), bm({ companyId: 'co-b', companyName: 'B' })];

  it('leaves BRAME out unless asked, so clients never see it', () => {
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
      [creative({}), creative({ mechanic: 'Carousel' }), creative({ mechanic: 'Brand New Mechanic' })],
      NOW
    );
    expect(groups.map((g) => g.mechanic).sort()).toEqual(['Brand New Mechanic', 'Carousel', 'Tap to Reveal']);
  });

  it('lets one campaign run several mechanics', () => {
    const groups = groupMechanics(
      [creative({ mechanic: 'Tap to Reveal', format: '300x250' }), creative({ mechanic: 'Matchmaker', format: '320x480' })],
      NOW
    );
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.campaignCount === 1)).toBe(true);
  });

  it('counts creatives and distinct campaigns separately', () => {
    const [g] = groupMechanics(
      [creative({ campaignId: 'k1' }), creative({ campaignId: 'k1', format: '320x480' }), creative({ campaignId: 'k2' })],
      NOW
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
