import { createStrictContext } from '@/lib/createStrictContext';
import type { AlertRule, AlertRuleInput } from './types';

export interface AlertRules {
  rules: AlertRule[];
  addRule: (input: AlertRuleInput) => void;
  updateRule: (id: string, input: AlertRuleInput) => void;
  removeRule: (id: string) => void;
  setRuleEnabled: (id: string, enabled: boolean) => void;
}

export const [AlertRulesContext, useAlertRules] = createStrictContext<AlertRules>('AlertRules');
