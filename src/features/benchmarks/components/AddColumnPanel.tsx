import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { TODAY } from '@/lib/clock';
import { Button } from '@/components/ui';
import { FilterMultiSelect, FilterSelect } from '@/components/page';
import { serializeSelection } from '@/lib/selection';
import type { BenchmarkCampaign } from '@/types';
import { SLICE_DIMS, sliceKey, sliceOptions, type SliceDim } from '../lib/benchmarks';
import { bucketName, dimLabel } from '../lib/compareLabels';
import { resolveColumn } from '../lib/compareColumns';
import { type CompareSubject } from '../lib/compareSubject';
import {
  BRAME_COLUMN,
  campaignColumn,
  mixColumn,
  type MatrixColumn,
  type MixPart,
} from '../lib/compareViews';
import { CampaignAutocomplete } from './CampaignAutocomplete';

type Mode = 'cuts' | 'split' | 'campaign' | 'brame';
const MODES: Mode[] = ['cuts', 'split', 'campaign', 'brame'];
const OWN = '__own__';

/**
 * What to add to the matrix, in four ways:
 *  - **Combine cuts**: any mix of client / market / industry / account, each
 *    "any", "same as the pick" or one specific bucket — "same client × market
 *    AT" for Audi DE against Audi AT.
 *  - **Split by a cut**: one column per bucket of a cut inside the pick's own
 *    bucket — "same client, split by market" is every Audi market at once.
 *  - **A specific campaign**: one named flight, side by side with the pick.
 *  - **KLEA network average.**
 */
export function AddColumnPanel({
  pool,
  subject,
  existing,
  room,
  onAdd,
}: {
  pool: BenchmarkCampaign[];
  subject: CompareSubject;
  existing: MatrixColumn[];
  /** How many more columns fit. */
  room: number;
  onAdd: (cols: MatrixColumn[]) => void;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('cuts');
  const taken = (col: MatrixColumn) => existing.some((c) => c.id === col.id);

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-brame-dark dark:text-gray-100">
        {t('cmp.add.title')}
      </div>
      <FilterSelect
        className="w-full"
        value={mode}
        onChange={(v) => setMode(v as Mode)}
        options={MODES.map((m) => ({ value: m, label: t(`cmp.add.mode.${m}`) }))}
      />
      {mode === 'cuts' && (
        <CutsForm pool={pool} subject={subject} taken={taken} onAdd={(c) => onAdd([c])} />
      )}
      {mode === 'split' && (
        <SplitForm pool={pool} subject={subject} taken={taken} room={room} onAdd={onAdd} />
      )}
      {mode === 'campaign' && <CampaignForm pool={pool} taken={taken} onAdd={(c) => onAdd([c])} />}
      {mode === 'brame' && (
        <div className="flex justify-end pt-1">
          <Button
            variant="primary"
            size="sm"
            disabled={taken(BRAME_COLUMN)}
            onClick={() => onAdd([BRAME_COLUMN])}
          >
            {taken(BRAME_COLUMN) ? t('cmp.add.exists') : t('cmp.add.submit')}
          </Button>
        </div>
      )}
    </div>
  );
}

function CutsForm({
  pool,
  subject,
  taken,
  onAdd,
}: {
  pool: BenchmarkCampaign[];
  subject: CompareSubject;
  taken: (col: MatrixColumn) => boolean;
  onAdd: (col: MatrixColumn) => void;
}) {
  const { t } = useI18n();
  const [picks, setPicks] = useState<Partial<Record<SliceDim, string[]>>>({});
  const options = useMemo(
    () =>
      Object.fromEntries(SLICE_DIMS.map((d) => [d, sliceOptions(pool, TODAY, d)])) as Record<
        SliceDim,
        ReturnType<typeof sliceOptions>
      >,
    [pool],
  );

  // Per cut: nothing (any), "same as the pick", or one or several buckets
  // (Germany + Austria together). Several are one group, not several columns.
  const parts: MixPart[] = SLICE_DIMS.flatMap((dim): MixPart[] => {
    const picked = picks[dim] ?? [];
    if (!picked.length) return [];
    if (picked.includes(OWN)) {
      return subject.keys[dim] === null ? [] : [{ dim, value: null, label: '' }];
    }
    const values = [...picked].sort();
    const names = values.map((v) => bucketName(t, options[dim].find((x) => x.value === v)?.label));
    return [{ dim, value: serializeSelection(values), label: names.join(' + ') }];
  });
  const column = parts.length ? mixColumn(parts) : null;
  // "Same as the pick" on every cut the pick is made of is the pick itself.
  const isPick = !!column && resolveColumn(column, subject, pool) === null;

  return (
    <div className="space-y-2.5">
      <p className="text-xs text-gray-500 dark:text-gray-400">{t('cmp.add.cutsHint')}</p>
      {SLICE_DIMS.map((dim) => (
        <div key={dim} className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {dimLabel(t, dim)}
          </span>
          <FilterMultiSelect
            className="min-w-0"
            values={picks[dim] ?? []}
            onChange={(next) => {
              // "Same as the pick" stands alone; it clears specific buckets and vice versa.
              const had = (picks[dim] ?? []).includes(OWN);
              const value = next.includes(OWN) && !had ? [OWN] : next.filter((v) => v !== OWN);
              setPicks((p) => ({ ...p, [dim]: value }));
            }}
            allLabel={t('cmp.add.any')}
            options={[
              ...(subject.keys[dim] !== null
                ? [{ value: OWN, label: t('cmp.add.sameAsSubject') }]
                : []),
              ...options[dim].map((o) => ({ value: o.value, label: bucketName(t, o.label) })),
            ]}
          />
        </div>
      ))}
      <div className="flex justify-end pt-1">
        <Button
          variant="primary"
          size="sm"
          disabled={!column || isPick || taken(column)}
          onClick={() => column && onAdd(column)}
        >
          {isPick
            ? t('cmp.add.isPick')
            : column && taken(column)
              ? t('cmp.add.exists')
              : t('cmp.add.submit')}
        </Button>
      </div>
    </div>
  );
}

function SplitForm({
  pool,
  subject,
  taken,
  room,
  onAdd,
}: {
  pool: BenchmarkCampaign[];
  subject: CompareSubject;
  taken: (col: MatrixColumn) => boolean;
  room: number;
  onAdd: (cols: MatrixColumn[]) => void;
}) {
  const { t } = useI18n();
  // The cuts the pick has a single bucket of — the ones "within" can be.
  const bases = SLICE_DIMS.filter((d) => subject.keys[d] !== null);
  const [base, setBase] = useState<SliceDim | null>(null);
  const [by, setBy] = useState<SliceDim | null>(null);
  // Defaults to the pick's client — the usual "same client, other markets" — else
  // its first applicable cut.
  const within =
    base && bases.includes(base) ? base : bases.includes('client') ? 'client' : (bases[0] ?? null);
  const splits = SLICE_DIMS.filter((d) => d !== within);
  const split = by && splits.includes(by) ? by : splits.includes('market') ? 'market' : splits[0];

  const columns = useMemo(() => {
    if (!within) return [];
    const key = subject.keys[within];
    const inside = pool.filter((c) => sliceKey(c, within) === key);
    return sliceOptions(inside, TODAY, split)
      .sort((a, b) => b.campaigns - a.campaigns || (a.label ?? '').localeCompare(b.label ?? ''))
      .map((o) =>
        mixColumn([
          { dim: within, value: null, label: '' },
          { dim: split, value: o.value, label: bucketName(t, o.label) },
        ]),
      );
  }, [pool, subject, within, split, t]);
  // Skip a bucket that is the pick itself (a segment split by one of its own cuts).
  const usable = columns.filter((c) => !taken(c) && resolveColumn(c, subject, pool) !== null);
  const fresh = usable.slice(0, room);

  if (!within) {
    return <p className="text-xs text-gray-500 dark:text-gray-400">{t('cmp.add.splitNone')}</p>;
  }
  return (
    <div className="space-y-2.5">
      <p className="text-xs text-gray-500 dark:text-gray-400">{t('cmp.add.splitHint')}</p>
      <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {t('cmp.add.within')}
        </span>
        <FilterSelect
          className="min-w-0"
          value={within}
          onChange={(v) => setBase(v as SliceDim)}
          options={bases.map((d) => ({
            value: d,
            label: t('cmp.add.sameDim', { dim: dimLabel(t, d).toLowerCase() }),
          }))}
        />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {t('cmp.add.splitBy')}
        </span>
        <FilterSelect
          className="min-w-0"
          value={split}
          onChange={(v) => setBy(v as SliceDim)}
          options={splits.map((d) => ({ value: d, label: dimLabel(t, d) }))}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {fresh.length
          ? t('cmp.add.splitPreview', {
              count: fresh.length,
              names: fresh
                .map((c) =>
                  c.kind === 'mix' ? (c.parts.find((p) => p.value !== null)?.label ?? '') : '',
                )
                .join(' · '),
            })
          : t('cmp.add.nothingNew')}
        {fresh.length < usable.length && ` ${t('cmp.add.splitCapped')}`}
      </p>
      <div className="flex justify-end pt-1">
        <Button
          variant="primary"
          size="sm"
          disabled={fresh.length === 0}
          onClick={() => onAdd(fresh)}
        >
          {t('cmp.add.submitN', { count: fresh.length })}
        </Button>
      </div>
    </div>
  );
}

function CampaignForm({
  pool,
  taken,
  onAdd,
}: {
  pool: BenchmarkCampaign[];
  taken: (col: MatrixColumn) => boolean;
  onAdd: (col: MatrixColumn) => void;
}) {
  const { t } = useI18n();
  const [id, setId] = useState<string | null>(null);
  const options = useMemo(
    () =>
      [...pool]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({
          value: c.id,
          label: c.name,
          description: `${c.companyName} · ${c.market}`,
        })),
    [pool],
  );
  const picked = pool.find((c) => c.id === id);
  const column = picked ? campaignColumn(picked.id, picked.name) : null;
  return (
    <div className="space-y-2.5">
      <CampaignAutocomplete
        value={id}
        onChange={setId}
        options={options}
        label={t('cmp.subject.campaign')}
        placeholder={t('cmp.subject.placeholder.campaign')}
        noneLabel={t('cmp.subject.none.campaign')}
      />
      <div className="flex justify-end pt-1">
        <Button
          variant="primary"
          size="sm"
          disabled={!column || taken(column)}
          onClick={() => column && onAdd(column)}
        >
          {column && taken(column) ? t('cmp.add.exists') : t('cmp.add.submit')}
        </Button>
      </div>
    </div>
  );
}
