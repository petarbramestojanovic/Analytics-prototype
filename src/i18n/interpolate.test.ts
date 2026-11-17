import { describe, expect, it } from 'vitest';
import { interpolate } from './interpolate';

describe('interpolate', () => {
  it('fills plain variables, and leaves a missing one empty', () => {
    expect(interpolate('{{a}} of {{b}}{{c}}', { a: 1, b: 'x' })).toBe('1 of x');
  });

  it('returns the string untouched without variables', () => {
    expect(interpolate('{{count}} left')).toBe('{{count}} left');
  });

  it('picks the singular form only for exactly 1', () => {
    const s = '{{n}} {{n|campaign|campaigns}}';
    expect(interpolate(s, { n: 1 })).toBe('1 campaign');
    expect(interpolate(s, { n: 0 })).toBe('0 campaigns');
    expect(interpolate(s, { n: 2 })).toBe('2 campaigns');
    expect(interpolate(s, { n: '1' })).toBe('1 campaign');
  });

  it('handles several plurals in one string, and forms with spaces', () => {
    const s = '{{u}} {{u|user|users}} · {{c}} {{c|active alert|active alerts}}';
    expect(interpolate(s, { u: 1, c: 3 })).toBe('1 user · 3 active alerts');
  });
});
