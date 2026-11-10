import { differenceInCalendarDays, parseISO } from 'date-fns';
import { TODAY } from '@/lib/clock';
import type { Campaign } from '@/types';

type FlightState = 'running' | 'ended';

export interface FlightProgress {
  state: FlightState;
  /** Length of the flight, start and end day both counted. */
  totalDays: number;
  /** Which day of the flight today is (running only). */
  day: number;
  /** Share of the flight's runtime already gone, 0–1. */
  pct: number;
}

/** Where a campaign is in its flight, from its start and end dates and the
 *  app clock — the same "share of runtime elapsed" the delivery check judges
 *  pacing against. */
export function flightProgress(campaign: Pick<Campaign, 'flightStart' | 'flightEnd'>, today: Date = TODAY): FlightProgress {
  const start = parseISO(campaign.flightStart);
  const end = parseISO(campaign.flightEnd);
  const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const sinceStart = differenceInCalendarDays(today, start);

  if (differenceInCalendarDays(today, end) > 0) return { state: 'ended', totalDays, day: totalDays, pct: 1 };
  // A flight can't start in the future in this app, but if one ever did it
  // would read day 1 at 0%, not a negative day.
  const day = Math.max(1, sinceStart + 1);
  return { state: 'running', totalDays, day, pct: sinceStart < 0 ? 0 : Math.min(1, day / totalDays) };
}
