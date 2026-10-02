import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/cn';

const ROW_BOX = 'flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-3 dark:border-white/10';

/**
 * A value the user can see but not edit here — Salesforce-owned campaign
 * fields, the account email. The lock says "this is set somewhere else".
 * `boxed` draws it as its own bordered row; otherwise it's a divider row for
 * a definition-list grid.
 */
export function ReadOnlyRow({ label, value, boxed = false }: { label: ReactNode; value: ReactNode; boxed?: boolean }) {
  return (
    <div
      className={
        boxed
          ? cn(ROW_BOX, 'py-2')
          : 'flex items-baseline justify-between gap-4 border-b border-gray-100 pb-2 dark:border-white/5'
      }
    >
      <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
        {value}
        <Lock size={11} className="text-gray-300 dark:text-gray-600" />
      </dd>
    </div>
  );
}

/** A settings row: title and hint on the left, the control on the right. */
export function SettingRow({ title, hint, control }: { title: ReactNode; hint?: ReactNode; control: ReactNode }) {
  return (
    <div className={cn(ROW_BOX, 'py-2.5')}>
      <div className="pr-4">
        <div className="text-sm font-medium text-brame-dark dark:text-gray-100">{title}</div>
        {hint && <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
      </div>
      {control}
    </div>
  );
}

/** A bordered row in a short list (sessions, clicktags). */
export function ListRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(ROW_BOX, 'py-2.5', className)}>{children}</div>;
}
