import {
  BarChart3,
  BellRing,
  Inbox,
  Building2,
  Cable,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  Send,
  Settings2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { paths } from '@/config/paths';
import type { Access } from '@/features/session';

interface NavItemConfig {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  /** Which live count (if any) the item shows as a badge. */
  badge?: 'alerts' | 'inbox';
  /** Narrows the section's access for this one item. */
  access?: Access;
}

export interface NavSectionConfig {
  /** Not shown in the sidebar (it is one flat list); the command palette uses it
   *  as the page's secondary label. */
  labelKey: string;
  /** Same access levels as the route table, so a section is only shown to
   *  seats that could actually open its pages. */
  access: Access;
  items: NavItemConfig[];
}

/** Pinned above every section, with no header of its own: the person's inbox
 *  belongs to them, not to any area of the product. */
export const NAV_TOP_ITEMS: NavItemConfig[] = [{ to: paths.inbox, labelKey: 'nav.inbox', icon: Inbox, badge: 'inbox' }];

/** The sidebar sections, top to bottom, under the pinned items. */
export const NAV_SECTIONS: NavSectionConfig[] = [
  {
    labelKey: 'nav.sectionReporting',
    access: 'everyone',
    items: [
      { to: paths.overview, labelKey: 'nav.overview', icon: LayoutDashboard },
      { to: paths.campaigns, labelKey: 'nav.campaigns', icon: FolderKanban },
      { to: paths.reports, labelKey: 'nav.reports', icon: Send },
      { to: paths.benchmarks(), labelKey: 'nav.benchmarks', icon: BarChart3, access: 'internal' },
    ],
  },
  {
    labelKey: 'nav.sectionAccount',
    access: 'seatAdmin',
    items: [
      { to: paths.users, labelKey: 'nav.users', icon: Users },
      { to: paths.apiAccess, labelKey: 'nav.apiAccess', icon: KeyRound },
    ],
  },
  {
    // Data reads, not configuration — Admin and Klea seats both get these.
    labelKey: 'nav.sectionSales',
    access: 'internal',
    items: [
      { to: paths.clients, labelKey: 'nav.clients', icon: Users },
      { to: paths.alerts, labelKey: 'nav.alerts', icon: BellRing, badge: 'alerts' },
    ],
  },
  {
    // Configuration/edit surfaces — Admin seat only.
    labelKey: 'nav.sectionInternal',
    access: 'admin',
    items: [
      { to: paths.setup(), labelKey: 'nav.setup', icon: Settings2 },
      { to: paths.connectors, labelKey: 'nav.connectors', icon: Cable },
      { to: paths.seats(), labelKey: 'nav.seats', icon: Building2 },
    ],
  },
];
