import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Cloud, Lock, Pencil, Plus, RotateCw, Save, Search, Star, Trash2 } from 'lucide-react';
import { fmtCompact } from '../mock/data';
import type { Campaign, SourceKey } from '../mock/types';
import { useI18n, useFormatters } from '../lib/i18n';
import { usePageTitle } from '../lib/usePageTitle';
import { useCampaigns } from '../hooks/useCampaigns';
import { useUpdateCampaign, useRemoveClicktag } from '../hooks/useCampaigns';
import { sourceMeta } from '../mock/data';
import AddClicktagModal from '../components/AddClicktagModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../components/ui/select';
import { Button, Card, Pill, SectionTitle, Tooltip } from '../components/primitives';

/**
 * RFC §4 rule 4 as a screen. Salesforce owns campaign identity and commercial
 * metadata; the app owns technical setup. The boundary is drawn visually
 * because the failure it prevents is operational: if these look alike, someone
 * edits a synced field, the next sync silently reverts it, and trust in the
 * tool goes with it.
 */
export default function SetupView() {
  const { t } = useI18n();
  usePageTitle(t('setup.title'));
  const [params, setParams] = useSearchParams();
  const { data: campaigns, isLoading } = useCampaigns();
  const [q, setQ] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');

  const companyOptions = useMemo(
    () => [...new Map((campaigns ?? []).map((c) => [c.companyId, c.companyName])).entries()],
    [campaigns]
  );

  const filtered = useMemo(
    () =>
      (campaigns ?? []).filter(
        (c) =>
          (companyFilter === 'all' || c.companyId === companyFilter) &&
          (!q || c.name.toLowerCase().includes(q.toLowerCase()))
      ),
    [campaigns, q, companyFilter]
  );

  const selectedId = params.get('campaign') ?? campaigns?.[0]?.id;
  const campaign = campaigns?.find((c) => c.id === selectedId) ?? campaigns?.[0];

  if (isLoading || !campaign) {
    return <div className="px-8 py-16 text-center text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>;
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{t('setup.title')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">{t('setup.subtitle')}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <Card padded={false}>
          <div className="space-y-2 border-b border-gray-200 p-3 dark:border-white/10">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('campaigns.search')}
                className="w-full rounded-lg border border-gray-300 py-1.5 pl-8 pr-2.5 text-sm text-brame-dark outline-none focus:border-brame-teal dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
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
          <div className="max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('campaigns.noMatches')}
              </p>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setParams({ campaign: c.id })}
                className={`w-full border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-0 dark:border-white/5 ${
                  c.id === campaign.id ? 'bg-brame-teal/5 dark:bg-brame-teal/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <div
                  className={`text-sm font-medium ${
                    c.id === campaign.id ? 'text-brame-teal dark:text-brame-turquoise-light' : 'text-brame-dark dark:text-gray-100'
                  }`}
                >
                  {c.name}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-xs text-gray-400 dark:text-gray-500">{c.companyName}</span>
                  {c.appOwned.nexdLiveIds.length === 0 && <Pill tone="amber">{t('setup.setupGap')}</Pill>}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Keyed by campaign id so switching the selected campaign remounts
            these panels — otherwise their local form state (tag, language,
            primarySource…) would carry the previous campaign's edits over. */}
        <div key={campaign.id} className="space-y-5">
          <SalesforcePanel campaign={campaign} />
          <AppOwnedPanel campaign={campaign} />
        </div>
      </div>
    </div>
  );
}

function SalesforcePanel({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const { fmtDateLong, fmtTime, relativeTime } = useFormatters();
  const [syncing, setSyncing] = useState(false);

  const rows: [string, string][] = [
    [t('setup.sf.campaignName'), campaign.name],
    [t('setup.sf.company'), campaign.companyName],
    [t('setup.sf.salesforceId'), campaign.salesforceId],
    [t('setup.sf.owner'), campaign.salesforce.owner],
    [t('setup.sf.market'), campaign.salesforce.market],
    [t('setup.sf.productLine'), campaign.salesforce.productLine],
    [t('setup.sf.bookedImpressions'), fmtCompact(campaign.salesforce.bookedImpressions)],
    [t('setup.sf.flight'), `${fmtDateLong(campaign.flightStart)} – ${fmtDateLong(campaign.flightEnd)}`],
  ];

  return (
    <Card className="border-l-4 border-l-brame-purple">
      <SectionTitle
        hint={t('setup.sf.hint')}
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {t('setup.sf.syncedAgo', {
                time: relativeTime(campaign.salesforce.lastSyncedAt),
                clock: fmtTime(campaign.salesforce.lastSyncedAt),
              })}
            </span>
            <Button
              size="sm"
              icon={<RotateCw size={12} className={syncing ? 'animate-spin' : ''} />}
              onClick={() => {
                setSyncing(true);
                window.setTimeout(() => setSyncing(false), 1400);
              }}
              disabled={syncing}
            >
              {syncing ? t('setup.sf.syncing') : t('setup.sf.syncNow')}
            </Button>
          </div>
        }
      >
        <span className="flex items-center gap-2">
          <Cloud size={16} className="text-brame-purple" />
          {t('setup.sf.title')}
          <Pill tone="purple" icon={<Lock size={10} />}>
            {t('setup.sf.readOnlyBadge')}
          </Pill>
        </span>
      </SectionTitle>

      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex items-baseline justify-between gap-4 border-b border-gray-100 pb-2 dark:border-white/5"
          >
            <dt className="text-sm text-gray-500 dark:text-gray-400">{k}</dt>
            <dd className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              {v}
              <Lock size={11} className="text-gray-300 dark:text-gray-600" />
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function AppOwnedPanel({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const updateCampaign = useUpdateCampaign();
  const removeClicktag = useRemoveClicktag();

  const [tag, setTag] = useState(campaign.appOwned.campaignTag);
  const [language, setLanguage] = useState(campaign.appOwned.language);
  const [pixel, setPixel] = useState(campaign.appOwned.atkPixelMapping);
  const [nexdIds, setNexdIds] = useState(campaign.appOwned.nexdLiveIds.join(', '));
  const [primarySource, setPrimarySource] = useState<SourceKey>(campaign.primarySource);
  const [dirty, setDirty] = useState(false);
  const [addingClicktag, setAddingClicktag] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };

  const save = () => {
    updateCampaign.mutate(
      {
        id: campaign.id,
        patch: {
          primarySource,
          appOwned: {
            campaignTag: tag,
            language,
            atkPixelMapping: pixel,
            nexdLiveIds: nexdIds
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          },
        },
      },
      { onSuccess: () => setDirty(false) }
    );
  };

  const sourceOptions: SourceKey[] = ['atk', 'nexd', 'custom'];
  const removingClicktag = campaign.appOwned.clicktags.find((c) => c.id === removingId);

  return (
    <Card className="border-l-4 border-l-brame-teal">
      <SectionTitle
        hint={t('setup.app.hint')}
        action={
          <div className="flex items-center gap-2">
            {!dirty && updateCampaign.isSuccess && <Pill tone="green">{t('setup.app.saved')}</Pill>}
            <Button
              variant="primary"
              size="sm"
              icon={<Save size={12} />}
              disabled={!dirty || updateCampaign.isPending}
              onClick={save}
            >
              {updateCampaign.isPending ? t('common.saving') : t('setup.app.save')}
            </Button>
          </div>
        }
      >
        <span className="flex items-center gap-2">
          <Pencil size={15} className="text-brame-teal" />
          {t('setup.app.title')}
          <Pill tone="teal">{t('setup.app.editableBadge')}</Pill>
        </span>
      </SectionTitle>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('setup.app.primarySource')}
            <Tooltip text={t('setup.app.primarySourceHelp')} />
          </span>
          <Select value={primarySource} onValueChange={(v) => touch(setPrimarySource)(v as SourceKey)}>
            <SelectTrigger />
            <SelectContent>
              {sourceOptions.map((s) => {
                const meta = sourceMeta(campaign, s);
                return (
                  <SelectItem key={s} value={s}>
                    <span className="flex items-center gap-1.5">
                      {primarySource === s && <Star size={11} className="text-brame-teal" fill="currentColor" />}
                      {meta.fullLabel}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </label>

        <Field label={t('setup.app.campaignTag')} help={t('setup.app.campaignTagHelp')} value={tag} onChange={touch(setTag)} mono />
        <Field label={t('setup.app.language')} value={language} onChange={touch(setLanguage)} />
        <Field
          label={t('setup.app.atkPixel')}
          help={t('setup.app.atkPixelHelp')}
          value={pixel}
          onChange={touch(setPixel)}
          mono
        />
        <Field
          label={t('setup.app.nexdIds')}
          help={t('setup.app.nexdIdsHelp')}
          value={nexdIds}
          onChange={touch(setNexdIds)}
          mono
          warn={nexdIds.trim() === ''}
          warnText={t('setup.app.nexdWarn')}
        />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('setup.app.clicktagsTitle')}
            <Tooltip text={t('setup.app.clicktagsHelp')} />
          </div>
        </div>
        <div className="space-y-2">
          {campaign.appOwned.clicktags.map((ct) => (
            <div
              key={ct.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-white/10"
            >
              <span className="w-20 flex-shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                {ct.label}
              </span>
              <code className="flex-1 truncate text-xs text-brame-dark dark:text-gray-200">{ct.url}</code>
              <button
                onClick={() => setRemovingId(ct.id)}
                className="text-gray-300 transition-colors hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <Button size="sm" icon={<Plus size={12} />} onClick={() => setAddingClicktag(true)}>
            {t('setup.app.addClicktag')}
          </Button>
        </div>
      </div>

      <AddClicktagModal campaignId={campaign.id} open={addingClicktag} onOpenChange={setAddingClicktag} />
      <ConfirmDialog
        open={!!removingId}
        onOpenChange={(o) => !o && setRemovingId(null)}
        title={t('clicktag.removeTitle')}
        description={t('clicktag.removeBody')}
        pending={removeClicktag.isPending}
        onConfirm={() => {
          if (removingClicktag) removeClicktag.mutate({ campaignId: campaign.id, clicktagId: removingClicktag.id });
          setRemovingId(null);
        }}
      />
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  help,
  mono,
  warn,
  warnText,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
  mono?: boolean;
  warn?: boolean;
  warnText?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
        {help && <Tooltip text={help} />}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brame-teal dark:text-gray-100 ${
          mono ? 'font-mono text-xs' : ''
        } ${
          warn
            ? 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10'
            : 'border-gray-300 dark:border-white/15 dark:bg-brame-dark-light'
        }`}
      />
      {warn && warnText && <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">{warnText}</span>}
    </label>
  );
}
