import { BellRing, Send, UserPlus, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { InboxKind } from '@/types';
import type { InboxTone } from '../types';

const ICONS: Record<InboxKind, LucideIcon> = { alert: BellRing, report: Send, invitation: UserPlus };

const TONES: Record<InboxTone, string> = {
  red: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  teal: 'bg-brame-teal/10 text-brame-teal dark:bg-brame-teal/25 dark:text-brame-turquoise-light',
};

/** The round, tinted icon that tells an inbox item's kind at a glance. */
export function InboxKindIcon({ kind, tone, size = 32 }: { kind: InboxKind; tone: InboxTone; size?: number }) {
  const Icon = ICONS[kind];
  return (
    <span
      style={{ width: size, height: size }}
      className={cn('flex flex-shrink-0 items-center justify-center rounded-full', TONES[tone])}
    >
      <Icon size={Math.round(size * 0.5)} />
    </span>
  );
}
