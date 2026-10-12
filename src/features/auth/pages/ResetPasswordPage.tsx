import { useState, type FormEvent } from 'react';
import { CheckCircle2, KeyRound, LogIn } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button, ButtonLink } from '@/components/ui';
import { PasswordField } from '@/components/form';
import { AuthLayout } from '../components/AuthLayout';
import { AuthHeader, AuthResult } from '../components/AuthParts';
import { usePasswordConfirmation } from '../hooks/usePasswordConfirmation';

export function ResetPasswordPage() {
  const { t } = useI18n();
  usePageTitle(t('auth.reset.title'));
  const passwords = usePasswordConfirmation();
  const [done, setDone] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (passwords.validate()) setDone(true);
  };

  return (
    <AuthLayout>
      {done ? (
        <AuthResult
          icon={<CheckCircle2 size={22} />}
          tone="green"
          title={t('auth.reset.successTitle')}
          body={t('auth.reset.successBody')}
        >
          <ButtonLink to={paths.login} className="mt-6" variant="primary" icon={<LogIn size={15} />}>
              {t('auth.reset.goToLogin')}
            </ButtonLink>
        </AuthResult>
      ) : (
        <>
          <AuthHeader title={t('auth.reset.title')} subtitle={t('auth.reset.subtitle')} />
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <PasswordField label={t('auth.reset.password')} required autoComplete="new-password" {...passwords.passwordProps} />
            <PasswordField
              label={t('auth.reset.confirmPassword')}
              required
              autoComplete="new-password"
              {...passwords.confirmProps}
            />
            <Button type="submit" variant="primary" icon={<KeyRound size={15} />}>
              {t('auth.reset.submit')}
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
