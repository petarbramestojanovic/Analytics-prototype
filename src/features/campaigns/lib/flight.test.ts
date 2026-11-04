import { describe, expect, it } from 'vitest';
import { flightProgress } from './flight';

const flight = { flightStart: '2026-08-11', flightEnd: '2026-08-20' }; // 10 days

describe('flightProgress', () => {
  it('counts the start and end day, and where today falls', () => {
    const f = flightProgress(flight, new Date('2026-08-15T10:00:00'));
    expect(f).toMatchObject({ state: 'running', totalDays: 10, day: 5, pct: 0.5 });
  });

  it('is complete after the end date and empty before the start', () => {
    expect(flightProgress(flight, new Date('2026-08-21T10:00:00'))).toMatchObject({ state: 'ended', pct: 1 });
    expect(flightProgress(flight, new Date('2026-08-08T10:00:00'))).toMatchObject({ state: 'scheduled', startsInDays: 3, pct: 0 });
  });

  it('is still running on the last day', () => {
    expect(flightProgress(flight, new Date('2026-08-20T23:00:00'))).toMatchObject({ state: 'running', day: 10, pct: 1 });
  });
});
