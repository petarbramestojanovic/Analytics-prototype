import { useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useFormatters, useI18n } from '@/i18n';
import { TODAY_ISO } from '@/lib/clock';
import { cn } from '@/lib/cn';
import {
  Calendar,
  DateButton,
  Popover,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui';
import {
  defaultSeasonYear,
  SEASONAL_PRESETS,
  type DateRange,
  type RangePreset,
} from '@/lib/dateRange';

/** The slice of a page's filter state the picker reads and writes. `range` is a
 *  preset, or — where the page offers it — 'all' (no period at all). */
export interface PeriodFilterState {
  range: string;
  from: string;
  to: string;
  year: number;
  yoy: boolean;
}

const PERIODS: RangePreset[] = ['last30', 'last90', 'thisQuarter', 'lastQuarter', 'ytd', 'last12m'];
const SEASONS: RangePreset[] = ['q4', 'blackFriday', 'christmas'];

const chip = (active: boolean) =>
  cn(
    'rounded-full px-3 py-1.5 text-sm transition-colors',
    active
      ? 'bg-brame-teal font-medium text-white'
      : 'bg-gray-100 text-brame-dark hover:bg-gray-200 dark:bg-white/10 dark:text-gray-100 dark:hover:bg-white/15',
  );

const sectionTitle = 'mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400';

/**
 * The period control: one button showing the resolved dates and which preset
 * produced them, opening a panel with quick periods, seasonality (with its
 * year) and a custom start/end.
 */
export function PeriodPicker({
  filters,
  range,
  onChange,
  allowAll = false,
  showYoy = true,
}: {
  filters: PeriodFilterState;
  /** The resolved bounds of the selected period (a stand-in while 'all'). */
  range: DateRange;
  onChange: (patch: Partial<PeriodFilterState>) => void;
  /** Offer an "All time" choice — the page then applies no period when it is picked. */
  allowAll?: boolean;
  /** The year-over-year comparison toggle, for pages that show rate deltas. */
  showYoy?: boolean;
}) {
  const { t } = useI18n();
  const { fmtDateRange } = useFormatters();
  const [editing, setEditing] = useState<'from' | 'to' | null>(null);
  const preset = filters.range as RangePreset;
  const seasonal = SEASONAL_PRESETS.includes(preset);
  const currentYear = Number(TODAY_ISO.slice(0, 4));
  const seasonYear = filters.year || defaultSeasonYear(preset, TODAY_ISO);

  const isAll = allowAll && filters.range === 'all';
  const label = isAll ? t('overview.range.all') : fmtDateRange(range.start, range.end, true);

  return (
    <Popover
      rootClassName="max-w-full min-w-0"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          aria-expanded={open}
          onClick={toggle}
          className={cn(
            'inline-flex h-10 max-w-full items-center gap-2 whitespace-nowrap rounded-lg border bg-white px-3 text-sm font-medium text-brame-dark dark:bg-brame-dark-light dark:text-gray-100',
            open
              ? 'border-brame-teal dark:border-brame-turquoise'
              : 'border-gray-300 dark:border-white/15',
          )}
        >
          <CalendarDays size={14} className="flex-shrink-0 text-gray-400" />
          {/* Truncates on a narrow screen rather than pushing the button out of its row. */}
          <span className="min-w-0 truncate">
            {label}
            {!isAll && (
              <span className="font-normal text-gray-400 dark:text-gray-500">
                {' '}
                · {t(`overview.range.${preset}`)}
                {showYoy && filters.yoy && ` · ${t('overview.range.yoyBadge')}`}
              </span>
            )}
          </span>
          <ChevronDown size={14} className="flex-shrink-0 text-gray-400" />
        </button>
      )}
    >
      {(close) => (
        <div className="space-y-4">
          <div>
            <div className={sectionTitle}>{t('overview.range.periodTitle')}</div>
            <div className="flex flex-wrap gap-2">
              {allowAll && (
                <button
                  type="button"
                  className={chip(isAll)}
                  onClick={() => {
                    onChange({ range: 'all', year: 0 });
                    close();
                  }}
                >
                  {t('overview.range.all')}
                </button>
              )}
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={chip(preset === p)}
                  onClick={() => {
                    onChange({ range: p, year: 0 });
                    close();
                  }}
                >
                  {t(`overview.range.${p}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className={sectionTitle}>{t('overview.range.seasonTitle')}</div>
            <div className="flex flex-wrap items-center gap-2">
              {SEASONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={chip(preset === p)}
                  onClick={() => {
                    onChange({ range: p });
                    close();
                  }}
                >
                  {t(`overview.range.${p}`)}
                </button>
              ))}
              <Select
                value={String(seasonYear)}
                onValueChange={(y) => onChange({ year: Number(y) })}
                disabled={!seasonal}
              >
                <span title={seasonal ? undefined : t('overview.range.yearHint')}>
                  <SelectTrigger className={cn('h-9 w-24', !seasonal && 'opacity-50')} />
                </span>
                <SelectContent>
                  {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className={sectionTitle}>{t('overview.range.customTitle')}</div>
            <div className="flex items-center gap-2">
              <DateButton
                label={t('overview.range.from')}
                date={range.start}
                active={editing === 'from'}
                onClick={() => setEditing(editing === 'from' ? null : 'from')}
              />
              <span className="text-sm text-gray-400">{t('overview.range.toWord')}</span>
              <DateButton
                label={t('overview.range.to')}
                date={range.end}
                active={editing === 'to'}
                onClick={() => setEditing(editing === 'to' ? null : 'to')}
              />
            </div>
            {editing && (
              <div className="mt-3 rounded-lg border border-gray-200 p-3 dark:border-white/10">
                <Calendar
                  // Re-anchor on the field being edited.
                  key={editing}
                  value={editing === 'from' ? range.start : range.end}
                  today={TODAY_ISO}
                  min={editing === 'to' ? range.start : undefined}
                  max={editing === 'from' ? range.end : TODAY_ISO}
                  rangeStart={range.start}
                  rangeEnd={range.end}
                  onSelect={(date) => {
                    onChange(
                      editing === 'from'
                        ? { range: 'custom', from: date, to: range.end }
                        : { range: 'custom', from: range.start, to: date },
                    );
                    setEditing(null);
                  }}
                />
              </div>
            )}
          </div>

          {/* Year over year: the tiles then show each rate's change against the
              same calendar window a year earlier. */}
          {showYoy && (
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-white/10">
              <input
                type="checkbox"
                checked={filters.yoy}
                onChange={(e) => onChange({ yoy: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-brame-teal focus:ring-brame-teal dark:border-white/20 dark:bg-brame-dark-light"
              />
              <span className="text-sm font-medium text-brame-dark dark:text-gray-100">
                {t('overview.range.yoy')}
              </span>
            </label>
          )}
        </div>
      )}
    </Popover>
  );
}
