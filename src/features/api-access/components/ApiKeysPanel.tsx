import { useState } from 'react';
import { Ban, KeyRound } from 'lucide-react';
import { useFormatters, useI18n } from '@/i18n';
import { Card, CardHeader, DropdownMenuItem, Pill, type PillTone } from '@/components/ui';
import { ConfirmDialog, LoadingState } from '@/components/feedback';
import { RowActionsMenu, Table, TableEmptyRow, TableScroll, Td, Th } from '@/components/table';
import type { ApiKey, Seat } from '@/types';
import { useApiKeys, useRevokeApiKey } from '@/api/hooks/useApiKeys';
import { apiKeyStatus, type ApiKeyStatus } from '../lib/apiKeys';
import { ApiKeyRevealDialog } from './ApiKeyRevealDialog';
import { CreateApiKeyModal } from './CreateApiKeyModal';

const STATUS_TONE: Record<ApiKeyStatus, PillTone> = {
  active: 'green',
  expired: 'amber',
  revoked: 'neutral',
};

/**
 * One seat's own API keys — create (with a one-time reveal of the secret) and
 * revoke. Revoked keys stay in the list so there's a record of what used to
 * have access; only the prefix of any key is ever shown after creation.
 */
export function ApiKeysPanel({
  seat,
  createdBy,
  creating,
  onCreatingChange,
}: {
  seat: Seat;
  createdBy: string;
  /** Whether the create-key modal is open. Owned by the page so its header
   *  button can open it. */
  creating: boolean;
  onCreatingChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { fmtDateLong, relativeTime } = useFormatters();
  const { data: keys, isLoading } = useApiKeys(seat.id);
  const revokeKey = useRevokeApiKey();
  const [reveal, setReveal] = useState<{ name: string; secret: string } | null>(null);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);

  return (
    <Card padded={false}>
      <CardHeader title={t('apiAccess.keysTitle')} hint={t('apiAccess.keyCount', { count: keys?.length ?? 0 })} />

      {isLoading ? (
        <TableScroll className="p-5">
          <LoadingState compact />
        </TableScroll>
      ) : (
        <Table className="p-5">
          <thead>
            <tr>
              <Th>{t('apiAccess.col.name')}</Th>
              <Th>{t('apiAccess.col.status')}</Th>
              <Th>{t('apiAccess.col.created')}</Th>
              <Th>{t('apiAccess.col.lastUsed')}</Th>
              <Th>{t('apiAccess.col.expires')}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {keys?.map((k) => {
              const status = apiKeyStatus(k);
              return (
                <tr key={k.id}>
                  <Td>
                    <div className="flex items-center gap-2 font-medium text-brame-dark dark:text-gray-100">
                      <KeyRound size={13} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
                      {k.name}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-gray-400 dark:text-gray-500">{k.prefix}…</div>
                  </Td>
                  <Td>
                    <Pill tone={STATUS_TONE[status]}>{t(`apiAccess.status.${status}`)}</Pill>
                  </Td>
                  <Td>
                    <div className="text-brame-dark dark:text-gray-100">{fmtDateLong(k.createdAt)}</div>
                    <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                      {t('apiAccess.createdBy', { name: k.createdBy })}
                    </div>
                  </Td>
                  <Td className="text-gray-500 dark:text-gray-400">
                    {k.lastUsedAt ? relativeTime(k.lastUsedAt) : t('apiAccess.neverUsed')}
                  </Td>
                  <Td className="text-gray-500 dark:text-gray-400">
                    {k.expiresAt ? fmtDateLong(k.expiresAt) : t('apiAccess.noExpiry')}
                  </Td>
                  <Td align="right" className="w-8">
                    {status !== 'revoked' && (
                      <RowActionsMenu>
                        <DropdownMenuItem destructive onSelect={() => setRevoking(k)}>
                          <Ban size={13} />
                          {t('apiAccess.revoke')}
                        </DropdownMenuItem>
                      </RowActionsMenu>
                    )}
                  </Td>
                </tr>
              );
            })}
            {keys?.length === 0 && <TableEmptyRow colSpan={6}>{t('apiAccess.empty')}</TableEmptyRow>}
          </tbody>
        </Table>
      )}

      <CreateApiKeyModal
        seatId={seat.id}
        seatName={seat.name}
        createdBy={createdBy}
        open={creating}
        onOpenChange={onCreatingChange}
        onCreated={({ key, secret }) => setReveal({ name: key.name, secret })}
      />
      <ApiKeyRevealDialog reveal={reveal} onClose={() => setReveal(null)} />
      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(o) => !o && setRevoking(null)}
        title={t('apiAccess.revokeConfirmTitle', { name: revoking?.name ?? '' })}
        description={t('apiAccess.revokeConfirmBody')}
        confirmLabel={t('apiAccess.revoke')}
        pending={revokeKey.isPending}
        onConfirm={() => {
          if (revoking) revokeKey.mutate(revoking.id);
          setRevoking(null);
        }}
      />
    </Card>
  );
}
