import { useI18n } from '@/i18n';
import { Pill } from '@/components/ui';
import { LOW_SAMPLE } from '../lib/benchmarks';

/** Flags a benchmark group with too few contributing campaigns to trust. */
export function LowSamplePill() {
  const { t } = useI18n();
  return (
    <Pill tone="amber" title={t('benchmarks.lowSampleHint', { n: LOW_SAMPLE })}>
      {t('benchmarks.lowSample')}
    </Pill>
  );
}
