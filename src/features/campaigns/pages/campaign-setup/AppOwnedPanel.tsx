import { useState } from 'react';
import { Pencil, Plus, Save, Star, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { Button, Card, IconButton, Input, Pill, Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui';
import { ConfirmDialog } from '@/components/feedback';
import { FieldLabel, FormField } from '@/components/form';
import { SectionTitle } from '@/components/page';
import { ListRow } from '@/components/display';
import type { Campaign, SourceKey } from '@/types';
import { useRemoveClicktag, useUpdateCampaign } from '@/api/hooks/useCampaigns';
import { AddClicktagModal } from '../../components/AddClicktagModal';
import { SOURCE_KEYS, sourceMeta } from '../../lib/sources';

const splitIds = (value: string) =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** App-owned technical setup — never touched by a sync (RFC §4 rule 4),
 *  including which source is primary. */
export function AppOwnedPanel({ campaign }: { campaign: Campaign }) {
  const { t } = useI18n();
  const updateCampaign = useUpdateCampaign();
  const removeClicktag = useRemoveClicktag();

  const [draft, setDraft] = useState({
    campaignTag: campaign.appOwned.campaignTag,
    language: campaign.appOwned.language,
    atkPixelMapping: campaign.appOwned.atkPixelMapping,
    nexdLiveIds: campaign.appOwned.nexdLiveIds.join(', '),
    primarySource: campaign.primarySource,
  });
  const [dirty, setDirty] = useState(false);
  const [addingClicktag, setAddingClicktag] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const edit = (patch: Partial<typeof draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };

  const save = () => {
    const { primarySource, nexdLiveIds, ...appOwned } = draft;
    updateCampaign.mutate(
      { id: campaign.id, patch: { primarySource, appOwned: { ...appOwned, nexdLiveIds: splitIds(nexdLiveIds) } } },
      { onSuccess: () => setDirty(false) }
    );
  };

  const nexdMissing = draft.nexdLiveIds.trim() === '';

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          className="sm:col-span-2"
          label={t('setup.app.primarySource')}
          labelVariant="caps"
          labelHint={t('setup.app.primarySourceHelp')}
        >
          <Select value={draft.primarySource} onValueChange={(v) => edit({ primarySource: v as SourceKey })}>
            <SelectTrigger />
            <SelectContent>
              {SOURCE_KEYS.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="flex items-center gap-1.5">
                    {draft.primarySource === s && <Star size={11} className="text-brame-teal" fill="currentColor" />}
                    {sourceMeta(campaign, s).fullLabel}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <SetupField
          label={t('setup.app.campaignTag')}
          help={t('setup.app.campaignTagHelp')}
          value={draft.campaignTag}
          onChange={(campaignTag) => edit({ campaignTag })}
          mono
        />
        <SetupField label={t('setup.app.language')} value={draft.language} onChange={(language) => edit({ language })} />
        <SetupField
          label={t('setup.app.atkPixel')}
          help={t('setup.app.atkPixelHelp')}
          value={draft.atkPixelMapping}
          onChange={(atkPixelMapping) => edit({ atkPixelMapping })}
          mono
        />
        <SetupField
          label={t('setup.app.nexdIds')}
          help={t('setup.app.nexdIdsHelp')}
          value={draft.nexdLiveIds}
          onChange={(nexdLiveIds) => edit({ nexdLiveIds })}
          mono
          warning={nexdMissing ? t('setup.app.nexdWarn') : undefined}
        />
      </div>

      <div className="mt-5">
        <FieldLabel variant="caps" hint={t('setup.app.clicktagsHelp')} className="mb-2">
          {t('setup.app.clicktagsTitle')}
        </FieldLabel>
        <div className="space-y-2">
          {campaign.appOwned.clicktags.map((ct) => (
            <ListRow key={ct.id} className="justify-start gap-3 py-2">
              <span className="w-20 flex-shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">{ct.label}</span>
              <code className="flex-1 truncate text-xs text-brame-dark dark:text-gray-200">{ct.url}</code>
              <IconButton
                variant="ghost"
                label={t('common.remove')}
                icon={<Trash2 size={13} />}
                onClick={() => setRemovingId(ct.id)}
                className="p-0 text-gray-300 hover:bg-transparent hover:text-red-500 dark:text-gray-600 dark:hover:bg-transparent dark:hover:text-red-400"
              />
            </ListRow>
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
          if (removingId) removeClicktag.mutate({ campaignId: campaign.id, clicktagId: removingId });
          setRemovingId(null);
        }}
      />
    </Card>
  );
}

/** A caps-labelled text input on the setup panel, with an optional warning
 *  state for a value the pipeline can't work without. */
function SetupField({
  label,
  value,
  onChange,
  help,
  mono,
  warning,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
  mono?: boolean;
  warning?: string;
}) {
  return (
    <FormField label={label} labelVariant="caps" labelHint={help}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          mono && 'font-mono text-xs',
          warning && 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10'
        )}
      />
      {warning && <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">{warning}</span>}
    </FormField>
  );
}
