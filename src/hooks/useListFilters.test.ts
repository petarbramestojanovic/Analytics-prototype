import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { useListFilters } from './useListFilters';

const KEY = STORAGE_KEYS.campaignsFilters;
const DEFAULTS: { q: string; status: 'all' | 'live' } = { q: '', status: 'all' };

describe('useListFilters', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts from defaults when nothing is stored', () => {
    const { result } = renderHook(() => useListFilters(KEY, DEFAULTS));
    expect(result.current.filters).toEqual(DEFAULTS);
    expect(result.current.filtersActive).toBe(false);
  });

  it('reads previously persisted filters on mount', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ q: 'migros', status: 'all' }));
    const { result } = renderHook(() => useListFilters(KEY, DEFAULTS));
    expect(result.current.filters.q).toBe('migros');
  });

  it('falls back to defaults when stored JSON is corrupt', () => {
    window.localStorage.setItem(KEY, '{not json');
    const { result } = renderHook(() => useListFilters(KEY, DEFAULTS));
    expect(result.current.filters).toEqual(DEFAULTS);
  });

  it('patches a single field, persists it, and flags filtersActive', () => {
    const { result } = renderHook(() => useListFilters(KEY, DEFAULTS));

    act(() => result.current.setFilter({ q: 'swisscom' }));

    expect(result.current.filters).toEqual({ q: 'swisscom', status: 'all' });
    expect(result.current.filtersActive).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual({ q: 'swisscom', status: 'all' });
  });

  it('resetFilters restores defaults', () => {
    const { result } = renderHook(() => useListFilters(KEY, DEFAULTS));

    act(() => result.current.setFilter({ q: 'swisscom', status: 'live' }));
    expect(result.current.filtersActive).toBe(true);

    act(() => result.current.resetFilters());
    expect(result.current.filters).toEqual(DEFAULTS);
    expect(result.current.filtersActive).toBe(false);
  });
});
