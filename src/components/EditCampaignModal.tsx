import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Save, Star } from 'lucide-react';
import type { Campaign, SourceKey } from '../mock/types';
import { useUpdateCampaign } from '../hooks/useCampaigns';
import { useI18n } from '../lib/i18n';
import { sourceMeta } from '../mock/data';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select';
import { Button, Tooltip } from './primitives';
import { Field } from '../views/auth/fields';

const schema = z.object({
  name: z.string().min(1, 'required'),
  status: z.enum(['live', 'scheduled', 'ended', 'archived']),
  primarySource: z.enum(['atk', 'nexd', 'custom']),
  language: z.string().min(1, 'required'),
});

type FormValues = z.infer<typeof schema>;

export default function EditCampaignModal({
  campaign,
  open,
  onOpenChange,
}: {
  campaign: Campaign | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const updateCampaign = useUpdateCampaign();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: campaign
      ? {
          name: campaign.name,
          status: campaign.status,
          primarySource: campaign.primarySource,
          language: campaign.appOwned.language,
        }
      : undefined,
  });

  // Reset dirty/error state each time a different campaign is opened, rather
  // than carrying the previous campaign's edits into this one.
  useEffect(() => {
    if (campaign) {
      reset({
        name: campaign.name,
        status: campaign.status,
        primarySource: campaign.primarySource,
        language: campaign.appOwned.language,
      });
    }
  }, [campaign?.id, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!campaign) return null;

  const onSubmit = (values: FormValues) => {
    updateCampaign.mutate(
      {
        id: campaign.id,
        patch: {
          name: values.name,
          status: values.status,
          primarySource: values.primarySource,
          appOwned: { language: values.language },
        },
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const sourceOptions: SourceKey[] = ['atk', 'nexd', 'custom'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editCampaign.title')}</DialogTitle>
          <DialogDescription>{t('editCampaign.subtitle')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label={t('editCampaign.name')} {...register('name')} />
          {errors.name && <p className="-mt-3 text-xs text-red-600 dark:text-red-400">{t('common.required')}</p>}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-brame-dark dark:text-gray-200">
              {t('editCampaign.status')}
            </span>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger />
                  <SelectContent>
                    <SelectItem value="live">{t('status.live')}</SelectItem>
                    <SelectItem value="scheduled">{t('status.scheduled')}</SelectItem>
                    <SelectItem value="ended">{t('status.ended')}</SelectItem>
                    <SelectItem value="archived">{t('status.archived')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-brame-dark dark:text-gray-200">
              {t('editCampaign.primarySource')}
              <Tooltip text={t('editCampaign.primarySourceHelp')} />
            </span>
            <Controller
              control={control}
              name="primarySource"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger />
                  <SelectContent>
                    {sourceOptions.map((s) => {
                      const meta = sourceMeta(campaign, s);
                      return (
                        <SelectItem key={s} value={s}>
                          <span className="flex items-center gap-1.5">
                            {field.value === s && <Star size={11} className="text-brame-teal" fill="currentColor" />}
                            {meta.fullLabel}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
          </label>

          <Field label={t('editCampaign.language')} {...register('language')} />

          <DialogFooter>
            <Link
              to={`/admin/setup?campaign=${campaign.id}`}
              onClick={() => onOpenChange(false)}
              className="mr-auto text-sm font-medium text-brame-teal hover:underline dark:text-brame-turquoise-light"
            >
              {t('editCampaign.openFullSetup')}
            </Link>
            <Button variant="secondary" onClick={() => onOpenChange(false)} type="button">
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Save size={13} />}
              disabled={!isDirty || updateCampaign.isPending}
            >
              {updateCampaign.isPending ? t('common.saving') : t('editCampaign.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
