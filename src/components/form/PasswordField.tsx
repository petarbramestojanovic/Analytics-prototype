import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui';
import { FormField } from './FormField';
import type { TextFieldProps } from './TextField';

/** A TextField with a show/hide toggle. */
export const PasswordField = forwardRef<HTMLInputElement, Omit<TextFieldProps, 'type'>>(function PasswordField(
  { label, error, help, ...props },
  ref
) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField label={label} error={error} help={help}>
      <div className="relative">
        <Input ref={ref} type={visible ? 'text' : 'password'} className="pr-10" aria-invalid={!!error || undefined} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </FormField>
  );
});
