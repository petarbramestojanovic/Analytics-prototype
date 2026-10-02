import { useEffect, useMemo, type ReactNode } from 'react';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { usePersistentState } from '@/hooks/usePersistentState';
import { codecs } from '@/lib/storage';
import { I18nContext, type I18n, type TranslationVars } from './i18nContext';
import { dictionaries, LOCALES, type Locale } from './locales';

const DATE_LOCALE: Record<Locale, string> = { en: 'en-GB', de: 'de-CH' };
const localeCodec = codecs.oneOf(LOCALES);

function interpolate(str: string, vars?: TranslationVars): string {
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = usePersistentState<Locale>(STORAGE_KEYS.locale, 'en', localeCodec);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18n>(() => {
    const dict: Record<string, string> = dictionaries[locale];
    const fallback: Record<string, string> = dictionaries.en;
    return {
      locale,
      setLocale,
      dateLocale: DATE_LOCALE[locale],
      t: (key, vars) => interpolate(dict[key] ?? fallback[key] ?? key, vars),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
