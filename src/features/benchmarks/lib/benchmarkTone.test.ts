import { describe, expect, it } from 'vitest';
import { BENCHMARK_TONE_TEXT, benchmarkTone, isToneMetric } from './benchmarkTone';

describe('benchmarkTone', () => {
  it('is on benchmark at it', () => {
    expect(benchmarkTone(0.02, 0.02)).toBe('on');
  });

  it('is green only once more than 10% above it', () => {
    expect(benchmarkTone(0.0219, 0.02)).toBe('on');
    expect(benchmarkTone(0.0221, 0.02)).toBe('above');
    expect(benchmarkTone(0.03, 0.02)).toBe('above');
    // The gap is relative: 83.8% against 77.0% is +8.8%, so not green yet.
    expect(benchmarkTone(0.838, 0.77)).toBe('on');
    expect(benchmarkTone(0.85, 0.77)).toBe('above');
  });

  it('is red only once more than 10% below it (the v1 tolerance)', () => {
    expect(benchmarkTone(0.0179, 0.02)).toBe('below');
    expect(benchmarkTone(0.0181, 0.02)).toBe('on');
    // 73.1% against a 74.6% average is about 2% under: still unmarked.
    expect(benchmarkTone(0.731, 0.746)).toBe('on');
    expect(benchmarkTone(0.66, 0.746)).toBe('below');
  });

  it('has no colour when the average rests on a single campaign (the value itself)', () => {
    expect(benchmarkTone(0.0086, 0.0086, 1)).toBeNull();
    expect(benchmarkTone(0.007, 0.009, 2)).toBe('below');
  });

  it('has no colour without a benchmark or a value', () => {
    expect(benchmarkTone(0.02, undefined)).toBeNull();
    expect(benchmarkTone(0.02, 0)).toBeNull();
    expect(benchmarkTone(null, 0.02)).toBeNull();
  });

  it('is red below, green above and uncoloured in between, as in Analytics 1.0', () => {
    expect(BENCHMARK_TONE_TEXT.below).toContain('red');
    expect(BENCHMARK_TONE_TEXT.above).toContain('green');
    expect(BENCHMARK_TONE_TEXT.on).toBe('');
  });

  it('applies to engagement rate, CTR and viewability only', () => {
    expect(isToneMetric('ctr')).toBe(true);
    expect(isToneMetric('viewability')).toBe(true);
    expect(isToneMetric('engagementRate')).toBe(true);
    expect(isToneMetric('impressions')).toBe(false);
  });
});
