import { useMemo } from 'react';
import { useI18n } from '@/i18n';
import { matchesSelection, parseSelection, serializeSelection } from '@/lib/selection';
import {
  FilterCombobox,
  FilterMultiSelect,
  ListToolbar,
  PeriodPicker,
  ToolbarResetButton,
} from '@/components/page';
import { marketOptions, personOptions, PersonLabel } from '@/features/campaigns';
import type { Campaign } from '@/types';
import type { DateRange } from '@/lib/dateRange';
import type { OverviewFilterState } from '../lib/overviewFilters';

/**
 * The Overview's filter bar: who (sales / key account, campaign manager),
 * what (campaign), where (country) and when (period). Every dropdown is
 * combinable with the others. Options come from the campaigns the seat can
 * see; the campaign list is narrowed by the other three so it stays short
 * and never offers a campaign the other filters have already excluded.
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
  /** Sales and campaign manager are Klea-side cuts — hidden from clients. */
  isInternal: boolean;
}) {
  const { t } = useI18n();

  const salesPeople = useMemo(
    () => personOptions(campaigns, (c) => c.salesforce.salesPerson),
    [campaigns],
  );
  const managers = useMemo(
    () => personOptions(campaigns, (c) => c.salesforce.campaignManager),
    [campaigns],
  );
  const markets = useMemo(() => marketOptions(campaigns), [campaigns]);
  const campaignChoices = useMemo(() => {
    const options = campaigns
      .filter(
        (c) =>
          (!isInternal || matchesSelection(filters.salesFilter, c.salesforce.salesPerson.id)) &&
          (!isInternal ||
            matchesSelection(filters.managerFilter, c.salesforce.campaignManager.id)) &&
          matchesSelection(filters.countryFilter, c.salesforce.market),
      )
      .map((c) => ({ value: c.id, label: c.name, description: c.companyName }));
    // Keep the current picks selectable even if the others now exclude them.
    for (const id of parseSelection(filters.campaignFilter)) {
      const picked = campaigns.find((c) => c.id === id);
      if (picked && !options.some((o) => o.value === id))
        options.push({ value: id, label: picked.name, description: picked.companyName });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [
    campaigns,
    filters.salesFilter,
    filters.managerFilter,
    filters.countryFilter,
    filters.campaignFilter,
    isInternal,
  ]);

  const people = (options: { value: string; label: string; avatarUrl: string | null }[]) =>
    options.map((o) => ({
      value: o.value,
      label: <PersonLabel name={o.label} avatarUrl={o.avatarUrl} />,
    }));

  return (
    <ListToolbar className="mb-4">
      <PeriodPicker filters={filters} range={range} onChange={onChange} />

      <span className="hidden h-6 w-px bg-gray-200 sm:block dark:bg-white/10" aria-hidden />

      {isInternal && (
        <>
          <FilterMultiSelect
            className="w-52"
            values={parseSelection(filters.salesFilter)}
            onChange={(v) => onChange({ salesFilter: serializeSelection(v) })}
            allLabel={t('campaigns.filter.allSales')}
            options={people(salesPeople)}
          />
          <FilterMultiSelect
            className="w-52"
            values={parseSelection(filters.managerFilter)}
            onChange={(v) => onChange({ managerFilter: serializeSelection(v) })}
            allLabel={t('campaigns.filter.allManagers')}
            options={people(managers)}
          />
        </>
      )}
      <FilterCombobox
        className="w-56"
        values={parseSelection(filters.campaignFilter)}
        onChange={(v) => onChange({ campaignFilter: serializeSelection(v) })}
        allLabel={t('overview.filter.allCampaigns')}
        options={campaignChoices}
      />
      <FilterMultiSelect
        className="w-40"
        values={parseSelection(filters.countryFilter)}
        onChange={(v) => onChange({ countryFilter: serializeSelection(v) })}
        allLabel={t('campaigns.filter.allCountries')}
        options={markets}
      />

      <ToolbarResetButton active={active} onReset={onReset} label={t('campaigns.filter.reset')} />
    </ListToolbar>
  );
}
