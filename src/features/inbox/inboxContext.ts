import { createStrictContext } from '@/lib/createStrictContext';
import type { InboxEntry } from './types';

export interface Inbox {
  /** Everything this person may see and hasn't switched off, newest first —
   *  archived ones included, flagged. */
  entries: InboxEntry[];
  unreadCount: number;
  isLoading: boolean;
  setRead: (id: string, read: boolean) => void;
  markAllRead: () => void;
  setArchived: (id: string, archived: boolean) => void;
}

export const [InboxContext, useInbox] = createStrictContext<Inbox>('Inbox');
