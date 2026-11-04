import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, ChevronLeft, ChevronsUpDown, LogOut, RefreshCw, UserCog } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { paths } from '@/config/paths';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { usePersistentState } from '@/hooks/usePersistentState';
import { codecs } from '@/lib/storage';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import {
  Avatar,
  IconButton,
  useLabelTip,
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
import { useInbox } from '@/features/inbox';
import { LanguageSwitch, ThemeToggleButton } from '@/features/preferences';
import { NAV_SECTIONS, NAV_TOP_ITEMS, type NavSectionConfig } from '../navigation';
import { NavItem, NavSection } from './NavItem';

/**
 * Shared between the desktop rail (`<aside>`) and the mobile drawer so both
 * render byte-for-byte the same nav/role-switcher/profile UI. `collapsed` is
 * always `false` when rendered inside the drawer — the rail-collapse
 * affordance doesn't mean anything in an overlay.
 */
export function Sidebar({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: () => void }) {
  const session = useSession();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  // Same log (and same thresholds) the Alerts page itself shows, so the badge
  // and the page never disagree on how many campaigns need attention.
  const { investigateCount } = useAlertLog();
  const { unreadCount } = useInbox();
  const badges = { alerts: investigateCount, inbox: unreadCount };

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
          <RailButton
            label={t('nav.expand')}
            onClick={onToggleCollapsed}
            className="ml-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brame-lime text-brame-teal shadow-lg ring-2 ring-white/15 transition-transform hover:scale-105"
          >
            <Activity className="h-5 w-5" />
          </RailButton>
        ) : (
          <>
            <BrandMark className="flex-1 overflow-hidden" />
            <RailButton
              label={t('nav.collapse')}
              onClick={onToggleCollapsed}
              className="hidden flex-shrink-0 rounded-lg p-1 transition-colors hover:bg-brame-teal-light lg:inline-flex"
            >
              <ChevronLeft size={18} />
            </RailButton>
          </>
        )}
      </div>

      <nav className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden py-3">
        <div className="space-y-0.5">
          {NAV_TOP_ITEMS.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              label={t(item.labelKey)}
              icon={item.icon}
              collapsed={collapsed}
              badge={item.badge ? badges[item.badge] : undefined}
            />
          ))}
        </div>
        {sections.map((section) => (
          <NavSection
            key={section.labelKey}
            label={t(section.labelKey)}
            collapsed={collapsed}
            collapsible={section.collapsible}
            open={!section.collapsible || !!openGroups[section.labelKey]}
            onToggle={() => toggleGroup(section.labelKey)}
            badge={sectionBadge(section)}
          >
            {section.items.filter((item) => !item.access || hasAccess(session, item.access)).map((item) => (
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
      {/* Phone-only: the controls the slim top bar gives up. */}
      {!collapsed && (
        <div className="flex items-center gap-2 px-4 pb-3 sm:hidden">
          <LanguageSwitch />
          <ThemeToggleButton />
          <IconButton
            label={t('common.refresh')}
            icon={<RefreshCw size={14} />}
            onClick={() => queryClient.invalidateQueries()}
          />
        </div>
      )}
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
  // Collapsed, the avatar is all there is to read: the tooltip names the account.
  const tip = useLabelTip<HTMLButtonElement>(user.name, { side: 'right', detail: user.scopeLabel, disabled: !collapsed });

  return (
    <div className={cn('border-t border-brame-teal-light', collapsed ? 'p-2' : 'p-3')}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            ref={tip.ref}
            {...tip.bind}
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

      {tip.tip}
      <ProfileSettingsModal open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}

/** A button in the sidebar's header, with a tooltip to its right. */
function RailButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  const { ref, bind, tip } = useLabelTip<HTMLButtonElement>(label, { side: 'right' });
  return (
    <>
      <button ref={ref} {...bind} onClick={onClick} aria-label={label} className={className}>
        {children}
      </button>
      {tip}
    </>
  );
}
