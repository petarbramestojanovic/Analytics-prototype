import { describe, expect, it } from 'vitest';
import { defaultSeasonYear, previousYear, resolveRange, type RangeInput } from './dateRange';

const TODAY = '2026-09-08';
const input = (over: Partial<RangeInput>): RangeInput => ({
  preset: 'last90',
  from: '',
  to: '',
  seasonYear: 0,
  ...over,
});

describe('resolveRange', () => {
  it('covers the last 30 days', () => {
    expect(resolveRange(input({ preset: 'last30' }), TODAY)).toEqual({
      start: '2026-08-09',
      end: TODAY,
    });
  });

  it('covers the whole of the current quarter, even while it is running', () => {
    expect(resolveRange(input({ preset: 'thisQuarter' }), TODAY)).toEqual({
      start: '2026-07-01',
      end: '2026-09-30',
    });
  });

  it('keeps Q4 as 1 Oct – 31 Dec even before the quarter is over', () => {
    expect(resolveRange(input({ preset: 'q4', seasonYear: 2026 }), '2026-10-28')).toEqual({
      start: '2026-10-01',
      end: '2026-12-31',
    });
  });

  it('covers the whole of last quarter', () => {
    expect(resolveRange(input({ preset: 'lastQuarter' }), TODAY)).toEqual({
      start: '2026-04-01',
      end: '2026-06-30',
    });
  });

  it('wraps last quarter across the year boundary', () => {
    expect(resolveRange(input({ preset: 'lastQuarter' }), '2026-02-10')).toEqual({
      start: '2025-10-01',
      end: '2025-12-31',
    });
  });

  it('runs YTD from 1 Jan', () => {
    expect(resolveRange(input({ preset: 'ytd' }), TODAY)).toEqual({
      start: '2026-01-01',
      end: TODAY,
    });
  });

  it('runs Black Friday week from 6 days before to Cyber Monday', () => {
    // Black Friday 2025 = 28 Nov.
    expect(resolveRange(input({ preset: 'blackFriday', seasonYear: 2025 }), TODAY)).toEqual({
      start: '2025-11-22',
      end: '2025-12-01',
    });
  });

  it('ends rolling windows today', () => {
    expect(resolveRange(input({ preset: 'ytd' }), TODAY).end).toBe(TODAY);
    expect(resolveRange(input({ preset: 'last12m' }), TODAY).end).toBe(TODAY);
  });

  it('falls back to 90 days for an inverted custom range', () => {
    expect(
      resolveRange(input({ preset: 'custom', from: '2026-05-01', to: '2026-04-01' }), TODAY),
    ).toEqual({
      start: '2026-06-10',
      end: TODAY,
    });
  });
});

describe('defaultSeasonYear', () => {
  it('uses last year while the season is still ahead', () => {
    expect(defaultSeasonYear('q4', TODAY)).toBe(2025);
  });

  it('uses this year once the season has started', () => {
    expect(defaultSeasonYear('christmas', '2026-12-10')).toBe(2026);
  });
});

describe('previousYear', () => {
  it('shifts both bounds back one calendar year', () => {
    expect(previousYear({ start: '2026-07-01', end: '2026-09-08' })).toEqual({ start: '2025-07-01', end: '2025-09-08' });
  });

  it('keeps a quarter a quarter', () => {
    expect(previousYear({ start: '2026-10-01', end: '2026-12-31' })).toEqual({ start: '2025-10-01', end: '2025-12-31' });
  });

  it('clamps 29 Feb to the end of February', () => {
    expect(previousYear({ start: '2024-02-29', end: '2024-03-10' }).start).toBe('2023-02-28');
  });
});
