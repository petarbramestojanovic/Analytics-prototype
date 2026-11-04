import { describe, expect, it } from 'vitest';
import type { Campaign } from '@/types';
import { goalRead, goalStatus, guaranteeRead } from './goal';

const campaign = (over: Partial<Campaign['salesforce']>, totals: Record<string, number> = {}) =>
  ({
    primarySource: 'custom',
    sources: { atk: null, nexd: null, custom: { totals, daily: [] } },
    salesforce: { primaryKpi: null, performanceGuarantee: null, ...over },
  }) as unknown as Campaign;

describe('goalStatus', () => {
  it('is on target at or above the target, close within 10%, behind below that', () => {
    expect(goalStatus(0.05, 0.05)).toBe('met');
    expect(goalStatus(0.046, 0.05)).toBe('close');
    expect(goalStatus(0.04, 0.05)).toBe('behind');
  });

  it('never reads a missing value as a zero', () => {
    expect(goalStatus(null, 0.05)).toBe('no-data');
    expect(goalStatus(0.05, null)).toBe('no-target');
  });
});

describe('goalRead', () => {
  it('is null when no goal was briefed', () => {
    expect(goalRead(campaign({}))).toBeNull();
  });

  it('takes the actual from the primary source', () => {
    const read = goalRead(campaign({ primaryKpi: { metric: 'engagementRate', target: 0.05 } }, { engagementRate: 0.06 }));
    expect(read?.value).toBe(0.06);
    expect(read?.attainment).toBeCloseTo(1.2);
    expect(read?.status).toBe('met');
  });

  it('reads no-data when the primary source does not measure the metric', () => {
    expect(goalRead(campaign({ primaryKpi: { metric: 'ctr', target: 0.01 } }))?.status).toBe('no-data');
  });
});

describe('guaranteeRead', () => {
  it('flags a breach when the actual is under the guaranteed floor', () => {
    const guarantee = { metric: 'viewability' as const, value: 0.7 };
    expect(guaranteeRead(campaign({ performanceGuarantee: guarantee }, { viewability: 0.65 }))?.status).toBe('breach');
    expect(guaranteeRead(campaign({ performanceGuarantee: guarantee }, { viewability: 0.75 }))?.status).toBe('ok');
  });

  it('is null when no guarantee was agreed', () => {
    expect(guaranteeRead(campaign({}))).toBeNull();
  });
});
