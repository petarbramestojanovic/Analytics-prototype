import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck, Send } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { usePageTitle } from '../../lib/usePageTitle';
import { Button } from '../../components/primitives';
import AuthLayout from './AuthLayout';
import { Field } from './fields';

export default function ForgotPasswordView() {
  const { t } = useI18n();
  usePageTitle(t('auth.forgot.title'));
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout>
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brame-teal/10 text-brame-teal dark:bg-brame-teal/20 dark:text-brame-turquoise-light">
            <MailCheck size={22} />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold text-brame-dark dark:text-white">
          {t('auth.forgot.successTitle')}
        </h1>
        <p className="mt-1.5 text-center text-sm text-gray-500 dark:text-gray-400">
          {t('auth.forgot.successBody', { email })}
        </p>

        <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-4 text-center dark:border-white/15">
          <p className="text-xs text-gray-400 dark:text-gray-500">{t('auth.forgot.devShortcut')}</p>
          <Link
            to="/reset-password"
            className="mt-2 inline-block text-sm font-medium text-brame-teal hover:underline dark:text-brame-turquoise-light"
          >
            {t('auth.forgot.continueToReset')}
          </Link>
        </div>

        <Link
          to="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brame-dark dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft size={14} />
          {t('auth.forgot.backToLogin')}
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{t('auth.forgot.title')}</h1>
      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{t('auth.forgot.subtitle')}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field
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

      <Link
        to="/login"
        className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brame-dark dark:text-gray-400 dark:hover:text-white"
      >
        <ArrowLeft size={14} />
        {t('auth.forgot.backToLogin')}
      </Link>
    </AuthLayout>
  );
}
