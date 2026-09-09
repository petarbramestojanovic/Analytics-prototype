import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, ShieldCheck, TriangleAlert } from 'lucide-react';
import { fmtPct, sourceMeta } from '../mock/data';
import { useCampaigns } from '../hooks/useCampaigns';
import { useSession } from '../lib/session';
import { useAlertThresholds } from '../lib/alertSettings';
import { computePortfolioAlerts, type DivergenceRow } from '../lib/divergence';
import type { Campaign } from '../mock/types';
import { useI18n } from '../lib/i18n';
import { usePageTitle } from '../lib/usePageTitle';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../components/ui/select';
import { Button, Card, EmptyState, Pill, SectionTitle, Td, Th, Tooltip } from '../components/primitives';

const PAGE_SIZE = 10;

/**
 * The standing, portfolio-wide version of what the Compare tab already shows
 * one campaign at a time — same thresholds, same tone/read vocabulary
 * (src/lib/divergence.ts), so nothing here can disagree with what a reviewer
 * sees on an individual campaign's Compare tab.
 */
export default function AlertsView() {
  const { t } = useI18n();
  usePageTitle(t('alerts.title'));
  const { role } = useSession();
  const { data: campaigns, isLoading } = useCampaigns();
  const thresholds = useAlertThresholds();
  const [q, setQ] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [page, setPage] = useState(0);

  const isAdmin = role === 'brame_admin';

  const campaignsById = useMemo(() => new Map((campaigns ?? []).map((c) => [c.id, c])), [campaigns]);

  const companyOptions = useMemo(
    () => [...new Map((campaigns ?? []).map((c) => [c.companyId, c.companyName])).entries()],
    [campaigns]
  );

  const allRows = useMemo(() => {
    if (!campaigns) return [];
    return computePortfolioAlerts(campaigns, thresholds).sort((a, b) => {
      if (a.read !== b.read) return a.read === 'investigate' ? -1 : 1;
      return b.absDelta - a.absDelta;
    });
  }, [campaigns, thresholds]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allRows.filter((row) => {
      const campaign = campaignsById.get(row.campaignId);
      if (isAdmin && companyFilter !== 'all' && campaign?.companyId !== companyFilter) return false;
      if (!needle) return true;
      return row.campaignName.toLowerCase().includes(needle) || row.companyName.toLowerCase().includes(needle);
    });
  }, [allRows, campaignsById, companyFilter, isAdmin, q]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pagedRows = rows.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  if (isLoading) {
    return <div className="px-8 py-16 text-center text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>;
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex flex-wrap items-stretch gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{t('alerts.title')}</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">{t('alerts.subtitle')}</p>
        </div>
        <ThresholdSettings />
      </div>

      <Card padded={false}>
        <div className="p-5 pb-0">
          <SectionTitle>{t('alerts.title')}</SectionTitle>
        </div>

        {allRows.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState icon={<ShieldCheck size={32} />} title={t('alerts.empty.title')} body={t('alerts.empty.body')} />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 p-5 pb-4">
              <div className="relative min-w-56 flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(0);
                  }}
                  placeholder={t('alerts.search')}
                  className="h-10 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm text-brame-dark outline-none focus:border-brame-teal dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100 dark:placeholder:text-gray-500"
                />
              </div>

              {isAdmin && (
                <div className="w-56">
                  <Select
                    value={companyFilter}
                    onValueChange={(v) => {
                      setCompanyFilter(v);
                      setPage(0);
                    }}
                  >
                    <SelectTrigger />
                    <SelectContent>
                      <SelectItem value="all">{t('campaigns.filter.allCompanies')}</SelectItem>
                      {companyOptions.map(([id, name]) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {rows.length === 0 ? (
              <div className="px-5 pb-5 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('alerts.noMatches')}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto px-5">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <Th>{t('alerts.col.campaign')}</Th>
                        <Th>{t('alerts.col.company')}</Th>
                        <Th>{t('alerts.col.comparing')}</Th>
                        <Th>{t('alerts.col.metric')}</Th>
                        <Th align="right">{t('alerts.col.delta')}</Th>
                        <Th>{t('alerts.col.read')}</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRows.map((row, i) => (
                        <AlertRow
                          key={`${row.campaignId}-${row.check}-${row.metric}-${i}`}
                          row={row}
                          campaign={campaignsById.get(row.campaignId)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between p-5 pt-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('table.showingRange', {
                      from: currentPage * PAGE_SIZE + 1,
                      to: Math.min((currentPage + 1) * PAGE_SIZE, rows.length),
                      total: rows.length,
                    })}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      icon={<ChevronLeft size={13} />}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      {t('table.previous')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                      disabled={currentPage >= pageCount - 1}
                    >
                      {t('table.next')}
                      <ChevronRight size={13} />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function AlertRow({ row, campaign }: { row: DivergenceRow; campaign: Campaign | undefined }) {
  const { t } = useI18n();
  const baselineLabel = campaign ? sourceMeta(campaign, row.baseline).label : row.baseline;
  const checkLabel = campaign ? sourceMeta(campaign, row.check).label : row.check;

  return (
    <tr>
      <Td>
        <Link
          to={`/campaigns/${row.campaignId}`}
          className="font-medium text-brame-dark hover:text-brame-teal hover:underline dark:text-gray-100 dark:hover:text-brame-turquoise-light"
        >
          {row.campaignName}
        </Link>
      </Td>
      <Td className="text-gray-500 dark:text-gray-400">{row.companyName}</Td>
      <Td>
        <span className="inline-flex items-center gap-1.5">
          {baselineLabel} <span className="text-gray-400">vs</span> {checkLabel}
          {row.cadenceGap && <Tooltip text={t('alerts.cadenceGapNote')} />}
        </span>
      </Td>
      <Td>{t(`metric.${row.metric}.label`)}</Td>
      <Td align="right">
        <span
          className={
            row.read === 'watch' ? 'text-amber-700 dark:text-amber-300' : 'text-red-600 dark:text-red-400'
          }
        >
          {row.delta > 0 ? '+' : ''}
          {fmtPct(row.delta, 1)}
        </span>
      </Td>
      <Td>
        <Pill tone={row.tone}>{t(`detail.read.${row.read}`)}</Pill>
      </Td>
    </tr>
  );
}

function ThresholdSettings() {
  const { t } = useI18n();
  const { watch, investigate, setWatch, setInvestigate } = useAlertThresholds();
  const invalid = investigate <= watch;

  return (
    <Card className="flex flex-1 flex-nowrap items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-brame-dark dark:text-gray-100">
          <TriangleAlert size={15} className="shrink-0 text-amber-500" />
          {t('alerts.settingsTitle')}
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('alerts.settingsHint')}</p>
      </div>
      <div className="flex shrink-0 flex-nowrap items-start gap-3">
        <PercentField
          label={t('alerts.watchThreshold')}
          value={watch}
          onChange={setWatch}
          tone="amber"
        />
        <PercentField
          label={t('alerts.investigateThreshold')}
          value={investigate}
          onChange={setInvestigate}
          tone="red"
        />
      </div>
      {invalid && <p className="w-full text-xs text-red-600 dark:text-red-400">{t('alerts.thresholdInvalid')}</p>}
    </Card>
  );
}

function PercentField({
  label,
  value,
  onChange,
  tone,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  tone: 'amber' | 'red';
}) {
  const displayValue = String(Math.round(value * 1000) / 10);
  // Local text buffer, decoupled from the numeric value while typing —
  // a controlled number input re-formatting on every keystroke is what
  // turns "clear the 4, type 8" into a stuck "08" the backspace can't touch.
  const [raw, setRaw] = useState(displayValue);

  useEffect(() => {
    setRaw((prev) => (Number(prev) === value * 100 ? prev : displayValue));
  }, [displayValue, value]);

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-brame-dark dark:text-gray-200">
        <span className={`h-2 w-2 rounded-full ${tone === 'amber' ? 'bg-amber-400' : 'bg-red-500'}`} />
        {label}
      </span>
      <div className="relative w-28">
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={raw}
          onChange={(e) => {
            const text = e.target.value;
            setRaw(text);
            if (text.trim() === '') return;
            const n = Number(text);
            if (!Number.isNaN(n)) onChange(Math.max(0, n) / 100);
          }}
          onBlur={() => setRaw(displayValue)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm text-brame-dark outline-none focus:border-brame-teal dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
      </div>
    </label>
  );
}
