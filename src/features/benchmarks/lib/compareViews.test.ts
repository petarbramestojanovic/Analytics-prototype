import { describe, expect, it } from 'vitest';
import { defaultChartsState, MAX_COMPARE_CHARTS, sanitizeChartsState } from './compareViews';

describe('sanitizeChartsState', () => {
  it('falls back to the default charts for junk', () => {
    expect(sanitizeChartsState(null)).toEqual(defaultChartsState());
    expect(sanitizeChartsState('x')).toEqual(defaultChartsState());
  });

  it('allows removing every chart, and caps the list at four', () => {
    expect(sanitizeChartsState({ charts: [], views: [] }).charts).toEqual([]);
    const many = Array.from({ length: 7 }, (_, i) => ({ id: `c${i}`, metric: 'ctr', by: 'market' }));
    expect(sanitizeChartsState({ charts: many, views: [] }).charts).toHaveLength(MAX_COMPARE_CHARTS);
  });

  it('drops charts and views with unknown metrics or dimensions', () => {
    const state = sanitizeChartsState({
      charts: [
        { id: 'ok', metric: 'viewability', by: 'client' },
        { id: 'bad', metric: 'nope', by: 'client' },
      ],
      views: [
        { id: 'v1', name: 'Q4', charts: [{ id: 'a', metric: 'ctr', by: 'industry' }] },
        { id: 'v2', name: 'Broken', charts: 'nope' },
      ],
    });
    expect(state.charts.map((c) => c.id)).toEqual(['ok']);
    expect(state.views.map((v) => v.name)).toEqual(['Q4']);
  });
});
