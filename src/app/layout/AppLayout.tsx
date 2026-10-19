import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { Drawer, DrawerContent } from '@/components/ui';
import { LoadingState } from '@/components/feedback';
import { CommandPalette } from './CommandPalette';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useResizableSidebar } from './useResizableSidebar';

/**
 * The signed-in app shell: a resizable/collapsible sidebar rail on desktop, a
 * drawer below `lg`, the sticky top bar, and the routed page in between.
 */
/** Land on the current page's link rather than the first group toggle. */
function focusActiveNavItem(e: Event) {
  const active = document.querySelector<HTMLElement>('[role="dialog"] [aria-current="page"]');
  if (!active) return;
  e.preventDefault();
  active.focus();
}

export function AppLayout() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const sidebar = useResizableSidebar(isDesktop);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();
  const location = useLocation();

  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // ⌘K / Ctrl+K from anywhere in the app, including inside inputs — it's the
  // one shortcut people expect to work everywhere.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMobileOpen(false);
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-brame-cream dark:bg-brame-dark">
      {isDesktop ? (
        <aside
          style={{ width: sidebar.width }}
          className={cn(
            'relative flex flex-shrink-0 flex-col bg-brame-teal text-white',
            !sidebar.dragging && 'transition-[width] duration-200'
          )}
        >
          <Sidebar collapsed={sidebar.collapsed} onToggleCollapsed={sidebar.toggleCollapsed} />

          {!sidebar.collapsed && (
            <div
              onMouseDown={sidebar.onResizeStart}
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
          <DrawerContent title={t('common.appName')} onOpenAutoFocus={focusActiveNavItem}>
            <Sidebar collapsed={false} onToggleCollapsed={() => setMobileOpen(false)} />
          </DrawerContent>
        </Drawer>
      )}

      <main className="scrollbar-hidden flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <TopBar onOpenMobileMenu={() => setMobileOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
        {/* Inside the shell, so the sidebar stays put while a page's chunk loads. */}
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </main>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
