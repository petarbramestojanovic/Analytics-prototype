import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  BellRing,
  Building2,
  Cable,
  ChevronLeft,
  ChevronsUpDown,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  UserCog,
} from 'lucide-react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { companies } from '../mock/data';
import { useSession, defaultPerson } from '../lib/session';
import { useProfile } from '../lib/profile';
import { useI18n } from '../lib/i18n';
import { useCampaigns } from '../hooks/useCampaigns';
import { useAlertThresholds } from '../lib/alertSettings';
import { computePortfolioAlerts } from '../lib/divergence';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Pill } from './primitives';
import { LanguageSwitch, ThemeToggleButton } from './Switches';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Drawer, DrawerContent } from './ui/drawer';
import Avatar from './Avatar';
import ProfileSettingsModal from './ProfileSettingsModal';

const clientNav = [
  { to: '/overview', key: 'nav.overview', icon: LayoutDashboard },
  { to: '/campaigns', key: 'nav.campaigns', icon: FolderKanban },
  { to: '/reports', key: 'nav.reports', icon: Send },
];

/** Cross-client comparison. Needs every tenant's numbers to mean anything, so
 *  it sits behind isInternal (Brame staff + sales) rather than isAdmin. */
const salesNav = [{ to: '/benchmarks', key: 'nav.benchmarks', icon: BarChart3 }];

const adminNav = [
  { to: '/admin/setup', key: 'nav.setup', icon: Settings2 },
  { to: '/admin/connectors', key: 'nav.connectors', icon: Cable },
  { to: '/admin/companies', key: 'nav.companies', icon: Building2 },
  { to: '/admin/alerts', key: 'nav.alerts', icon: BellRing },
];

const MIN_WIDTH = 216;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 264;
const COLLAPSED_WIDTH = 76;

function readStoredWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_WIDTH;
  const stored = Number(window.localStorage.getItem('brame-sidebar-width'));
  return stored >= MIN_WIDTH && stored <= MAX_WIDTH ? stored : DEFAULT_WIDTH;
}

export default function Layout({ children }: { children: ReactNode }) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem('brame-sidebar-collapsed') === '1'
  );
  const [width, setWidth] = useState(readStoredWidth);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { role, companyName } = useSession();
  const { t } = useI18n();
  const location = useLocation();

  // Below `lg` the sidebar is a drawer, not an inline rail, so the persisted
  // desktop collapse state simply stops being applied — it's untouched and
  // reapplies as-is once the viewport crosses back above the breakpoint.
  const effectiveCollapsed = isDesktop && collapsed;

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    window.localStorage.setItem('brame-sidebar-collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    window.localStorage.setItem('brame-sidebar-width', String(width));
  }, [width]);

  const onResizeStart = useCallback(
    (e: ReactMouseEvent) => {
      if (effectiveCollapsed) return;
      e.preventDefault();
      draggingRef.current = true;
      setDragging(true);
    },
    [effectiveCollapsed]
  );

  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      if (!draggingRef.current) return;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX)));
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  useEffect(() => {
    if (!dragging) return;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragging]);

  return (
    <div className="flex h-screen overflow-hidden bg-brame-cream dark:bg-brame-dark">
      {isDesktop ? (
        <aside
          style={{ width: effectiveCollapsed ? COLLAPSED_WIDTH : width }}
          className={`relative flex flex-shrink-0 flex-col bg-brame-teal text-white ${
            dragging ? '' : 'transition-[width] duration-200'
          }`}
        >
          <SidebarContent collapsed={effectiveCollapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} />

          {!effectiveCollapsed && (
            <div
              onMouseDown={onResizeStart}
              role="separator"
              aria-orientation="vertical"
              aria-label={t('nav.resize')}
              className="group absolute inset-y-0 right-0 w-2 cursor-col-resize touch-none"
            >
              <div className="mx-auto h-full w-px bg-white/0 transition-colors group-hover:bg-white/40" />
            </div>
          )}
        </aside>
      ) : (
        <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
          <DrawerContent title={t('common.appName')}>
            <SidebarContent collapsed={false} onToggleCollapsed={() => setMobileOpen(false)} />
          </DrawerContent>
        </Drawer>
      )}

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/70 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-brame-dark/70 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <button
                onClick={() => setMobileOpen(true)}
                aria-label={t('nav.openMenu')}
                title={t('nav.openMenu')}
                className="-ml-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-brame-dark transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-white/10 lg:hidden"
              >
                <Menu size={18} />
              </button>
              {role === 'company_user' ? (
                <>
                  <Building2 size={14} className="flex-shrink-0" />
                  <span className="max-w-[40vw] truncate font-medium text-brame-dark dark:text-gray-100 sm:max-w-none">
                    {companyName}
                  </span>
                  <Pill tone="teal" className="hidden sm:inline-flex">
                    {t('topbar.rlsScope')}
                  </Pill>
                </>
              ) : (
                <>
                  {role === 'sales' ? (
                    <BarChart3 size={14} className="flex-shrink-0" />
                  ) : (
                    <ShieldCheck size={14} className="flex-shrink-0" />
                  )}
                  <span className="max-w-[40vw] truncate font-medium text-brame-dark dark:text-gray-100 sm:max-w-none">
                    {role === 'sales' ? t('topbar.brameSales') : t('topbar.brameInternal')}
                  </span>
                  <Pill tone={role === 'sales' ? 'teal' : 'purple'} className="hidden sm:inline-flex">
                    {t('topbar.allTenants')}
                  </Pill>
                </>
              )}
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
        {children}
      </main>
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
  const fetching = useIsFetching();

  return (
    <button
      onClick={() => queryClient.invalidateQueries()}
      disabled={fetching > 0}
      aria-label={fetching > 0 ? t('common.refreshing') : t('common.refresh')}
      title={fetching > 0 ? t('common.refreshing') : t('common.refresh')}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:text-brame-dark disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:text-white"
    >
      <RefreshCw size={14} className={fetching > 0 ? 'animate-spin' : ''} />
    </button>
  );
}

/**
 * Shared between the desktop rail (`<aside>`) and the mobile drawer so both
 * render byte-for-byte the same nav/role-switcher/profile UI. `collapsed` is
 * always `false` when rendered inside the drawer — the rail-collapse
 * affordance doesn't mean anything in an overlay.
 */
function SidebarContent({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const { role, setRole, companyId, setCompanyId, companyName, isInternal, isAdmin } = useSession();
  const { customName, avatarDataUrl } = useProfile();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  // Investigate-severity count for the Alerts nav badge — same computation
  // (and same thresholds) the Alerts page itself uses, so the two never
  // disagree on how many campaigns currently need attention.
  const { data: campaignsForAlerts } = useCampaigns();
  const alertThresholds = useAlertThresholds();
  const investigateCount = useMemo(
    () =>
      campaignsForAlerts
        ? computePortfolioAlerts(campaignsForAlerts, alertThresholds).filter((r) => r.read === 'investigate').length
        : 0,
    [campaignsForAlerts, alertThresholds]
  );
  const navBadges: Record<string, number> = { '/admin/alerts': investigateCount };

  const person = defaultPerson(role, companyId);
  const displayName = customName ?? person.name;
  const org = isInternal ? t('topbar.brameInternal') : companyName;

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
            <div className="flex flex-1 items-center gap-2 overflow-hidden">
              <Activity className="h-7 w-7 flex-shrink-0 text-brame-lime" />
              <div className="truncate leading-tight">
                <div className="text-lg font-bold">{t('common.appName')}</div>
                <div className="text-[10px] uppercase tracking-widest text-brame-lime/80">
                  {t('common.appSubtitle')}
                </div>
              </div>
            </div>
            <button
              onClick={onToggleCollapsed}
              aria-label={t('nav.collapse')}
              title={t('nav.collapse')}
              className="flex-shrink-0 rounded-lg p-1 transition-colors hover:bg-brame-teal-light lg:inline-flex hidden"
            >
              <ChevronLeft size={18} />
            </button>
          </>
        )}
      </div>

      <nav className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden py-4">
        {!collapsed && (
          <div className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-brame-lime/60">
            {t('nav.sectionReporting')}
          </div>
        )}
        {clientNav.map((item) => (
          <NavItem key={item.to} to={item.to} label={t(item.key)} icon={item.icon} collapsed={collapsed} />
        ))}

        {isInternal && (
          <>
            {!collapsed && (
              <div className="px-4 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-brame-lime/60">
                {t('nav.sectionSales')}
              </div>
            )}
            {collapsed && <div className="mx-4 my-4 border-t border-brame-teal-light" />}
            {salesNav.map((item) => (
              <NavItem key={item.to} to={item.to} label={t(item.key)} icon={item.icon} collapsed={collapsed} />
            ))}
          </>
        )}

        {isAdmin && (
          <>
            {!collapsed && (
              <div className="px-4 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-brame-lime/60">
                {t('nav.sectionInternal')}
              </div>
            )}
            {collapsed && <div className="mx-4 my-4 border-t border-brame-teal-light" />}
            {adminNav.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                label={t(item.key)}
                icon={item.icon}
                collapsed={collapsed}
                badge={navBadges[item.to]}
              />
            ))}
          </>
        )}
      </nav>

      {/* Stand-in for the auth session. Demonstrates that authorization is
          tenant-scoped rather than a UI filter. */}
      {!collapsed && (
        <div className="border-t border-brame-teal-light p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-brame-lime/60">
            <ShieldCheck size={11} />
            {t('viewingAs.title')}
          </div>
          <div className="space-y-2">
            {/* Three scopes no longer fit side by side at the minimum
                sidebar width, so this is a 3-col grid rather than a flex
                row — same active styling as before. */}
            <div className="grid grid-cols-3 gap-0.5 rounded-lg bg-brame-teal-dark/60 p-0.5">
              {(
                [
                  ['brame_admin', t('viewingAs.brame')],
                  ['sales', t('viewingAs.sales')],
                  ['company_user', t('viewingAs.client')],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setRole(value)}
                  className={`truncate rounded-md px-1.5 py-1 text-xs font-medium transition-colors ${
                    role === value
                      ? 'bg-brame-lime text-brame-dark'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {role === 'company_user' ? (
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full rounded-lg border border-brame-teal-light bg-brame-teal-dark/60 px-2 py-1.5 text-xs text-white outline-none"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id} className="text-brame-dark">
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-[11px] leading-snug text-white/60">
                {role === 'sales' ? t('viewingAs.hintSales') : t('viewingAs.hintAdmin')}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`border-t border-brame-teal-light ${collapsed ? 'p-2' : 'p-3'}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title={collapsed ? displayName : undefined}
              className={`flex w-full items-center gap-2.5 rounded-lg py-2 text-left transition-colors hover:bg-brame-teal-light ${
                collapsed ? 'justify-center px-0' : 'px-2'
              }`}
            >
              <Avatar name={displayName} imageUrl={avatarDataUrl} size={32} />
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{displayName}</div>
                    <div className="truncate text-xs text-white/60">{org}</div>
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
            <DropdownMenuItem destructive onSelect={() => navigate('/login')}>
              <LogOut size={13} />
              {t('viewingAs.logOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ProfileSettingsModal open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  collapsed,
  badge,
}: {
  to: string;
  label: string;
  icon: typeof Building2;
  collapsed: boolean;
  badge?: number;
}) {
  const hasBadge = !!badge && badge > 0;
  return (
    <NavLink
      to={to}
      title={collapsed && hasBadge ? `${label} (${badge})` : collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex w-full items-center gap-3 py-2.5 transition-colors ${collapsed ? 'justify-center px-0' : 'px-4'} ${
          isActive ? 'bg-brame-teal-dark text-brame-lime' : 'text-white hover:bg-brame-teal-light'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative flex-shrink-0">
            <Icon size={18} className={isActive ? 'text-brame-lime' : ''} />
            {collapsed && hasBadge && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-brame-teal" />
            )}
          </span>
          {!collapsed && (
            <>
              <span className="truncate text-sm font-medium">{label}</span>
              {hasBadge && (
                <span className="ml-auto flex h-4 min-w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {badge}
                </span>
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  );
}
