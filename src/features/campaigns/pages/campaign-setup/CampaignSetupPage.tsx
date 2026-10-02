import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePagination } from '@/hooks/usePagination';
import { matchesQuery } from '@/lib/text';
import { Card, CardFooter, Pill } from '@/components/ui';
import { EmptyText, LoadingState } from '@/components/feedback';
import { FilterSelect, Page, PageHeader, SearchInput } from '@/components/page';
import { Pagination } from '@/components/table';
import { ListItemButton } from '@/components/display';
import { useCampaigns } from '@/api/hooks/useCampaigns';
import { companyOptions } from '../../lib/filterOptions';
import { AppOwnedPanel } from './AppOwnedPanel';
import { SalesforcePanel } from './SalesforcePanel';

const PAGE_SIZE = 10;

/**
 * RFC §4 rule 4 as a screen. Salesforce owns campaign identity and commercial
 * metadata; the app owns technical setup. The boundary is drawn visually
 * because the failure it prevents is operational: if these look alike, someone
 * edits a synced field, the next sync silently reverts it, and trust in the
 * tool goes with it.
 */
export function CampaignSetupPage() {
  const { t } = useI18n();
  usePageTitle(t('setup.title'));
  const [params, setParams] = useSearchParams();
  const { data: campaigns = [], isLoading } = useCampaigns();
  const [q, setQ] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');

  const filtered = useMemo(
    () =>
      campaigns.filter(
        (c) => (companyFilter === 'all' || c.companyId === companyFilter) && matchesQuery(q, c.name)
      ),
    [campaigns, q, companyFilter]
  );
  const { paged, pagination } = usePagination(filtered, PAGE_SIZE, [q, companyFilter]);

  const campaign = campaigns.find((c) => c.id === params.get('campaign')) ?? campaigns[0];

  if (isLoading || !campaign) return <LoadingState />;

  return (
    <Page className="pb-3">
      <PageHeader title={t('setup.title')} subtitle={t('setup.subtitle')} className="mb-5" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
        <Card padded={false}>
          <div className="space-y-2 border-b border-gray-200 p-3 dark:border-white/10">
            <SearchInput value={q} onChange={setQ} placeholder={t('campaigns.search')} />
            <FilterSelect
              className="w-full"
              value={companyFilter}
              onChange={setCompanyFilter}
              allLabel={t('campaigns.filter.allCompanies')}
              options={companyOptions(campaigns)}
            />
          </div>
          <div>
            {filtered.length === 0 && <EmptyText className="px-4 py-8">{t('campaigns.noMatches')}</EmptyText>}
            {paged.map((c) => (
              <ListItemButton
                key={c.id}
                active={c.id === campaign.id}
                onClick={() => setParams({ campaign: c.id })}
                title={c.name}
                subtitle={
                  <span className="flex items-center gap-1.5">
                    {c.companyName}
                    {c.appOwned.nexdLiveIds.length === 0 && <Pill tone="amber">{t('setup.setupGap')}</Pill>}
                  </span>
                }
              />
            ))}
          </div>
          {filtered.length > 0 && (
            <CardFooter className="p-3">
              <Pagination {...pagination} />
            </CardFooter>
          )}
        </Card>

        {/* Keyed by campaign id so switching the selected campaign remounts
            these panels — otherwise their local form state (tag, language,
            primarySource…) would carry the previous campaign's edits over. */}
        <div key={campaign.id} className="space-y-5">
          <SalesforcePanel campaign={campaign} />
          <AppOwnedPanel campaign={campaign} />
        </div>
      </div>
    </Page>
  );
}
