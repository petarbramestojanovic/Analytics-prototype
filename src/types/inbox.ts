import type { EmailReport, ReportRun } from './report';

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
      /** Who it covers (the client, account or campaign) — report names repeat
       *  across clients, so the list needs this to tell them apart. */
      scopeName: string;
      /** A scheduled run lands here whether it worked or not. Someone pressing
       *  Run now never does — they already know — it is only on the history. */
      status: ReportRun['status'];
      recipientCount: number;
      format: EmailReport['format'];
      failureReason?: string;
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
