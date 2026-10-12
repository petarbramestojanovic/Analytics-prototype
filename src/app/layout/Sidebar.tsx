import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, ChevronLeft, ChevronsUpDown, LogOut, UserCog } from 'lucide-react';
import { paths } from '@/config/paths';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { usePersistentState } from '@/hooks/usePersistentState';
import { codecs } from '@/lib/storage';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import { BrandMark } from '@/components/display';
import { hasAccess, useSession, ViewingAsSwitcher } from '@/features/session';
import { ProfileSettingsModal, useCurrentUser } from '@/features/profile';
import { useAlertLog } from '@/features/alerts';
import { NAV_SECTIONS, type NavSectionConfig } from '../navigation';
import { NavItem, NavSection } from './NavItem';

/**
 * Shared between the desktop rail (`<aside>`) and the mobile drawer so both
 * render byte-for-byte the same nav/role-switcher/profile UI. `collapsed` is
 * always `false` when rendered inside the drawer — the rail-collapse
 * affordance doesn't mean anything in an overlay.
 */
export function Sidebar({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: () => void }) {
  const session = useSession();
  const { t } = useI18n();
  // Same log (and same thresholds) the Alerts page itself shows, so the badge
  // and the page never disagree on how many campaigns need attention.
  const { investigateCount } = useAlertLog();
  const badges = { alerts: investigateCount };

  const sections = NAV_SECTIONS.filter((s) => hasAccess(session, s.access));
  const [openGroups, setOpenGroups] = usePersistentState<Record<string, boolean>>(
    STORAGE_KEYS.sidebarGroups,
    {},
    codecs.json<Record<string, boolean>>()
  );
  const toggleGroup = (key: string) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  // Unfold the group holding the current page, so the active item is never
  // hidden. Only on navigation — the user can still fold it afterwards.
  const { pathname } = useLocation();
  useEffect(() => {
    const active = NAV_SECTIONS.find((s) => s.collapsible && s.items.some((item) => matchesPath(item.to, pathname)));
    if (active) setOpenGroups((prev) => (prev[active.labelKey] ? prev : { ...prev, [active.labelKey]: true }));
  }, [pathname, setOpenGroups]);

  const sectionBadge = (section: NavSectionConfig) =>
    section.items.reduce((sum, item) => sum + (item.badge ? badges[item.badge] : 0), 0);

  return (
    <>
      <div className="flex min-h-[65px] items-center border-b border-brame-teal-light p-4">
        {collapsed ? (
          // Floating circular badge rather than a cramped icon squeezed
          // against a chevron — click it to expand.
          <button
            onClick={onToggleCollapsed}
            aria-label={t('nav.expand')}
            title={t('nav.expand')}
            className="ml-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brame-lime text-brame-teal shadow-lg ring-2 ring-white/15 transition-transform hover:scale-105"
          >
            <Activity className="h-5 w-5" />
          </button>
        ) : (
          <>
            <BrandMark className="flex-1 overflow-hidden" />
            <button
              onClick={onToggleCollapsed}
              aria-label={t('nav.collapse')}
              title={t('nav.collapse')}
              className="hidden flex-shrink-0 rounded-lg p-1 transition-colors hover:bg-brame-teal-light lg:inline-flex"
            >
              <ChevronLeft size={18} />
            </button>
          </>
        )}
      </div>

      <nav className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden py-3">
        {sections.map((section, i) => (
          <NavSection
            key={section.labelKey}
            label={t(section.labelKey)}
            collapsed={collapsed}
            first={i === 0}
            collapsible={section.collapsible}
            open={!section.collapsible || !!openGroups[section.labelKey]}
            onToggle={() => toggleGroup(section.labelKey)}
            badge={sectionBadge(section)}
          >
            {section.items.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                label={t(item.labelKey)}
                icon={item.icon}
                collapsed={collapsed}
                badge={item.badge ? badges[item.badge] : undefined}
              />
            ))}
          </NavSection>
        ))}
      </nav>

      {/* Stand-in for the auth session. Demonstrates that authorization is
          tenant-scoped rather than a UI filter. */}
      {!collapsed && <ViewingAsSwitcher />}

      <AccountMenu collapsed={collapsed} />
    </>
  );
}

/** Same prefix rule NavLink uses for its active state, minus any query string
 *  (e.g. `paths.setup()` vs. `/admin/setup?campaign=…`). */
function matchesPath(to: string, pathname: string) {
  const base = to.split('?')[0];
  return pathname === base || pathname.startsWith(`${base}/`);
}

function AccountMenu({ collapsed }: { collapsed: boolean }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className={cn('border-t border-brame-teal-light', collapsed ? 'p-2' : 'p-3')}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            title={collapsed ? user.name : undefined}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg py-2 text-left transition-colors hover:bg-brame-teal-light',
              collapsed ? 'justify-center px-0' : 'px-2'
            )}
          >
            <Avatar name={user.name} imageUrl={user.avatarUrl} size={32} />
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{user.name}</div>
                  <div className="truncate text-xs text-white/60">{user.scopeLabel}</div>
                </div>
                <ChevronsUpDown size={14} className="flex-shrink-0 text-white/50" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={collapsed ? 'start' : 'end'}>
          <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
            <UserCog size={13} />
            {t('account.profileSettings')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => navigate(paths.login)}>
            <LogOut size={13} />
            {t('viewingAs.logOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileSettingsModal open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}
