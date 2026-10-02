import { useMemo, useState } from 'react';
import { Download, Plus, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePagination } from '@/hooks/usePagination';
import { exportToXlsx } from '@/lib/exportXlsx';
import { fmtPct } from '@/lib/format';
import { matchesQuery } from '@/lib/text';
import { Button, Card, Tabs } from '@/components/ui';
import { ConfirmDialog, EmptyState, EmptyText, LoadingState } from '@/components/feedback';
import { FilterSelect, Page, PageHeader, SearchInput, SectionTitle } from '@/components/page';
import { Pagination } from '@/components/table';
import { EmptyCard } from '@/components/display';
import { useSession } from '@/features/session';
import { companyOptions, useCampaigns } from '@/features/campaigns';
import { useAlertRules } from '../alertRulesContext';
import { AlertLogTable } from '../components/AlertLogTable';
import { AlertRuleCard } from '../components/AlertRuleCard';
import { AlertRuleDialog } from '../components/AlertRuleDialog';
import { ThresholdSettings } from '../components/ThresholdSettings';
import { useAlertLog } from '../hooks/useAlertLog';
import type { AlertRule } from '../types';

const PAGE_SIZE = 10;

/**
 * Standing alert configuration and the log it produces. Two tabs:
 * "Log" — every campaign currently tripping either the fixed default
 * thresholds or a custom rule; "Rules" — where those custom rules are
 * defined, Outlook-rules-style (condition + KPI + scope, no drag-and-drop).
 *
 * The default thresholds stay wired to the exact same computation the
 * Compare tab uses — so nothing here can disagree with what a reviewer sees
 * on an individual campaign's Compare tab. Custom rules are purely additive.
 */
export function AlertsPage() {
  const { t } = useI18n();
  usePageTitle(t('alerts.title'));
  const [view, setView] = useState<'log' | 'rules'>('log');
  const { rows, isLoading } = useAlertLog();

  if (isLoading) return <LoadingState />;

  return (
    <Page>
      <PageHeader title={t('alerts.title')} subtitle={t('alerts.subtitle')} />

      <Tabs
        fill
        size="lg"
        value={view}
        onChange={setView}
        groupLabel={t('alerts.title')}
        className="mb-6 w-[15%] min-w-[220px]"
        options={[
          { value: 'log', label: t('alerts.tab.log') },
          { value: 'rules', label: t('alerts.tab.rules') },
        ]}
      />

      {view === 'log' ? (
        <div className="space-y-5">
          <ThresholdSettings />
          <AlertLog rows={rows} />
        </div>
      ) : (
        <AlertRules />
      )}
    </Page>
  );
}

function AlertLog({ rows: allRows }: { rows: ReturnType<typeof useAlertLog>['rows'] }) {
  const { t } = useI18n();
  const { isInternal } = useSession();
  const { data: campaigns = [] } = useCampaigns();
  const [q, setQ] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');

  const rows = useMemo(
    () =>
      allRows.filter(
        (row) =>
          (!isInternal || companyFilter === 'all' || row.companyId === companyFilter) &&
          matchesQuery(q, row.campaignName, row.companyName)
      ),
    [allRows, companyFilter, isInternal, q]
  );
  const { paged, pagination } = usePagination(rows, PAGE_SIZE, [q, companyFilter]);

  const exportRows = () =>
    exportToXlsx('alerts.xlsx', rows, [
      { key: 'campaignName', header: t('alerts.col.campaign') },
      { key: 'companyName', header: t('alerts.col.company') },
      { key: 'ruleLabel', header: t('alerts.col.rule') },
      { key: 'detail', header: t('alerts.col.comparing') },
      { key: 'metric', header: t('alerts.col.metric'), format: (r) => t(`metric.${r.metric}.label`) },
      { key: 'delta', header: t('alerts.col.delta'), format: (r) => fmtPct(r.delta, 1) },
      { key: 'severity', header: t('alerts.col.read'), format: (r) => t(`detail.read.${r.severity}`) },
    ]);

  return (
    <Card padded={false}>
      <div className="p-5 pb-0">
        <SectionTitle
          action={
            <Button variant="primary" icon={<Download size={13} />} onClick={exportRows} disabled={rows.length === 0}>
              {t('common.exportCsv')}
            </Button>
          }
        >
          {t('alerts.title')}
        </SectionTitle>
      </div>

      {allRows.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState icon={<ShieldCheck size={32} />} title={t('alerts.empty.title')} body={t('alerts.empty.body')} />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 p-5 pb-4">
            <SearchInput value={q} onChange={setQ} placeholder={t('alerts.search')} className="min-w-56" />
            {isInternal && (
              <FilterSelect
                value={companyFilter}
                onChange={setCompanyFilter}
                allLabel={t('campaigns.filter.allCompanies')}
                options={companyOptions(campaigns)}
              />
            )}
          </div>

          {rows.length === 0 ? (
            <EmptyText className="pb-5 pt-0">{t('alerts.noMatches')}</EmptyText>
          ) : (
            <>
              <AlertLogTable rows={paged} />
              <div className="p-5 pt-4">
                <Pagination {...pagination} />
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
}

function AlertRules() {
  const { t } = useI18n();
  const { rules, removeRule, setRuleEnabled } = useAlertRules();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AlertRule | null>(null);
  const [deleting, setDeleting] = useState<AlertRule | null>(null);

  return (
    <div className="space-y-5">
      <SectionTitle
        className="mb-0 items-center"
        hint={t('alerts.rules.customHint')}
        action={
          <Button variant="primary" icon={<Plus size={13} />} onClick={() => setCreating(true)}>
            {t('alerts.rules.new')}
          </Button>
        }
      >
        {t('alerts.rules.customTitle')}
      </SectionTitle>

      {rules.length === 0 ? (
        <EmptyCard>{t('alerts.rules.empty')}</EmptyCard>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <AlertRuleCard
              key={rule.id}
              rule={rule}
              onToggle={(enabled) => setRuleEnabled(rule.id, enabled)}
              onEdit={() => setEditing(rule)}
              onDelete={() => setDeleting(rule)}
            />
          ))}
        </div>
      )}

      <AlertRuleDialog open={creating} onOpenChange={setCreating} />
      <AlertRuleDialog rule={editing ?? undefined} open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('alerts.rules.deleteTitle')}
        description={deleting ? t('alerts.rules.deleteBody', { name: deleting.name }) : ''}
        onConfirm={() => {
          if (deleting) removeRule(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}
