import { describe, expect, it } from 'vitest';
import type { BenchmarkCampaign } from '@/types';
import { columnStats, resolveColumn } from './compareColumns';
import { findCampaign, findSegment } from './compareSubject';
import { campaignColumn, mixColumn } from './compareViews';

const NOW = new Date('2026-10-28');
const c = (id: string, market: string, ctr: number, over: Partial<BenchmarkCampaign> = {}) =>
  ({
    id,
    name: id,
    companyId: 'audi',
    companyName: 'Audi',
    industry: 'Automotive',
    accountId: null,
    accountName: null,
    market,
    flightStart: '2026-09-01',
    flightEnd: '2026-10-20',
    activeDays: 30,
    impressions: 1_000_000,
    ctr,
    viewability: 0.8,
    engagementRate: 0.05,
    ...over,
  }) as BenchmarkCampaign;

const pool = [
  c('de1', 'DE', 0.01),
  c('de2', 'DE', 0.012),
  c('de3', 'DE', 0.014),
  c('de4', 'DE', 0.016),
  c('at1', 'AT', 0.02),
  c('fr1', 'FR', 0.01, { companyId: 'other', companyName: 'Other' }),
];

const sameClientAt = mixColumn([
  { dim: 'client', value: null, label: '' },
  { dim: 'market', value: 'AT', label: 'AT' },
]);

describe('combined columns against a campaign pick', () => {
  const pick = findCampaign(pool, 'de1')!;

  it('resolves "same client × market AT" to that client in that market', () => {
    const r = resolveColumn(sameClientAt, pick, pool)!;
    expect(r).toEqual({
      kind: 'slice',
      // Cuts keep their fixed order (industry, market, client, account).
      parts: [
        { dim: 'market', value: 'AT' },
        { dim: 'client', value: 'audi' },
      ],
    });
    // One Audi AT campaign: below the 3-campaign floor, so no benchmark number.
    expect(columnStats(r, pick, pool, NOW).stats.ctr?.n).toBe(1);
  });

  it('leaves the pick out of its own benchmark', () => {
    const sameClientDe = mixColumn([
      { dim: 'client', value: null, label: '' },
      { dim: 'market', value: 'DE', label: 'DE' },
    ]);
    const r = resolveColumn(sameClientDe, pick, pool)!;
    expect(columnStats(r, pick, pool, NOW).stats.ctr?.n).toBe(3); // de2–de4
  });

  it('shows a named campaign as it is, flagged single', () => {
    const col = campaignColumn('at1', 'at1');
    const out = columnStats(resolveColumn(col, pick, pool)!, pick, pool, NOW);
    expect(out.single).toBe(true);
    expect(out.stats.ctr?.avg).toBe(0.02);
    expect(resolveColumn(campaignColumn('gone', 'gone'), pick, pool)).toBeNull();
  });
});

describe('combined columns against a segment pick', () => {
  const audi = findSegment(pool, [{ dim: 'client', value: 'audi' }])!;
  const audiDe = findSegment(pool, [
    { dim: 'client', value: 'audi' },
    { dim: 'market', value: 'DE' },
  ])!;

  it('has no "same client" column when that is the pick itself, but a specific market works', () => {
    expect(
      resolveColumn(mixColumn([{ dim: 'client', value: null, label: '' }]), audi, pool),
    ).toBeNull();
    const at = mixColumn([{ dim: 'market', value: 'AT', label: 'AT' }]);
    expect(resolveColumn(at, audi, pool)).not.toBeNull();
  });

  it('compares Audi DE with Audi AT: the AT column is beside the pick, so nothing is left out', () => {
    const r = resolveColumn(sameClientAt, audiDe, pool)!;
    expect(r).not.toBeNull();
    const out = columnStats(r, audiDe, pool, NOW);
    expect(out.stats.ctr?.n).toBe(1); // at1 only
    // The pick's own client (all markets) contains it, so the pick is left out there.
    const sameClient = mixColumn([{ dim: 'client', value: null, label: '' }]);
    const parent = columnStats(resolveColumn(sameClient, audiDe, pool)!, audiDe, pool, NOW);
    expect(parent.stats.ctr?.n).toBe(1); // 5 Audi campaigns − the 4 in DE = at1
  });

  it('hides "same client × same market" for a client × market pick — that is the pick', () => {
    const both = mixColumn([
      { dim: 'client', value: null, label: '' },
      { dim: 'market', value: null, label: '' },
    ]);
    expect(resolveColumn(both, audiDe, pool)).toBeNull();
  });
});

describe('anything against anything', () => {
  const wide = [
    ...pool,
    c('it1', 'IT', 0.03),
    c('it2', 'IT', 0.031),
    c('it3', 'IT', 0.032),
    c('fr2', 'FR', 0.02, { companyId: 'other', companyName: 'Other' }),
    c('fr3', 'FR', 0.021, { companyId: 'other', companyName: 'Other' }),
  ];
  const ctrN = (
    col: Parameters<typeof resolveColumn>[0],
    subject: ReturnType<typeof findSegment>,
  ) => {
    const r = resolveColumn(col, subject!, wide);
    return r ? columnStats(r, subject!, wide, NOW).stats.ctr?.n : undefined;
  };
  const market = (value: string) => mixColumn([{ dim: 'market', value, label: value }]);
  const clientMarket = (client: string, m: string) =>
    mixColumn([
      { dim: 'client', value: client, label: client },
      { dim: 'market', value: m, label: m },
    ]);

  it('compares a group of markets with another market, and with a group of clients', () => {
    const dach = findSegment(wide, [{ dim: 'market', value: 'DE,AT' }])!;
    expect(dach.campaigns).toHaveLength(5); // de1–de4, at1
    expect(ctrN(market('IT'), dach)).toBe(3);
    expect(ctrN(market('FR,IT'), dach)).toBe(6); // a group as a column too (3 FR + 3 IT)
    expect(ctrN(clientMarket('other', 'FR'), dach)).toBe(3); // fr1–fr3
  });

  it('compares two unrelated segments — a client in one market against another client in another', () => {
    const audiDe = findSegment(wide, [
      { dim: 'client', value: 'audi' },
      { dim: 'market', value: 'DE' },
    ]);
    expect(ctrN(clientMarket('other', 'FR'), audiDe)).toBe(3);
    expect(ctrN(clientMarket('audi', 'IT'), audiDe)).toBe(3);
  });

  it('takes all of KLEA as the pick, against any bucket', () => {
    const klea = findSegment(wide, [])!;
    expect(klea.campaigns).toHaveLength(wide.length);
    expect(ctrN(market('IT'), klea)).toBe(3);
    // The network average would just repeat the pick.
    expect(resolveColumn({ id: 'brame', kind: 'brame' }, klea, wide)).toBeNull();
    // "Same as the pick" has no single bucket for the whole network.
    expect(
      resolveColumn(mixColumn([{ dim: 'client', value: null, label: '' }]), klea, wide),
    ).toBeNull();
  });

  it('compares a campaign with a segment, another campaign, or the network', () => {
    const pick = findCampaign(wide, 'it1')!;
    expect(ctrN(market('FR'), pick as never)).toBe(3);
    expect(resolveColumn(campaignColumn('de1', 'de1'), pick, wide)).not.toBeNull();
    expect(
      columnStats(resolveColumn({ id: 'brame', kind: 'brame' }, pick, wide)!, pick, wide, NOW).stats
        .ctr?.n,
    ).toBe(wide.length - 1);
  });
});
