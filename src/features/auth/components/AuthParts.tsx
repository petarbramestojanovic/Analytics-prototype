import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';

/** An auth screen's title and one-line explanation. */
export function AuthHeader({ title, subtitle, centered = false }: { title: string; subtitle: string; centered?: boolean }) {
  return (
    <div className={cn(centered && 'text-center')}>
      <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{title}</h1>
      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
    </div>
  );
}

const RESULT_TONE = {
  teal: 'bg-brame-teal/10 text-brame-teal dark:bg-brame-teal/20 dark:text-brame-turquoise-light',
  green: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
} as const;

/** The "done" state an auth flow ends on — icon, title, explanation, and
 *  whatever comes next. */
export function AuthResult({
  icon,
  tone,
  title,
  body,
  children,
}: {
  icon: ReactNode;
  tone: keyof typeof RESULT_TONE;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <>
      <div className="flex justify-center">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', RESULT_TONE[tone])}>{icon}</div>
      </div>
      <div className="mt-4">
        <AuthHeader title={title} subtitle={body} centered />
      </div>
      {children}
    </>
  );
}

export function BackToLoginLink() {
  const { t } = useI18n();
  return (
    <Link
      to={paths.login}
      className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brame-dark dark:text-gray-400 dark:hover:text-white"
    >
      <ArrowLeft size={14} />
      {t('auth.forgot.backToLogin')}
    </Link>
  );
}

/** "Don't have an account? Sign up" — a prompt with an inline link. */
export function AuthSwitchPrompt({ prompt, linkLabel, to }: { prompt: string; linkLabel: string; to: string }) {
  return (
    <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
      {prompt}{' '}
      <Link to={to} className="font-medium text-brame-teal hover:underline dark:text-brame-turquoise-light">
        {linkLabel}
      </Link>
    </p>
  );
}
