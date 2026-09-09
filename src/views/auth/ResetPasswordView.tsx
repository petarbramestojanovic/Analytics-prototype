import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, KeyRound, LogIn } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { usePageTitle } from '../../lib/usePageTitle';
import { Button } from '../../components/primitives';
import AuthLayout from './AuthLayout';
import { PasswordField } from './fields';

export default function ResetPasswordView() {
  const { t } = useI18n();
  usePageTitle(t('auth.reset.title'));
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);

  const mismatch = touched && confirm.length > 0 && password !== confirm;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (password !== confirm) return;
    setDone(true);
  };

  if (done) {
    return (
      <AuthLayout>
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300">
            <CheckCircle2 size={22} />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold text-brame-dark dark:text-white">
          {t('auth.reset.successTitle')}
        </h1>
        <p className="mt-1.5 text-center text-sm text-gray-500 dark:text-gray-400">
          {t('auth.reset.successBody')}
        </p>
        <Link to="/login" className="mt-6 block">
          <Button variant="primary" icon={<LogIn size={15} />}>
            {t('auth.reset.goToLogin')}
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{t('auth.reset.title')}</h1>
      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{t('auth.reset.subtitle')}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <PasswordField
          label={t('auth.reset.password')}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <div>
          <PasswordField
            label={t('auth.reset.confirmPassword')}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onBlur={() => setTouched(true)}
            autoComplete="new-password"
          />
          {mismatch && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{t('auth.signup.passwordMismatch')}</p>
          )}
        </div>
        <Button type="submit" variant="primary" icon={<KeyRound size={15} />}>
          {t('auth.reset.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}
