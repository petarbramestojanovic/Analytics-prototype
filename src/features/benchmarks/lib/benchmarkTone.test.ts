import { describe, expect, it } from 'vitest';
import { BENCHMARK_TONE_TEXT, benchmarkTone, isToneMetric } from './benchmarkTone';

describe('benchmarkTone', () => {
  it('is on benchmark at or above it', () => {
    expect(benchmarkTone(0.02, 0.02)).toBe('onOrAbove');
    expect(benchmarkTone(0.03, 0.02)).toBe('onOrAbove');
  });

  it('is red only once more than 10% below it (the v1 tolerance)', () => {
    expect(benchmarkTone(0.0179, 0.02)).toBe('below');
    expect(benchmarkTone(0.0181, 0.02)).toBe('onOrAbove');
    // 73.1% against a 74.6% average is about 2% under: still green.
    expect(benchmarkTone(0.731, 0.746)).toBe('onOrAbove');
    expect(benchmarkTone(0.66, 0.746)).toBe('below');
  });

  it('has no colour when the average rests on a single campaign (the value itself)', () => {
    expect(benchmarkTone(0.0086, 0.0086, 1)).toBeNull();
    expect(benchmarkTone(0.0070, 0.0090, 2)).toBe('below');
  });

  it('has no colour without a benchmark or a value', () => {
    expect(benchmarkTone(0.02, undefined)).toBeNull();
    expect(benchmarkTone(0.02, 0)).toBeNull();
    expect(benchmarkTone(null, 0.02)).toBeNull();
  });

  it('only turns red, as in Analytics 1.0 — no green', () => {
    expect(BENCHMARK_TONE_TEXT.below).toContain('red');
    expect(BENCHMARK_TONE_TEXT.onOrAbove).toBe('');
  });

  it('applies to engagement rate, CTR and viewability only', () => {
    expect(isToneMetric('ctr')).toBe(true);
    expect(isToneMetric('viewability')).toBe(true);
    expect(isToneMetric('engagementRate')).toBe(true);
    expect(isToneMetric('impressions')).toBe(false);
  });
});
