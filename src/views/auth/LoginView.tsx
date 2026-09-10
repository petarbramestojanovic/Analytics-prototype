import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { usePageTitle } from '../../lib/usePageTitle';
import { Button } from '../../components/primitives';
import AuthLayout from './AuthLayout';
import { Field, PasswordField } from './fields';

export default function LoginView() {
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
    navigate('/overview');
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{t('auth.login.title')}</h1>
      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{t('auth.login.subtitle')}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field
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
          <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brame-teal focus:ring-brame-teal dark:border-white/20 dark:bg-brame-dark-light"
            />
            {t('auth.login.rememberMe')}
          </label>
          <Link to="/forgot-password" className="font-medium text-brame-teal hover:underline dark:text-brame-turquoise-light">
            {t('auth.login.forgot')}
          </Link>
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
        to="/campaigns"
        className="block w-full rounded-lg border border-gray-300 py-2 text-center text-sm font-medium text-brame-dark transition-colors hover:bg-gray-50 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5"
      >
        {t('auth.login.continueDemo')}
      </Link>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        {t('auth.login.noAccount')}{' '}
        <Link to="/signup" className="font-medium text-brame-teal hover:underline dark:text-brame-turquoise-light">
          {t('auth.login.signUp')}
        </Link>
      </p>
    </AuthLayout>
  );
}
