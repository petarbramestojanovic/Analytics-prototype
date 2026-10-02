import type { ReactNode } from 'react';
import { STORAGE_KEYS } from '@/config/storageKeys';
import { usePersistentState } from '@/hooks/usePersistentState';
import { codecs } from '@/lib/storage';
import { AlertRulesContext } from './alertRulesContext';
import type { AlertRule, AlertRuleInput } from './types';

const rulesCodec = codecs.json<AlertRule[]>();

export function AlertRulesProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = usePersistentState<AlertRule[]>(STORAGE_KEYS.alertRules, [], rulesCodec);

  const addRule = (input: AlertRuleInput) =>
    setRules((prev) => [...prev, { ...input, id: `rule-${Date.now()}` } as AlertRule]);

  const updateRule = (id: string, input: AlertRuleInput) =>
    setRules((prev) => prev.map((r) => (r.id === id ? ({ ...input, id } as AlertRule) : r)));

  const removeRule = (id: string) => setRules((prev) => prev.filter((r) => r.id !== id));

  const setRuleEnabled = (id: string, enabled: boolean) =>
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));

  return (
    <AlertRulesContext.Provider value={{ rules, addRule, updateRule, removeRule, setRuleEnabled }}>
      {children}
    </AlertRulesContext.Provider>
  );
}
