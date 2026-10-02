import { useI18n } from '@/i18n';
import { fmtMetric } from '@/lib/format';

/** A big CTR figure with an optional "vs …" comparison line underneath. */
export function HeadlineCtr({ value, comparison }: { value: number; comparison?: { key: string; value: number } }) {
  const { t } = useI18n();
  return (
    <>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="tnum text-2xl font-bold text-brame-teal dark:text-brame-turquoise-light">{fmtMetric('ctr', value)}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{t('metric.ctr.label')}</span>
      </div>
      {comparison && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t(comparison.key, { value: fmtMetric('ctr', comparison.value) })}
        </div>
      )}
    </>
  );
}
