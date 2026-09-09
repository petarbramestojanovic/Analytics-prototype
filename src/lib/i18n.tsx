import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { TODAY } from '../mock/data';
import { dictionaries, type Locale } from './translations';

export type { Locale };

type Vars = Record<string, string | number>;

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Vars) => string;
  /** BCP-47 tag for Date/Number formatting, distinct from the UI locale key. */
  dateLocale: string;
}

const Ctx = createContext<I18nCtx | null>(null);

const STORAGE_KEY = 'brame-prototype-locale';
const DATE_LOCALE: Record<Locale, string> = { en: 'en-GB', de: 'de-CH' };

function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'de' ? 'de' : 'en';
}

function interpolate(str: string, vars?: Vars): string {
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nCtx>(() => {
    const dict = dictionaries[locale];
    const fallback = dictionaries.en;
    return {
      locale,
      setLocale,
      dateLocale: DATE_LOCALE[locale],
      t: (key, vars) => interpolate(dict[key] ?? fallback[key] ?? key, vars),
    };
  }, [locale]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n outside LanguageProvider');
  return v;
}

/** Locale-aware wrappers around the date/time formatters in mock/data.ts —
 *  kept here (rather than in data.ts) so formatting reacts to the language
 *  switch without threading a locale argument through every call site. */
export function useFormatters() {
  const { t, dateLocale } = useI18n();

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short' });

  const fmtDateLong = (d: string) =>
    new Date(d).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' });

  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' });

  const relativeTime = (d: string): string => {
    const mins = Math.round((TODAY.getTime() - new Date(d).getTime()) / 60_000);
    if (mins < 1) return t('time.justNow');
    if (mins < 60) return t('time.minAgo', { n: mins });
    const hours = Math.round(mins / 60);
    if (hours < 24) return t('time.hAgo', { n: hours });
    return t('time.dAgo', { n: Math.round(hours / 24) });
  };

  return { fmtDate, fmtDateLong, fmtTime, relativeTime };
}
