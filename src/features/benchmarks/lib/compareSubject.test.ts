import { describe, expect, it } from 'vitest';
import type { BenchmarkCampaign } from '@/types';
import { findSubject, ownKey, subjectIds, subjectsOf } from './compareSubject';

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
  it('groups the pool by campaign, client or industry', () => {
    expect(subjectsOf(pool, 'campaign')).toHaveLength(4);
    expect(
      subjectsOf(pool, 'client')
        .map((s) => s.name)
        .sort(),
    ).toEqual(['Co A', 'Co B', 'Co C']);
    expect(subjectsOf(pool, 'industry').map((s) => [s.name, s.campaigns.length])).toEqual([
      ['Retail', 3],
      ['Telco', 1],
    ]);
  });

  it('keeps a cut only where all its campaigns agree on it', () => {
    const client = findSubject(pool, 'client', 'co-a')!;
    expect(client.keys.industry).toBe('Retail');
    expect(client.keys.market).toBeNull(); // CH and DE
    const industry = findSubject(pool, 'industry', 'Retail')!;
    expect(industry.keys.client).toBeNull();
  });

  it('never offers a client or industry its own bucket as a benchmark', () => {
    const client = findSubject(pool, 'client', 'co-a')!;
    expect(ownKey(client, 'client')).toBeNull();
    expect(ownKey(client, 'industry')).toBe('Retail');
    expect(ownKey(client, 'market')).toBeNull();
    const campaign = findSubject(pool, 'campaign', '1')!;
    expect(ownKey(campaign, 'client')).toBe('co-a');
    expect(ownKey(campaign, 'market')).toBe('CH');
  });

  it('knows which campaigns to leave out of its own benchmark', () => {
    expect([...subjectIds(findSubject(pool, 'client', 'co-a')!)].sort()).toEqual(['1', '2']);
    expect(findSubject(pool, 'client', 'nope')).toBeNull();
  });
});
