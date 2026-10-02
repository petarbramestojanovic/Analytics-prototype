import { Briefcase, Building2, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { PillTone } from '@/components/ui';
import type { SeatCategory } from '@/types';

/** Display order of seat categories — the two singletons first. */
export const SEAT_CATEGORIES: readonly SeatCategory[] = ['admin', 'brame', 'agency', 'client'];

export const SEAT_CATEGORY_TONE: Record<SeatCategory, PillTone> = {
  admin: 'purple',
  brame: 'teal',
  agency: 'lime',
  client: 'neutral',
};

export const SEAT_CATEGORY_ICON: Record<SeatCategory, LucideIcon> = {
  admin: ShieldCheck,
  brame: ShieldCheck,
  agency: Briefcase,
  client: Building2,
};
