import { describe, expect, it } from 'vitest';
import type { BenchmarkCampaign } from '@/types';
import {
  campaignSubjects,
  cutsId,
  findCampaign,
  findSegment,
  parseSubjectKind,
  subjectIds,
} from './compareSubject';

const c = (id: string, over: Partial<BenchmarkCampaign> = {}): BenchmarkCampaign =>
  ({
    id,
    name: id,
    companyId: 'co-a',
    companyName: 'Co A',
    industry: 'Retail',
    accountId: null,
    accountName: null,
    market: 'CH',
    ...over,
  }) as BenchmarkCampaign;

const pool = [
  c('1'),
  c('2', { market: 'DE' }),
  c('3', { companyId: 'co-b', companyName: 'Co B', market: 'CH' }),
  c('4', { companyId: 'co-c', companyName: 'Co C', industry: 'Telco' }),
];

describe('compare subject', () => {
  it('is a campaign, or a segment of any mix of cuts', () => {
    expect(campaignSubjects(pool)).toHaveLength(4);
    const client = findSegment(pool, [{ dim: 'client', value: 'co-a' }])!;
    expect(client.campaigns.map((x) => x.id)).toEqual(['1', '2']);
    const clientInDe = findSegment(pool, [
      { dim: 'market', value: 'DE' },
      { dim: 'client', value: 'co-a' },
    ])!;
    expect(clientInDe.campaigns.map((x) => x.id)).toEqual(['2']);
    expect(findSegment(pool, [{ dim: 'market', value: 'FR' }])).toBeNull();
    // No cuts at all is the whole network.
    expect(findSegment(pool, [])!.campaigns).toHaveLength(4);
  });

  it('writes the same cuts the same way, whatever order they were given in', () => {
    const a = cutsId([
      { dim: 'client', value: 'co-a' },
      { dim: 'market', value: 'DE' },
    ]);
    const b = cutsId([
      { dim: 'market', value: 'DE' },
      { dim: 'client', value: 'co-a' },
    ]);
    expect(a).toBe(b);
  });

  it('keeps a cut only where all its campaigns agree on it', () => {
    const client = findSegment(pool, [{ dim: 'client', value: 'co-a' }])!;
    expect(client.keys.industry).toBe('Retail');
    expect(client.keys.market).toBeNull(); // CH and DE
    expect(findSegment(pool, [{ dim: 'industry', value: 'Retail' }])!.keys.client).toBeNull();
    expect(findCampaign(pool, '1')!.keys.market).toBe('CH');
  });

  it('knows which campaigns to leave out of its own benchmark', () => {
    expect([...subjectIds(findSegment(pool, [{ dim: 'client', value: 'co-a' }])!)].sort()).toEqual([
      '1',
      '2',
    ]);
    expect(findCampaign(pool, 'nope')).toBeNull();
  });

  it('reads older client / industry links as a segment', () => {
    expect(parseSubjectKind('client')).toBe('segment');
    expect(parseSubjectKind('industry')).toBe('segment');
    expect(parseSubjectKind('segment')).toBe('segment');
    expect(parseSubjectKind(null)).toBe('campaign');
  });

  it('takes several buckets of one cut as one group (Germany + Austria)', () => {
    const dach = findSegment(
      [...pool, c('5', { market: 'AT' })],
      [{ dim: 'market', value: 'DE,AT' }],
    )!;
    expect(dach.campaigns.map((x) => x.id)).toEqual(['2', '5']);
    expect(dach.cutLabels.market).toEqual(['DE', 'AT']);
    expect(dach.keys.market).toBeNull(); // two markets: no single "same market"
  });
});
