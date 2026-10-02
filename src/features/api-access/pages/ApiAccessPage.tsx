import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button, Callout, Card, CodeBlock } from '@/components/ui';
import { LoadingState } from '@/components/feedback';
import { Page, PageHeader, SectionTitle } from '@/components/page';
import { useCurrentUser } from '@/features/profile';
import { NoSeatState, useCurrentSeat } from '@/features/seats';
import { ApiKeysPanel } from '../components/ApiKeysPanel';

// Illustrative until a real API exists — `.example` is a reserved TLD, so this
// can never point at somebody's actual host.
const SAMPLE_REQUEST = `curl https://api.brame.example/v1/campaigns \\
  -H "Authorization: Bearer YOUR_API_KEY"`;

/**
 * Where a seat's admin creates the read-only keys their own BI tools use to
 * pull data. Keys belong to the seat, not the person, so this sits in the
 * Account section next to Users and is gated the same way (seatAdmin access).
 */
export function ApiAccessPage() {
  const { t } = useI18n();
  usePageTitle(t('apiAccess.title'));
  const user = useCurrentUser();
  const { seat, isLoading } = useCurrentSeat();
  const [creating, setCreating] = useState(false);

  if (isLoading) return <LoadingState />;

  return (
    <Page>
      <PageHeader
        title={t('apiAccess.title')}
        subtitle={t('apiAccess.subtitle')}
        actions={
          seat && (
            <Button variant="primary" icon={<Plus size={14} />} onClick={() => setCreating(true)}>
              {t('apiAccess.create')}
            </Button>
          )
        }
      />

      {seat ? (
        <div className="space-y-6">
          <Callout className="max-w-3xl">{t(`apiAccess.scope.${seat.category}`, { name: seat.name })}</Callout>

          <ApiKeysPanel seat={seat} createdBy={user.name} creating={creating} onCreatingChange={setCreating} />

          <Card>
            <SectionTitle hint={t('apiAccess.connect.body')}>{t('apiAccess.connect.title')}</SectionTitle>
            <CodeBlock code={SAMPLE_REQUEST} multiline />
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{t('apiAccess.connect.note')}</p>
          </Card>
        </div>
      ) : (
        <NoSeatState />
      )}
    </Page>
  );
}
