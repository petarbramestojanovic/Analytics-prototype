import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Check } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { LanguageSwitch, ThemeToggleButton } from '../../components/Switches';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen bg-brame-cream dark:bg-brame-dark">
      <div className="hidden flex-1 flex-col justify-between bg-brame-teal p-10 text-white lg:flex">
        <Link to="/login" className="flex items-center gap-2">
          <Activity className="h-8 w-8 text-brame-lime" />
          <div className="leading-tight">
            <div className="text-xl font-bold">{t('common.appName')}</div>
            <div className="text-[10px] uppercase tracking-widest text-brame-lime/80">
              {t('common.appSubtitle')}
            </div>
          </div>
        </Link>

        <div className="max-w-md">
          <h1 className="text-3xl font-bold leading-tight">{t('auth.brandHeadline')}</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/80">{t('auth.brandBody')}</p>
          <ul className="mt-6 space-y-3 text-sm">
            {[t('auth.brandPoint1'), t('auth.brandPoint2'), t('auth.brandPoint3')].map((point) => (
              <li key={point} className="flex items-start gap-2">
                <Check size={16} className="mt-0.5 flex-shrink-0 text-brame-lime" />
                <span className="text-white/90">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-xs text-white/50">{t('auth.prototypeNotice')}</div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between p-6">
          <Link to="/login" className="flex items-center gap-2 lg:hidden">
            <Activity className="h-6 w-6 text-brame-teal dark:text-brame-lime" />
            <span className="font-bold text-brame-dark dark:text-white">{t('common.appName')}</span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <LanguageSwitch />
            <ThemeToggleButton />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
