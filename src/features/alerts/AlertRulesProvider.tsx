import { useMemo, type ReactNode } from 'react';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { usePersistentState } from '@/hooks/usePersistentState';
import { codecs } from '@/lib/storage';
import { AlertRulesContext } from './alertRulesContext';
import { BUILT_IN_RULES } from './lib/builtInRules';
import type { AlertRule, AlertRuleInput } from './types';

const rulesCodec = codecs.json<AlertRule[]>();

/** Rules saved before a field was renamed: a fixed limit used to be `limitPct`
 *  (a fraction); it is now `limit`, in the metric's own unit. */
function migrate(rule: AlertRule): AlertRule {
  const legacy = rule as AlertRule & { limitPct?: number };
  if (rule.type === 'valueThreshold' && rule.limit === undefined && legacy.limitPct !== undefined) {
    const { limitPct, ...rest } = legacy;
    return { ...rest, limit: limitPct } as AlertRule;
  }
  return rule;
}

/**
 * Holds the user's rules, with the v1 standard rules always present.
 * Storage keeps only what the user has made or changed: their own rules, plus
 * an override for any standard rule they edited or switched off. The standard
 * rules themselves live in code, so a rule added there later reaches
 * everyone and "reset" is just dropping the override.
 */
export function AlertRulesProvider({ children }: { children: ReactNode }) {
  const [storedRaw, setStored] = usePersistentState<AlertRule[]>(STORAGE_KEYS.alertRules, [], rulesCodec);
  const stored = useMemo(() => storedRaw.map(migrate), [storedRaw]);

  const rules = useMemo(
    () => [
      ...BUILT_IN_RULES.map((rule) => stored.find((r) => r.id === rule.id) ?? rule),
      ...stored.filter((r) => !r.builtInKey),
    ],
    [stored]
  );

  /** Writes `next` as the user's version of that rule (an override for a
   *  standard rule, an in-place edit for their own). */
  const store = (next: AlertRule) =>
    setStored((prev) => (prev.some((r) => r.id === next.id) ? prev.map((r) => (r.id === next.id ? next : r)) : [...prev, next]));

  const addRule = (input: AlertRuleInput) =>
    setStored((prev) => [...prev, { ...input, id: `rule-${Date.now()}` } as AlertRule]);

  const updateRule = (id: string, input: AlertRuleInput) => {
    const current = rules.find((r) => r.id === id);
    if (current) store({ ...input, id, builtInKey: current.builtInKey } as AlertRule);
  };

  // Standard rules can't be removed — only switched off or reset.
  const removeRule = (id: string) => setStored((prev) => prev.filter((r) => r.id !== id || r.builtInKey));

  const setRuleEnabled = (id: string, enabled: boolean) => {
    const current = rules.find((r) => r.id === id);
    if (current) store({ ...current, enabled });
  };

  const resetRule = (id: string) => setStored((prev) => prev.filter((r) => r.id !== id));

  const isModified = (id: string) => stored.some((r) => r.id === id);

  return (
    <AlertRulesContext.Provider value={{ rules, addRule, updateRule, removeRule, setRuleEnabled, resetRule, isModified }}>
      {children}
    </AlertRulesContext.Provider>
  );
}
