import { useMemo } from 'react';
import { useI18n } from '@/i18n';
import type { DateRange } from '@/lib/dateRange';
import { parseSelection, serializeSelection } from '@/lib/selection';
import {
  FilterMultiSelect,
  ListToolbar,
  PeriodPicker,
  ToolbarResetButton,
} from '@/components/page';
import { accountOptions, companyOptions, marketOptions } from '@/features/campaigns';
import type { Campaign } from '@/types';
import type { OverviewFilterState } from '../lib/overviewFilters';

/**
 * The Overview's filter bar: when (period), who (client, account) and where
 * (country). Options come from the campaigns the seat can see. Client and
 * account are Klea-side cuts — a client seat is one company already — so
 * they're hidden from clients.
 */
export function OverviewFilters({
  campaigns,
  filters,
  range,
  onChange,
  onReset,
  active,
  isInternal,
}: {
  campaigns: Campaign[];
  filters: OverviewFilterState;
  /** The resolved bounds of the selected period. */
  range: DateRange;
  onChange: (patch: Partial<OverviewFilterState>) => void;
  onReset: () => void;
  active: boolean;
  isInternal: boolean;
}) {
  const { t } = useI18n();

  const companies = useMemo(() => companyOptions(campaigns), [campaigns]);
  const accounts = useMemo(
    () => accountOptions(campaigns, t('campaigns.account.direct')),
    [campaigns, t],
  );
  const markets = useMemo(() => marketOptions(campaigns), [campaigns]);

  return (
    <ListToolbar className="mb-4">
      <PeriodPicker
        allowAll
        showYoy={filters.range !== 'all'}
        filters={filters}
        range={range}
        onChange={onChange}
      />

      <span className="hidden h-6 w-px bg-gray-200 sm:block dark:bg-white/10" aria-hidden />

      {isInternal && (
        <>
          <FilterMultiSelect
            className="w-52"
            values={parseSelection(filters.companyFilter)}
            onChange={(v) => onChange({ companyFilter: serializeSelection(v) })}
            allLabel={t('campaigns.filter.allCompanies')}
            options={companies}
          />
          <FilterMultiSelect
            className="w-52"
            values={parseSelection(filters.accountFilter)}
            onChange={(v) => onChange({ accountFilter: serializeSelection(v) })}
            allLabel={t('campaigns.filter.allAccounts')}
            options={accounts}
          />
        </>
      )}
      <FilterMultiSelect
        className="w-44"
        values={parseSelection(filters.countryFilter)}
        onChange={(v) => onChange({ countryFilter: serializeSelection(v) })}
        allLabel={t('campaigns.filter.allCountries')}
        options={markets}
      />

      <ToolbarResetButton active={active} onReset={onReset} label={t('campaigns.filter.reset')} />
    </ListToolbar>
  );
}
