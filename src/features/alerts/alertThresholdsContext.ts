import { createStrictContext } from '@/lib/createStrictContext';
import type { Thresholds } from '@/features/campaigns';

/**
 * Divergence thresholds for the Compare tab and the portfolio Alerts page —
 * a browser-side setting like theme/language, not a mock-store-backed
 * record. In a real backend this would likely live per-company in the
 * database; here it's a client-side preference persisted via localStorage.
 */
export interface AlertThresholds extends Thresholds {
  setWatch: (n: number) => void;
  setInvestigate: (n: number) => void;
}

export const [AlertThresholdsContext, useAlertThresholds] = createStrictContext<AlertThresholds>('AlertThresholds');
