import {
  BarChart3,
  BellRing,
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

export interface NavItemConfig {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  /** Which live count (if any) the item shows as a badge. */
  badge?: 'alerts';
}

export interface NavSectionConfig {
  labelKey: string;
  /** Same access levels as the route table, so a section is only shown to
   *  seats that could actually open its pages. */
  access: Access;
  items: NavItemConfig[];
}

/** The sidebar, top to bottom. */
export const NAV_SECTIONS: NavSectionConfig[] = [
  {
    labelKey: 'nav.sectionReporting',
    access: 'everyone',
    items: [
      { to: paths.overview, labelKey: 'nav.overview', icon: LayoutDashboard },
      { to: paths.campaigns, labelKey: 'nav.campaigns', icon: FolderKanban },
      { to: paths.reports, labelKey: 'nav.reports', icon: Send },
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
    // Data reads, not configuration — Admin and Brame seats both get these.
    labelKey: 'nav.sectionSales',
    access: 'internal',
    items: [
      { to: paths.benchmarks(), labelKey: 'nav.benchmarks', icon: BarChart3 },
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
