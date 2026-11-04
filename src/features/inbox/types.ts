import type { InboxKind } from '@/types';

export type InboxTone = 'red' | 'amber' | 'green' | 'teal';

/** One thing in a person's inbox, ready to show — built from an inbox event
 *  or a triggered alert, with the text already translated. */
export interface InboxItem {
  id: string;
  kind: InboxKind;
  createdAt: string;
  /** Short and scannable — the campaign, the report, the person. */
  title: string;
  /** One line under the title in the list. */
  summary: string;
  tone: InboxTone;
  /** What the detail pane shows, label then value. */
  facts: { label: string; value: string }[];
  /** Where the detail pane sends you next. */
  actions: { label: string; to: string }[];
}

/** An item plus this person's own state for it. */
export interface InboxEntry extends InboxItem {
  read: boolean;
  archived: boolean;
}
