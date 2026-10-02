import type { ReactNode } from 'react';
import { Switch } from '@/components/ui';

/** A labelled on/off setting inside a form, with optional help text. */
export function SwitchField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span>
        <span className="block text-sm font-medium text-brame-dark dark:text-gray-200">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-gray-400 dark:text-gray-500">{hint}</span>}
      </span>
      <Switch checked={checked} onChange={onChange} />
    </label>
  );
}
