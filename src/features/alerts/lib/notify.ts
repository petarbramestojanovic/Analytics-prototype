import type { TranslateFn } from '@/i18n';
import type { Seat, SeatMember } from '@/types';
import type { AlertNotify, AlertRule } from '../types';

/** Alerts, their detail pages and the rules are Admin/Brame-only screens, so
 *  only people in those two seats can be told about one. */
export const isInternalSeat = (seat: Seat) => seat.category === 'admin' || seat.category === 'brame';

/** What a rule notifies when nobody has chosen: every internal seat. */
export function resolveNotify(rule: Pick<AlertRule, 'notify'> | undefined, seats: Seat[]): AlertNotify {
  return rule?.notify ?? { seatIds: seats.filter(isInternalSeat).map((s) => s.id), memberIds: [] };
}

/** Does this person — by the seat they act under and their own member id —
 *  get an inbox item for a rule? A rule-less alert (the default source check)
 *  uses the default recipients. */
export function notifiesPerson(
  rule: Pick<AlertRule, 'notify'> | undefined,
  seats: Seat[],
  who: { seatId?: string; memberId?: string }
): boolean {
  const notify = resolveNotify(rule, seats);
  return (!!who.seatId && notify.seatIds.includes(who.seatId)) || (!!who.memberId && notify.memberIds.includes(who.memberId));
}

/** A short, readable "who gets this": "Admin, Brame", "Alex Weber", "Nobody". */
export function notifyLabel(
  rule: Pick<AlertRule, 'notify'> | undefined,
  seats: Seat[],
  members: SeatMember[],
  t: TranslateFn
): string {
  const notify = resolveNotify(rule, seats);
  const names = [
    ...notify.seatIds.map((id) => seats.find((s) => s.id === id)?.name),
    ...notify.memberIds.map((id) => members.find((m) => m.id === id)?.name),
  ].filter((n): n is string => !!n);
  return names.length ? names.join(', ') : t('alerts.notify.nobody');
}
