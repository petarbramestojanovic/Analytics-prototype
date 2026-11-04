import { describe, expect, it } from 'vitest';
import type { Seat } from '@/types';
import { notifiesPerson, resolveNotify } from './notify';

const seats: Seat[] = [
  { id: 'seat-admin', category: 'admin', name: 'Admin' },
  { id: 'seat-brame', category: 'brame', name: 'Brame' },
  { id: 'seat-client', category: 'client', name: 'Migros', companyId: 'c1' },
];

describe('who an alert rule notifies', () => {
  it('defaults to every internal seat, never a client seat', () => {
    expect(resolveNotify(undefined, seats)).toEqual({ seatIds: ['seat-admin', 'seat-brame'], memberIds: [] });
    expect(notifiesPerson(undefined, seats, { seatId: 'seat-brame' })).toBe(true);
    expect(notifiesPerson(undefined, seats, { seatId: 'seat-client' })).toBe(false);
  });

  it('notifies a whole seat, or just a named member', () => {
    const rule = { notify: { seatIds: ['seat-admin'], memberIds: ['m-9'] } };
    expect(notifiesPerson(rule, seats, { seatId: 'seat-admin', memberId: 'm-1' })).toBe(true);
    expect(notifiesPerson(rule, seats, { seatId: 'seat-brame', memberId: 'm-9' })).toBe(true);
    expect(notifiesPerson(rule, seats, { seatId: 'seat-brame', memberId: 'm-2' })).toBe(false);
  });

  it('notifies nobody when both lists are empty', () => {
    const rule = { notify: { seatIds: [], memberIds: [] } };
    expect(notifiesPerson(rule, seats, { seatId: 'seat-admin', memberId: 'm-1' })).toBe(false);
  });
});
