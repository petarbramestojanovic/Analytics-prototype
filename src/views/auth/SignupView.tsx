import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { usePageTitle } from '../../lib/usePageTitle';
import { Button } from '../../components/primitives';
import AuthLayout from './AuthLayout';
import { Field, PasswordField } from './fields';

export default function SignupView() {
  const { t } = useI18n();
  usePageTitle(t('auth.signup.title'));
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState(false);

  const mismatch = touched && confirm.length > 0 && password !== confirm;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (password !== confirm) return;
    // Prototype: no account is actually created — move straight into the app.
    navigate('/overview');
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{t('auth.signup.title')}</h1>
      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{t('auth.signup.subtitle')}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label={t('auth.signup.name')} required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <Field
          label={t('auth.signup.company')}
          required
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          autoComplete="organization"
        />
        <Field
          label={t('auth.signup.email')}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <PasswordField
          label={t('auth.signup.password')}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <div>
          <PasswordField
            label={t('auth.signup.confirmPassword')}
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

        <label className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            required
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brame-teal focus:ring-brame-teal dark:border-white/20 dark:bg-brame-dark-light"
          />
          <span>{t('auth.signup.terms')}</span>
        </label>

        <Button type="submit" variant="primary" icon={<UserPlus size={15} />} disabled={!agreed}>
          {t('auth.signup.submit')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        {t('auth.signup.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-brame-teal hover:underline dark:text-brame-turquoise-light">
          {t('auth.signup.signIn')}
        </Link>
      </p>
    </AuthLayout>
  );
}
