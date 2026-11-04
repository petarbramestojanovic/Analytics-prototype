import type { EmailReport } from './report';

/** What kind of thing happened — drives the icon, the filter and which seats
 *  get it. */
export type InboxKind = 'alert' | 'report' | 'invitation';

/**
 * An event the backend writes for the inbox when something happens. Triggered
 * alerts are the exception: this prototype derives them from the live alert
 * log instead of storing them, so they have no stored form here. Whether a
 * person has read or archived an event is theirs alone and lives apart from it
 * (features/inbox).
 */
export type InboxEvent =
  | {
      id: string;
      kind: 'report';
      createdAt: string;
      reportId: string;
      reportName: string;
      recipientCount: number;
      format: EmailReport['format'];
    }
  | {
      id: string;
      kind: 'invitation';
      createdAt: string;
      /** The seat the new member joined — its admins are the ones told. */
      seatId: string;
      seatName: string;
      memberName: string;
      memberEmail: string;
    };
