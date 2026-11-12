import { describe, expect, it } from 'vitest';
import {
  defaultChartsState,
  MAX_COMPARE_CHARTS,
  mixColumn,
  sanitizeChartsState,
  sanitizeState,
} from './compareViews';

describe('sanitizeChartsState', () => {
  it('falls back to the default charts for junk', () => {
    expect(sanitizeChartsState(null)).toEqual(defaultChartsState());
    expect(sanitizeChartsState('x')).toEqual(defaultChartsState());
  });

  it('allows removing every chart, and caps the list at four', () => {
    expect(sanitizeChartsState({ charts: [], views: [] }).charts).toEqual([]);
    const many = Array.from({ length: 7 }, (_, i) => ({
      id: `c${i}`,
      metric: 'ctr',
      by: 'market',
    }));
    expect(sanitizeChartsState({ charts: many, views: [] }).charts).toHaveLength(
      MAX_COMPARE_CHARTS,
    );
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

describe('combined columns', () => {
  it('collapses a mix into the simpler kind when it is really just that', () => {
    expect(mixColumn([{ dim: 'client', value: null, label: '' }]).kind).toBe('own');
    expect(mixColumn([{ dim: 'market', value: 'AT', label: 'AT' }]).kind).toBe('fixed');
    const audiAt = mixColumn([
      { dim: 'market', value: 'AT', label: 'AT' },
      { dim: 'client', value: null, label: '' },
    ]);
    // Cuts are put in their fixed order, so the same mix always has the same id.
    expect(audiAt.id).toBe('mix:market=AT+client=@');
    expect(audiAt.id).toBe(
      mixColumn([
        { dim: 'client', value: null, label: '' },
        { dim: 'market', value: 'AT', label: 'AT' },
      ]).id.replace('client=@+market=AT', 'market=AT+client=@'),
    );
  });

  it('keeps mixed and named-campaign columns through a saved view, and drops broken ones', () => {
    const cols = sanitizeState({
      columns: [
        {
          kind: 'mix',
          parts: [
            { dim: 'client', value: null, label: '' },
            { dim: 'market', value: 'AT', label: 'AT' },
          ],
        },
        { kind: 'campaign', campaignId: 'cmp-1', label: 'Audi Summer Sale AT' },
        { kind: 'mix', parts: [{ dim: 'nope', value: null, label: '' }] },
        { kind: 'campaign', campaignId: 5 },
      ],
    }).columns;
    expect(cols.map((c) => c.kind)).toEqual(['mix', 'campaign']);
  });
});

describe('saved views remember what was compared', () => {
  const columns = [{ kind: 'brame' }];
  it('keeps the pick a view was saved with, and leaves older views without one', () => {
    const { views } = sanitizeState({
      views: [
        {
          id: 'a',
          name: 'DACH',
          columns,
          charts: [],
          subject: { kind: 'segment', market: 'DE,AT', client: 'c-x', industry: 5 },
        },
        { id: 'b', name: 'Old', columns, charts: [] },
      ],
    });
    expect(views[0].subject).toEqual({
      kind: 'segment',
      campaign: '',
      industry: 'all', // junk falls back to "no narrowing"
      market: 'DE,AT',
      client: 'c-x',
      account: 'all',
    });
    expect(views[1].subject).toBeUndefined();
  });
});
