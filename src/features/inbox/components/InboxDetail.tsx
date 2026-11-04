import { Archive, ArchiveRestore, ArrowLeft, ArrowRight, MailOpen, Mail } from 'lucide-react';
import { useFormatters, useI18n } from '@/i18n';
import { Button, ButtonLink, Pill } from '@/components/ui';
import type { InboxEntry } from '../types';
import { InboxKindIcon } from './inboxKind';

/** The right pane: everything about the selected item, and what to do next. */
export function InboxDetail({
  entry,
  onBack,
  onToggleRead,
  onToggleArchive,
}: {
  entry: InboxEntry;
  /** Set on small screens, where the detail replaces the list. */
  onBack?: () => void;
  onToggleRead: () => void;
  onToggleArchive: () => void;
}) {
  const { t } = useI18n();
  const { fmtDateLong, fmtTime } = useFormatters();

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-5 py-3 dark:border-white/10">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brame-teal dark:text-gray-400 dark:hover:text-brame-turquoise-light"
          >
            <ArrowLeft size={14} />
            {t('inbox.back')}
          </button>
        ) : (
          <Pill tone={entry.kind === 'alert' ? 'red' : entry.kind === 'report' ? 'green' : 'teal'}>
            {t(`inbox.kind.${entry.kind}`)}
          </Pill>
        )}
        <div className="flex items-center gap-2">
          <Button size="sm" icon={entry.read ? <Mail size={12} /> : <MailOpen size={12} />} onClick={onToggleRead}>
            {entry.read ? t('inbox.markUnread') : t('inbox.markRead')}
          </Button>
          <Button
            size="sm"
            icon={entry.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
            onClick={onToggleArchive}
          >
            {entry.archived ? t('inbox.unarchive') : t('inbox.archive')}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex items-start gap-3">
          <InboxKindIcon kind={entry.kind} tone={entry.tone} size={40} />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-brame-dark dark:text-white">{entry.title}</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{entry.summary}</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {fmtDateLong(entry.createdAt)} · {fmtTime(entry.createdAt)}
            </p>
          </div>
        </div>

        <dl className="mt-6 divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-white/5 dark:border-white/10">
          {entry.facts.map((fact) => (
            <div key={fact.label} className="flex items-baseline justify-between gap-6 px-4 py-2.5 text-sm">
              <dt className="flex-shrink-0 text-gray-500 dark:text-gray-400">{fact.label}</dt>
              <dd className="min-w-0 break-words text-right font-medium text-brame-dark dark:text-gray-100">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          {entry.actions.map((action, i) => (
            <ButtonLink key={action.to} to={action.to} variant={i === 0 ? 'primary' : 'secondary'} icon={i === 0 ? <ArrowRight size={13} /> : undefined}>
              {action.label}
            </ButtonLink>
          ))}
        </div>
      </div>
    </div>
  );
}
