import { differenceInCalendarDays, parseISO } from 'date-fns';
import { TODAY } from '@/lib/clock';
import type { Campaign } from '@/types';

type FlightState = 'scheduled' | 'running' | 'ended';

export interface FlightProgress {
  state: FlightState;
  /** Length of the flight, start and end day both counted. */
  totalDays: number;
  /** Which day of the flight today is (running only). */
  day: number;
  /** Days until it starts (scheduled only). */
  startsInDays: number;
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

  if (sinceStart < 0) return { state: 'scheduled', totalDays, day: 0, startsInDays: -sinceStart, pct: 0 };
  if (differenceInCalendarDays(today, end) > 0) return { state: 'ended', totalDays, day: totalDays, startsInDays: 0, pct: 1 };
  const day = sinceStart + 1;
  return { state: 'running', totalDays, day, startsInDays: 0, pct: Math.min(1, day / totalDays) };
}
