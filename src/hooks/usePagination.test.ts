import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePagination } from './usePagination';

describe('usePagination', () => {
  it('slices items into the requested page size', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const { result } = renderHook(() => usePagination(items, 10));
    expect(result.current.paged).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(result.current.pageCount).toBe(3);
    expect(result.current.from).toBe(1);
    expect(result.current.to).toBe(10);
  });

  it('clamps back to the last valid page when items shrink past the current page', () => {
    const { result, rerender } = renderHook(({ items }) => usePagination(items, 10), {
      initialProps: { items: Array.from({ length: 25 }, (_, i) => i) },
    });

    act(() => result.current.setPage(2));
    expect(result.current.page).toBe(2);

    rerender({ items: Array.from({ length: 5 }, (_, i) => i) });
    expect(result.current.page).toBe(0);
    expect(result.current.pageCount).toBe(1);
  });

  it('resets to page 0 whenever a resetOn dependency changes', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const { result, rerender } = renderHook(({ query }) => usePagination(items, 10, [query]), {
      initialProps: { query: '' },
    });

    act(() => result.current.setPage(2));
    expect(result.current.page).toBe(2);

    rerender({ query: 'new search' });
    expect(result.current.page).toBe(0);
  });

  it('does not reset the page when resetOn is unchanged', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const { result, rerender } = renderHook(({ query }) => usePagination(items, 10, [query]), {
      initialProps: { query: 'same' },
    });

    act(() => result.current.setPage(1));
    expect(result.current.page).toBe(1);

    rerender({ query: 'same' });
    expect(result.current.page).toBe(1);
  });
});
