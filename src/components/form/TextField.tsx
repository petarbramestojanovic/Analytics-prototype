import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Input } from '@/components/ui';
import { FormField } from './FormField';

export type TextFieldProps = {
  label: string;
  error?: ReactNode;
  help?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

/** A labelled text input. forwardRef so react-hook-form's register() can
 *  spread straight onto it: `<TextField label=… {...register('name')} />`. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, help, ...props },
  ref
) {
  return (
    <FormField label={label} error={error} help={help}>
      <Input ref={ref} aria-invalid={!!error || undefined} {...props} />
    </FormField>
  );
});
