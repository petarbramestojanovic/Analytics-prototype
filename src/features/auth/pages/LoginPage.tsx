import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button, Checkbox } from '@/components/ui';
import { PasswordField, TextField } from '@/components/form';
import { TextLink } from '@/components/display';
import { AuthLayout } from '../components/AuthLayout';
import { AuthHeader, AuthSwitchPrompt } from '../components/AuthParts';

export function LoginPage() {
  const { t } = useI18n();
  usePageTitle(t('auth.login.title'));
  const navigate = useNavigate();
  const [email, setEmail] = useState('petra.lang@migros.ch');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);

  // Prototype: there is no backend to authenticate against, so submitting
  // simply moves on — the point of this screen is the flow, not the check.
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate(paths.overview);
  };

  return (
    <AuthLayout>
      <AuthHeader title={t('auth.login.title')} subtitle={t('auth.login.subtitle')} />

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <TextField
          label={t('auth.login.email')}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <PasswordField
          label={t('auth.login.password')}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between text-sm">
          <Checkbox
            label={t('auth.login.rememberMe')}
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="items-center"
          />
          <TextLink to={paths.forgotPassword} variant="inline">
            {t('auth.login.forgot')}
          </TextLink>
        </div>

        <Button type="submit" variant="primary" icon={<LogIn size={15} />}>
          {t('auth.login.submit')}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
        <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
        {t('auth.login.or')}
        <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
      </div>

      <Link
        to={paths.campaigns}
        className="block w-full rounded-lg border border-gray-300 py-2 text-center text-sm font-medium text-brame-dark transition-colors hover:bg-gray-50 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5"
      >
        {t('auth.login.continueDemo')}
      </Link>

      <AuthSwitchPrompt prompt={t('auth.login.noAccount')} linkLabel={t('auth.login.signUp')} to={paths.signup} />
    </AuthLayout>
  );
}
