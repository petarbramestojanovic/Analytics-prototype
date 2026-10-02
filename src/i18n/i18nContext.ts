import { createStrictContext } from '@/lib/createStrictContext';
import type { Locale, TranslationKey } from './locales';

export type TranslationVars = Record<string, string | number>;

/** `TranslationKey` gives autocomplete for literal keys; `string & {}` still
 *  accepts computed ones like `metric.${m}.label`. */
export type TranslateFn = (key: TranslationKey | (string & {}), vars?: TranslationVars) => string;

export interface I18n {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TranslateFn;
  /** BCP-47 tag for Date/Number formatting, distinct from the UI locale key. */
  dateLocale: string;
}

export const [I18nContext, useI18n] = createStrictContext<I18n>('I18n');
