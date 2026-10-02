import { BarChart3, Building2, Menu, RefreshCw, ShieldCheck } from 'lucide-react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/i18n';
import { IconButton, Pill } from '@/components/ui';
import { useScopeLabel, useSession } from '@/features/session';
import { LanguageSwitch, ThemeToggleButton } from '@/features/preferences';

/**
 * The sticky top bar — tenant-scope indicator, refresh/language/theme
 * controls, and the mobile menu button. Only the mobile menu toggle is a
 * prop, since that state belongs to AppLayout's drawer.
 */
export function TopBar({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { seatCategory, isInternal } = useSession();
  const scopeLabel = useScopeLabel();
  const { t } = useI18n();
  const ScopeIcon = !isInternal ? Building2 : seatCategory === 'brame' ? BarChart3 : ShieldCheck;

  return (
    <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/70 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-brame-dark/70 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <button
            onClick={onOpenMobileMenu}
            aria-label={t('nav.openMenu')}
            title={t('nav.openMenu')}
            className="-ml-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-brame-dark transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-white/10 lg:hidden"
          >
            <Menu size={18} />
          </button>
          <ScopeIcon size={14} className="flex-shrink-0" />
          <span className="max-w-[40vw] truncate font-medium text-brame-dark dark:text-gray-100 sm:max-w-none">
            {scopeLabel}
          </span>
          <Pill
            tone={!isInternal || seatCategory === 'brame' ? 'teal' : 'purple'}
            className="hidden sm:inline-flex"
          >
            {isInternal ? t('topbar.allTenants') : t('topbar.rlsScope')}
          </Pill>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-3">
          <RefreshDataButton />
          <LanguageSwitch />
          <ThemeToggleButton />
          <Pill tone="amber" className="hidden sm:inline-flex">
            {t('common.prototypeBadge')}
          </Pill>
        </div>
      </div>
    </div>
  );
}

/**
 * The RFC's dashboard reads are pull-based — nightly sync plus a manual
 * refresh, not a live feed — so this invalidates every TanStack Query cache
 * entry rather than polling. The spin reflects genuine in-flight fetches
 * (useIsFetching), not just "was clicked".
 */
function RefreshDataButton() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const fetching = useIsFetching() > 0;

  return (
    <IconButton
      label={fetching ? t('common.refreshing') : t('common.refresh')}
      icon={<RefreshCw size={14} className={fetching ? 'animate-spin' : ''} />}
      onClick={() => queryClient.invalidateQueries()}
      disabled={fetching}
    />
  );
}
