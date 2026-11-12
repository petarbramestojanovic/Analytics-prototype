import type { TranslateFn } from '@/i18n';
import type { SliceDim } from './benchmarks';
import type { CompareSubject } from './compareSubject';

export const dimLabel = (t: TranslateFn, dim: SliceDim) => t(`cmp.dim.${dim}`);

/** A bucket's name; a null label is the direct-booking bucket. */
export const bucketName = (t: TranslateFn, label: string | null | undefined) =>
  label ?? t('cmp.direct');

/** The two heading lines of what is being compared: what kind of thing, and
 *  which one — "Client × Market" / "MediaMarkt · DE" for a segment. */
export function subjectHeading(t: TranslateFn, subject: CompareSubject) {
  if (subject.kind === 'campaign') return { kind: t('cmp.subject.campaign'), name: subject.name };
  // Every bucket of a cut is joined with "+" ("DE + AT"); the cuts with "·".
  if (!subject.cuts.length) return { kind: t('cmp.matrix.brame'), name: t('cmp.matrix.network') };
  return {
    kind: subject.cuts.map((c) => dimLabel(t, c.dim)).join(' × '),
    name: subject.cuts
      .map((c) => (subject.cutLabels[c.dim] ?? []).map((l) => bucketName(t, l)).join(' + '))
      .join(' · '),
  };
}
