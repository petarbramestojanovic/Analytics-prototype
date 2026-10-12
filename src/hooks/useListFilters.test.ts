import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { useListFilters } from './useListFilters';

const KEY = STORAGE_KEYS.campaignsFilters;
const DEFAULTS: { q: string; statusFilter: 'all' | 'live'; sortDesc: boolean } = {
  q: '',
  statusFilter: 'all',
  sortDesc: false,
};
const ALLOWED = { statusFilter: ['all', 'live'] as const };

/** Renders the hook inside a router at `url`, exposing the live location. */
function setup(url = '/campaigns') {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: [url] }, children);
  return renderHook(() => ({ ...useListFilters(KEY, DEFAULTS, ALLOWED), location: useLocation() }), { wrapper });
}

describe('useListFilters', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts from defaults with a clean URL when nothing is stored', () => {
    const { result } = setup();
    expect(result.current.filters).toEqual(DEFAULTS);
    expect(result.current.filtersActive).toBe(false);
    expect(result.current.location.search).toBe('');
  });

  it('restores persisted filters when the URL has none, and mirrors them into it', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ q: 'migros', statusFilter: 'all' }));
    const { result } = setup();
    expect(result.current.filters.q).toBe('migros');
    expect(result.current.location.search).toBe('?q=migros');
  });

  it('lets the URL win over storage, decoding by the default’s type', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ q: 'migros' }));
    const { result } = setup('/campaigns?status=live&sortDesc=1');
    expect(result.current.filters).toEqual({ q: '', statusFilter: 'live', sortDesc: true });
  });

  it('drops URL values outside the allowed set', () => {
    const { result } = setup('/campaigns?status=bogus');
    expect(result.current.filters.statusFilter).toBe('all');
  });

  it('falls back to defaults when stored JSON is corrupt', () => {
    window.localStorage.setItem(KEY, '{not json');
    const { result } = setup();
    expect(result.current.filters).toEqual(DEFAULTS);
  });

  it('patches a field, persists it, writes it to the URL and flags filtersActive', () => {
    const { result } = setup('/campaigns?unrelated=keep');

    act(() => result.current.setFilter({ q: 'swisscom', statusFilter: 'live' }));

    expect(result.current.filters).toEqual({ q: 'swisscom', statusFilter: 'live', sortDesc: false });
    expect(result.current.filtersActive).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual({ q: 'swisscom', statusFilter: 'live', sortDesc: false });
    const params = new URLSearchParams(result.current.location.search);
    expect(params.get('q')).toBe('swisscom');
    expect(params.get('status')).toBe('live');
    expect(params.get('unrelated')).toBe('keep');
  });

  it('resetFilters restores defaults and clears its params', () => {
    const { result } = setup();

    act(() => result.current.setFilter({ q: 'swisscom', statusFilter: 'live' }));
    act(() => result.current.resetFilters());

    expect(result.current.filters).toEqual(DEFAULTS);
    expect(result.current.filtersActive).toBe(false);
    expect(result.current.location.search).toBe('');
  });
});
