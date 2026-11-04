import { describe, expect, it } from 'vitest';
import { matchesSelection, parseSelection, serializeSelection } from './selection';

describe('selection', () => {
  it('reads "all" and empty as nothing picked', () => {
    expect(parseSelection('all')).toEqual([]);
    expect(parseSelection('')).toEqual([]);
  });

  it('round-trips several picks, and a single id from an old link', () => {
    expect(parseSelection(serializeSelection(['CH', 'AT']))).toEqual(['CH', 'AT']);
    expect(parseSelection('CH')).toEqual(['CH']);
    expect(serializeSelection([])).toBe('all');
  });

  it('matches everything when nothing is picked, else only the picks', () => {
    expect(matchesSelection('all', 'CH')).toBe(true);
    expect(matchesSelection('CH,AT', 'AT')).toBe(true);
    expect(matchesSelection('CH,AT', 'DE')).toBe(false);
  });
});
