import { useState } from 'react';
import { useI18n } from '@/i18n';

/**
 * A new-password + confirm pair. The mismatch error appears once the
 * confirm field has been left (or the form submitted) — not on the first
 * keystroke. `validate()` marks both as touched and says whether they match.
 */
export function usePasswordConfirmation() {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);

  const mismatch = touched && confirm.length > 0 && password !== confirm;

  return {
    passwordProps: { value: password, onChange: (e: { target: { value: string } }) => setPassword(e.target.value) },
    confirmProps: {
      value: confirm,
      onChange: (e: { target: { value: string } }) => setConfirm(e.target.value),
      onBlur: () => setTouched(true),
      error: mismatch ? t('auth.signup.passwordMismatch') : undefined,
    },
    validate: () => {
      setTouched(true);
      return password === confirm;
    },
  };
}
