import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Layers, RefreshCw, ShieldCheck } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { BrandMark } from '@/components/display';
import { LanguageSwitch, ThemeToggleButton } from '@/features/preferences';

const POINT_ICONS = [Layers, RefreshCw, ShieldCheck] as const;

/** The signed-out shell — brand panel on the left (desktop), the form in a card on the right. */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const points = [t('auth.brandPoint1'), t('auth.brandPoint2'), t('auth.brandPoint3')];

  return (
    <div className="flex min-h-dvh bg-brame-canvas dark:bg-brame-dark">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-brame-teal-dark via-brame-teal to-brame-teal-light p-12 text-white lg:flex">
        {/* Decoration only: a faint grid and two soft glows, so the panel isn't a flat slab. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_30%_40%,black,transparent_75%)]"
        />
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brame-lime/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-brame-turquoise/20 blur-3xl" />

        <Link to={paths.login} className="relative w-fit">
          <BrandMark size="lg" />
        </Link>

        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
            <span className="h-1.5 w-1.5 rounded-full bg-brame-lime" />
            {t('auth.brandEyebrow')}
          </span>
          <h1 className="mt-5 text-4xl font-medium leading-tight tracking-tight">{t('auth.brandHeadline')}</h1>
          <p className="mt-4 text-base leading-relaxed text-white/80">{t('auth.brandBody')}</p>
          <ul className="mt-10 space-y-4">
            {points.map((point, i) => {
              const Icon = POINT_ICONS[i];
              return (
                <li key={point} className="flex items-center gap-3.5 text-sm text-white/90">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                    <Icon size={17} className="text-brame-lime" />
                  </span>
                  <span>{point}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative text-xs text-white/60">{t('auth.prototypeNotice')}</div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between p-6">
          <Link to={paths.login} className="lg:hidden">
            <BrandMark compact onDark={false} />
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <LanguageSwitch />
            <ThemeToggleButton />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-10 sm:px-6">
          <div className="w-full max-w-[26rem]">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-brame-dark-light">
              {children}
            </div>
            <p className="mt-6 text-center text-xs text-gray-400 lg:hidden dark:text-gray-500">{t('auth.prototypeNotice')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
