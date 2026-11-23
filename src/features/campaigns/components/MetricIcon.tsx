import {
  Activity,
  CircleCheck,
  Eye,
  Hand,
  MousePointerClick,
  Play,
  Pointer,
  ScanEye,
  Target,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { MetricKey } from '@/types';

const ICONS: Record<MetricKey | 'engagements', LucideIcon> = {
  impressions: Eye,
  viewable: ScanEye,
  viewability: ScanEye,
  plays: Play,
  engagementRate: Activity,
  engagements: Hand,
  avgDwell: Timer,
  completionRate: CircleCheck,
  ctaClicks: Pointer,
  ctr: MousePointerClick,
  uniqueUsers: Users,
  conversions: Target,
};

/** The icon a metric wears in the top right of its KPI card, so the same metric
 *  looks the same on every page. */
export function MetricIcon({ metric }: { metric: MetricKey | 'engagements' }) {
  const Icon = ICONS[metric];
  return <Icon size={20} strokeWidth={1.75} />;
}
