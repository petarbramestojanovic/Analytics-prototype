import { cn } from '@/lib/cn';

/** On/off toggle. */
export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      aria-label={label}
      className={cn(
        'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-60',
        checked ? 'bg-brame-teal' : 'bg-gray-300 dark:bg-white/15'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
          checked ? 'left-[22px]' : 'left-0.5'
        )}
      />
    </button>
  );
}
