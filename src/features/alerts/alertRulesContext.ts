import { createStrictContext } from '@/lib/createStrictContext';
import type { AlertRule, AlertRuleInput } from './types';

export interface AlertRules {
  rules: AlertRule[];
  addRule: (input: AlertRuleInput) => void;
  updateRule: (id: string, input: AlertRuleInput) => void;
  removeRule: (id: string) => void;
  setRuleEnabled: (id: string, enabled: boolean) => void;
  /** Puts a standard rule back to its shipped settings. */
  resetRule: (id: string) => void;
  /** Whether a standard rule differs from its shipped settings. */
  isModified: (id: string) => boolean;
}

export const [AlertRulesContext, useAlertRules] = createStrictContext<AlertRules>('AlertRules');
