import type { TranslateFn } from '@/i18n';
import type { SliceDim } from './benchmarks';

export const dimLabel = (t: TranslateFn, dim: SliceDim) => t(`cmp.dim.${dim}`);

/** A bucket's name; a null label is the direct-booking bucket. */
export const bucketName = (t: TranslateFn, label: string | null | undefined) =>
  label ?? t('cmp.direct');
