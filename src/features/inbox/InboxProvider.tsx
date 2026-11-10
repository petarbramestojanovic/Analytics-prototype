import { useCallback, useMemo, type ReactNode } from 'react';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { usePersistentState } from '@/hooks/usePersistentState';
import { codecs } from '@/lib/storage';
import { TODAY } from '@/lib/clock';
import { useI18n } from '@/i18n';
import { useInboxEvents } from '@/api/hooks/useInbox';
import { alertTriggeredAt, notifiesPerson, useAlertLog, useAlertRules } from '@/features/alerts';
import { useCurrentUser } from '@/features/profile';
import { useNotificationSettings } from '@/features/preferences';
import { useScopedReports } from '@/features/reports';
import { useCurrentSeat, useSeatMembers, useSeats } from '@/features/seats';
import { useSession } from '@/features/session';
import { InboxContext } from './inboxContext';
import { alertItem, eventItem } from './lib/buildItems';
import type { InboxEntry } from './types';

/** One person's own marks on inbox items. Kept per person so two people
 *  sharing a browser (the demo's "viewing as" switch) each have their own. */
type PersonState = { read: string[]; archived: string[] };
const stateCodec = codecs.json<Record<string, PersonState>>();
const EMPTY: PersonState = { read: [], archived: [] };

/** The inbox is a notification feed, not the alert log: an alert lands in it
 *  only while it is this fresh. Anything older is still on the Alerts page,
 *  which lists every alert that is currently tripping. */
const INBOX_ALERT_WINDOW_HOURS = 6;
const inboxAlertCutoff = () => TODAY.getTime() - INBOX_ALERT_WINDOW_HOURS * 3_600_000;

/**
 * A person's inbox: events addressed to them, merged with the alerts that are
 * triggered right now, minus whatever they've switched off in Notifications.
 * Reading, un-reading and archiving are theirs alone.
 *
 * Who gets what: alerts go to Admin/Klea seats (the ones with an Alerts
 * page); a finished report to the seats that can see that report; an accepted
 * invitation to the Admin seat and to the admins of the seat that was joined.
 */
export function InboxProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const session = useSession();
  const user = useCurrentUser();
  const settings = useNotificationSettings();
  const { seat } = useCurrentSeat();
  const { data: events, isLoading: eventsLoading } = useInboxEvents();
  const { rows: alertRows, isLoading: alertsLoading } = useAlertLog();
  const { reports } = useScopedReports();
  const { rules } = useAlertRules();
  const { data: seats = [] } = useSeats();
  const { data: members = [] } = useSeatMembers();
  // The signed-in person as a member record — how a rule that names single
  // people recognises them.
  const me = members.find((m) => m.email === user.email);

  const [allState, setAllState] = usePersistentState<Record<string, PersonState>>(STORAGE_KEYS.inboxState, {}, stateCodec);
  const personKey = user.email || session.seatCategory;
  const mine = allState[personKey] ?? EMPTY;

  const entries = useMemo(() => {
    const reportIds = new Set(reports.map((r) => r.id));
    const items = [
      // Only what needs investigating interrupts anyone — "watch" stays on the Alerts page.
      ...(session.isInternal && settings.inboxAlerts
        ? alertRows
            .filter((r) => r.severity === 'investigate')
            .filter((r) => new Date(alertTriggeredAt(r.key)).getTime() >= inboxAlertCutoff())
            // Only the people the rule names (by default, the Admin and Klea seats).
            .filter((r) => notifiesPerson(rules.find((rule) => rule.id === r.ruleId), seats, { seatId: seat?.id, memberId: me?.id }))
            .map((r) => alertItem(r, t))
        : []),
      ...(events ?? [])
        .filter((e) =>
          e.kind === 'report'
            ? settings.inboxReports && reportIds.has(e.reportId)
            : settings.inboxInvitations && (session.isAdmin || (session.canManageSeat && e.seatId === seat?.id))
        )
        .map((e) => eventItem(e, t, { canManageSeat: session.canManageSeat })),
    ];
    const read = new Set(mine.read);
    const archived = new Set(mine.archived);
    return items
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((item): InboxEntry => ({ ...item, read: read.has(item.id), archived: archived.has(item.id) }));
  }, [alertRows, rules, seats, me?.id, events, reports, session.isInternal, session.isAdmin, session.canManageSeat, seat?.id, settings, mine, t]);

  const unreadCount = useMemo(() => entries.filter((e) => !e.read && !e.archived).length, [entries]);

  const update = useCallback(
    (fn: (s: PersonState) => PersonState) => setAllState((prev) => ({ ...prev, [personKey]: fn(prev[personKey] ?? EMPTY) })),
    [personKey, setAllState]
  );
  const toggle = (list: string[], id: string, on: boolean) => (on ? [...new Set([...list, id])] : list.filter((x) => x !== id));

  const value = useMemo(
    () => ({
      entries,
      unreadCount,
      isLoading: eventsLoading || alertsLoading,
      setRead: (id: string, read: boolean) => update((s) => ({ ...s, read: toggle(s.read, id, read) })),
      markAllRead: () => update((s) => ({ ...s, read: [...new Set([...s.read, ...entries.map((e) => e.id)])] })),
      setArchived: (id: string, archived: boolean) =>
        update((s) => ({ read: toggle(s.read, id, true), archived: toggle(s.archived, id, archived) })),
    }),
    [entries, unreadCount, eventsLoading, alertsLoading, update]
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}
