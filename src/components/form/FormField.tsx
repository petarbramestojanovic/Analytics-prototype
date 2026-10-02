import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Tooltip } from '@/components/ui';

/**
 * A field's label. `default` is the form-dialog label; `caps` is the small
 * uppercase label used on dense settings panels (campaign setup, compare
 * pickers). `hint` adds an (i) tooltip next to it.
 */
export function FieldLabel({
  children,
  variant = 'default',
  hint,
  htmlFor,
  className,
}: {
  children: ReactNode;
  variant?: 'default' | 'caps';
  hint?: string;
  htmlFor?: string;
  className?: string;
}) {
  const Tag = htmlFor ? 'label' : 'span';
  return (
    <Tag
      htmlFor={htmlFor}
      className={cn(
        'flex items-center gap-1.5',
        variant === 'caps'
          ? 'mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400'
          : 'mb-1.5 text-sm font-medium text-brame-dark dark:text-gray-200',
        className
      )}
    >
      {children}
      {hint && <Tooltip text={hint} />}
    </Tag>
  );
}

/** The line under a field: an error when there is one, otherwise the help
 *  text (if any). */
export function FieldMessage({ error, help }: { error?: ReactNode; help?: ReactNode }) {
  if (error) return <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>;
  if (help) return <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{help}</p>;
  return null;
}

/**
 * Label + control + error/help — the frame every form field sits in. Wraps
 * the control in a `<label>` so clicking the label focuses it.
 */
export function FormField({
  label,
  labelVariant,
  labelHint,
  error,
  help,
  children,
  className,
}: {
  label: ReactNode;
  labelVariant?: 'default' | 'caps';
  labelHint?: string;
  error?: ReactNode;
  help?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <FieldLabel variant={labelVariant} hint={labelHint}>
        {label}
      </FieldLabel>
      {children}
      <FieldMessage error={error} help={help} />
    </label>
  );
}
