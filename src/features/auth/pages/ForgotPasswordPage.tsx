import { useState, type FormEvent } from 'react';
import { MailCheck, Send } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button } from '@/components/ui';
import { TextField } from '@/components/form';
import { TextLink } from '@/components/display';
import { AuthLayout } from '../components/AuthLayout';
import { AuthHeader, AuthResult, BackToLoginLink } from '../components/AuthParts';

export function ForgotPasswordPage() {
  const { t } = useI18n();
  usePageTitle(t('auth.forgot.title'));
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <AuthLayout>
      {sent ? (
        <AuthResult
          icon={<MailCheck size={22} />}
          tone="teal"
          title={t('auth.forgot.successTitle')}
          body={t('auth.forgot.successBody', { email })}
        >
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-4 text-center dark:border-white/15">
            <p className="text-xs text-gray-400 dark:text-gray-500">{t('auth.forgot.devShortcut')}</p>
            <TextLink to={paths.resetPassword} variant="inline" className="mt-2 inline-block text-sm">
              {t('auth.forgot.continueToReset')}
            </TextLink>
          </div>
        </AuthResult>
      ) : (
        <>
          <AuthHeader title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')} />
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <TextField
              label={t('auth.forgot.email')}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Button type="submit" variant="primary" icon={<Send size={15} />}>
              {t('auth.forgot.submit')}
            </Button>
          </form>
        </>
      )}
      <BackToLoginLink />
    </AuthLayout>
  );
}
