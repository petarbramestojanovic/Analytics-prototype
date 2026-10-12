import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui';
import { focusRing } from '@/components/ui/buttonStyles';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { FormField } from './FormField';
import type { TextFieldProps } from './TextField';

/** A TextField with a show/hide toggle. */
export const PasswordField = forwardRef<HTMLInputElement, Omit<TextFieldProps, 'type'>>(function PasswordField(
  { label, error, help, ...props },
  ref
) {
  const [visible, setVisible] = useState(false);
  const { t } = useI18n();
  const toggleLabel = visible ? t('common.hidePassword') : t('common.showPassword');
  return (
    <FormField label={label} error={error} help={help}>
      <div className="relative">
        <Input ref={ref} type={visible ? 'text' : 'password'} className="pr-10" aria-invalid={!!error || undefined} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={toggleLabel}
          aria-pressed={visible}
          title={toggleLabel}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
            focusRing
          )}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </FormField>
  );
});
