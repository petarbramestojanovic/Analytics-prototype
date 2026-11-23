import { useFormatters } from '@/i18n';
import { EMPTY_VALUE } from '@/lib/format';
import type { Campaign } from '@/types';
import { deviceSplit } from '../../lib/devices';

/** A flight date, "07 Sep" — no year to save width; the full date is the tooltip. */
export function DateCell({ date }: { date: string }) {
  const { fmtDate, fmtDateLong } = useFormatters();
  return (
    <span className="tnum whitespace-nowrap text-sm" title={fmtDateLong(date)}>
      {fmtDate(date)}
    </span>
  );
}

/** Desktop/mobile share of delivered impressions, "62/38". */
export function DeviceSplitCell({ campaign }: { campaign: Campaign }) {
  const split = deviceSplit(campaign);
  if (!split) return <span>{EMPTY_VALUE}</span>;
  const desktopPct = Math.round(split.desktop * 100);
  return (
    <span className="tnum text-xs text-gray-500 dark:text-gray-400">
      {desktopPct}/{100 - desktopPct}
    </span>
  );
}
