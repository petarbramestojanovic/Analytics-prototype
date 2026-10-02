import type { ReactNode } from 'react';
import { FieldLabel, FieldMessage } from './FormField';

/** A form row whose value is fixed — shown, not editable (a report's scope
 *  once created, "nothing left to pick"). Same frame as an editable field. */
export function StaticField({ label, children, help }: { label: ReactNode; children: ReactNode; help?: ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <p className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 dark:border-white/15 dark:text-gray-400">
        {children}
      </p>
      <FieldMessage help={help} />
    </div>
  );
}
