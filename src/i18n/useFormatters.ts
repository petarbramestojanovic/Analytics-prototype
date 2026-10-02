import { TODAY } from '@/lib/clock';
import { useI18n } from './i18nContext';

/** Locale-aware date/time formatting — lives next to i18n (rather than in
 *  lib/format.ts) so it reacts to the language switch without threading a
 *  locale argument through every call site. */
export function useFormatters() {
  const { t, dateLocale } = useI18n();

  const fmtDate = (d: string) => new Date(d).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short' });

  const fmtDateLong = (d: string) =>
    new Date(d).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' });

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' });

  /** "07 Sep – 21 Sep" — a flight or any other date range. */
  const fmtDateRange = (start: string, end: string, long = false) =>
    long ? `${fmtDateLong(start)} – ${fmtDateLong(end)}` : `${fmtDate(start)} – ${fmtDate(end)}`;

  const relativeTime = (d: string): string => {
    const mins = Math.round((TODAY.getTime() - new Date(d).getTime()) / 60_000);
    if (mins < 1) return t('time.justNow');
    if (mins < 60) return t('time.minAgo', { n: mins });
    const hours = Math.round(mins / 60);
    if (hours < 24) return t('time.hAgo', { n: hours });
    return t('time.dAgo', { n: Math.round(hours / 24) });
  };

  return { fmtDate, fmtDateLong, fmtTime, fmtDateRange, relativeTime };
}
