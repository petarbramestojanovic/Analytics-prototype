import { de } from './de';
import { en, type TranslationKey } from './en';

export type Locale = 'en' | 'de';
export type { TranslationKey };

export const LOCALES: readonly Locale[] = ['en', 'de'];

export const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en, de };
