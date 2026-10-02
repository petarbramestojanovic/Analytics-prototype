import { useMemo } from 'react';
import { useCampaigns } from '@/features/campaigns';
import { useI18n } from '@/i18n';
import { useAlertRules } from '../alertRulesContext';
import { useAlertThresholds } from '../alertThresholdsContext';
import { buildAlertLog } from '../lib/alertLog';

/** The live alert log for the whole portfolio, plus how many rows need
 *  investigating (the sidebar badge). */
export function useAlertLog() {
  const { t } = useI18n();
  const { data: campaigns, isLoading } = useCampaigns();
  const thresholds = useAlertThresholds();
  const { rules } = useAlertRules();

  const rows = useMemo(
    () => (campaigns ? buildAlertLog(campaigns, thresholds, rules, t) : []),
    [campaigns, thresholds, rules, t]
  );
  const investigateCount = useMemo(() => rows.filter((r) => r.severity === 'investigate').length, [rows]);

  return { rows, investigateCount, isLoading };
}
