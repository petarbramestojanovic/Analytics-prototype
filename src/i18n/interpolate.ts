import type { TranslationVars } from './i18nContext';

/**
 * Fills a translation's placeholders:
 *  - `{{name}}` is replaced by that variable.
 *  - `{{count|one|other}}` picks a word by the variable's number: the first
 *    form when it is exactly 1, the second otherwise ("0 campaigns", "1
 *    campaign"). English and German both use these two forms. Write the number
 *    itself separately: `{{count}} {{count|campaign|campaigns}}`.
 */
export function interpolate(str: string, vars?: TranslationVars): string {
  if (!vars) return str;
  return str
    .replace(/\{\{(\w+)\|([^|{}]*)\|([^|{}]*)\}\}/g, (_, k, one, other) =>
      Number(vars[k]) === 1 ? one : other,
    )
    .replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}
