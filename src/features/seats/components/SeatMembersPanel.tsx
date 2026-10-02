import { useState } from 'react';
import { Mail, ShieldCheck, ShieldOff, Trash2, UserPlus } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button, Card, CardHeader, DropdownMenuItem } from '@/components/ui';
import { ConfirmDialog, LoadingState } from '@/components/feedback';
import { RowActionsMenu, Table, TableEmptyRow, TableScroll, Td, Th } from '@/components/table';
import type { Seat, SeatMember } from '@/types';
import {
  useAcceptInvite,
  useRemoveSeatMember,
  useResendInvite,
  useSeatMembers,
  useUpdateSeatMemberRole,
} from '@/api/hooks/useSeats';
import { InviteUserModal } from './InviteUserModal';
import { InviteStatusPill, SeatCategoryPill, SeatRolePill } from './SeatPills';

/**
 * One seat's own member table — invite, promote/demote, resend/accept invite,
 * remove. Shared between the full Seats directory (an Admin seat browsing
 * every seat) and the light Users page (a seat's own admin managing just
 * their seat) — same component, the caller just decides what wraps it.
 */
export function SeatMembersPanel({ seat, canManage }: { seat: Seat; canManage: boolean }) {
  const { t } = useI18n();
  const { data: members, isLoading } = useSeatMembers(seat.id);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<SeatMember | null>(null);
  const removeMember = useRemoveSeatMember();

  return (
    <Card padded={false}>
      <CardHeader
        title={seat.name}
        badges={<SeatCategoryPill category={seat.category} />}
        hint={t('seats.memberCount', { count: members?.length ?? 0 })}
        actions={
          canManage && (
            <Button size="sm" icon={<UserPlus size={12} />} onClick={() => setInviting(true)}>
              {t('companies.inviteUser')}
            </Button>
          )
        }
      />

      {isLoading ? (
        <TableScroll className="p-5">
          <LoadingState compact />
        </TableScroll>
      ) : (
        <Table className="p-5">
          <thead>
            <tr>
              <Th>{t('companies.col.user')}</Th>
              <Th>{t('companies.col.role')}</Th>
              <Th>{t('seats.col.status')}</Th>
              <Th align="right">{t('companies.col.lastSeen')}</Th>
              {canManage && <Th />}
            </tr>
          </thead>
          <tbody>
            {members?.map((m) => (
              <tr key={m.id}>
                <Td>
                  <div className="font-medium text-brame-dark dark:text-gray-100">{m.name}</div>
                  <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{m.email}</div>
                </Td>
                <Td>
                  <SeatRolePill role={m.role} />
                </Td>
                <Td>
                  <InviteStatusPill status={m.status} />
                </Td>
                <Td align="right" className="text-gray-500 dark:text-gray-400">
                  {m.lastSeen}
                </Td>
                {canManage && (
                  <Td align="right" className="w-8">
                    <MemberActions member={m} onRemove={() => setRemoving(m)} />
                  </Td>
                )}
              </tr>
            ))}
            {members?.length === 0 && <TableEmptyRow colSpan={canManage ? 5 : 4}>{t('companies.noUsers')}</TableEmptyRow>}
          </tbody>
        </Table>
      )}

      {canManage && (
        <>
          <InviteUserModal seatId={seat.id} seatName={seat.name} open={inviting} onOpenChange={setInviting} />
          <ConfirmDialog
            open={!!removing}
            onOpenChange={(o) => !o && setRemoving(null)}
            title={t('companies.removeConfirmTitle', { name: removing?.name ?? '' })}
            description={t('companies.removeConfirmBody', { company: seat.name })}
            pending={removeMember.isPending}
            onConfirm={() => {
              if (removing) removeMember.mutate(removing.id);
              setRemoving(null);
            }}
          />
        </>
      )}
    </Card>
  );
}

function MemberActions({ member, onRemove }: { member: SeatMember; onRemove: () => void }) {
  const { t } = useI18n();
  const updateRole = useUpdateSeatMemberRole();
  const resendInvite = useResendInvite();
  const acceptInvite = useAcceptInvite();
  const promote = member.role === 'viewer';

  return (
    <RowActionsMenu>
      {member.status === 'pending' && (
        <>
          <DropdownMenuItem onSelect={() => resendInvite.mutate(member.id)}>
            <Mail size={13} />
            {t('seats.rowMenu.resendInvite')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => acceptInvite.mutate(member.id)}>
            <ShieldCheck size={13} />
            {t('seats.rowMenu.markAccepted')}
          </DropdownMenuItem>
        </>
      )}
      <DropdownMenuItem onSelect={() => updateRole.mutate({ memberId: member.id, role: promote ? 'admin' : 'viewer' })}>
        {promote ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
        {promote ? t('companies.rowMenu.makeAdmin') : t('companies.rowMenu.makeViewer')}
      </DropdownMenuItem>
      <DropdownMenuItem destructive onSelect={onRemove}>
        <Trash2 size={13} />
        {t('companies.rowMenu.remove')}
      </DropdownMenuItem>
    </RowActionsMenu>
  );
}
