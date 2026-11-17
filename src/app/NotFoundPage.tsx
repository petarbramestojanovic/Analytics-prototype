import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { NotFoundState } from '@/components/page';

/** Any URL the route table doesn't know — a mistyped or outdated link. */
export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <NotFoundState
      title={t('notFound.title')}
      body={t('notFound.body')}
      backTo={paths.overview}
      backLabel={t('notFound.back')}
    />
  );
}
