import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, KeyRound, MoreHorizontal, Search, ShieldCheck, ShieldOff, Trash2, UserPlus } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { usePageTitle } from '../lib/usePageTitle';
import { useCompanies } from '../hooks/useCompanies';
import { useCampaigns } from '../hooks/useCampaigns';
import { useUsers, useUpdateUserRole, useDeleteUser } from '../hooks/useCompanies';
import type { Company, CompanyUser } from '../mock/types';
import InviteUserModal from '../components/InviteUserModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Button, Card, LoadingState, Pill, TableScroll, Td, Th } from '../components/primitives';

/**
 * Split screen: companies on the left act as a directory, the selected
 * company's users fill the right. One company is "open" at a time rather
 * than every company's table stacked and expanded, which is what made the
 * previous layout unwieldy past two or three tenants.
 */
export default function CompaniesView() {
  const { t } = useI18n();
  usePageTitle(t('companies.title'));
  const [params, setParams] = useSearchParams();
  const { data: companies, isLoading } = useCompanies();
  const { data: allCampaigns } = useCampaigns();
  const { data: allUsers } = useUsers();
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () => (companies ?? []).filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase())),
    [companies, q]
  );

  const selectedId = params.get('company') ?? companies?.[0]?.id;
  const selected = companies?.find((c) => c.id === selectedId) ?? companies?.[0];
  const [invitingAny, setInvitingAny] = useState(false);

  if (isLoading || !companies || !selected) {
    return <LoadingState label={t('common.loading')} />;
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brame-dark dark:text-white">{t('companies.title')}</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">{t('companies.subtitle')}</p>
        </div>
        <Button variant="primary" icon={<UserPlus size={13} />} onClick={() => setInvitingAny(true)}>
          {t('companies.inviteUser')}
        </Button>
      </div>

      <InviteUserModal open={invitingAny} onOpenChange={setInvitingAny} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
        <Card padded={false}>
          <div className="border-b border-gray-200 p-3 dark:border-white/10">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('companies.search')}
                className="w-full rounded-lg border border-gray-300 py-1.5 pl-8 pr-2.5 text-sm text-brame-dark outline-none focus:border-brame-teal dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto lg:max-h-[70vh]">
            {filtered.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('companies.noMatches')}
              </p>
            )}
            {filtered.map((company) => {
              const campaignCount = allCampaigns?.filter((c) => c.companyId === company.id).length ?? 0;
              const userCount = allUsers?.filter((u) => u.companyId === company.id).length ?? 0;
              const active = company.id === selected.id;
              return (
                <button
                  key={company.id}
                  onClick={() => setParams({ company: company.id })}
                  className={`flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-0 dark:border-white/5 ${
                    active ? 'bg-brame-teal/5 dark:bg-brame-teal/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                      active
                        ? 'bg-brame-teal text-white'
                        : 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500'
                    }`}
                  >
                    <Building2 size={15} />
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`truncate text-sm font-medium ${
                        active ? 'text-brame-teal dark:text-brame-turquoise-light' : 'text-brame-dark dark:text-gray-100'
                      }`}
                    >
                      {company.name}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {t('companies.summaryShort', { users: userCount, campaigns: campaignCount })}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <CompanyDetail
          key={selected.id}
          company={selected}
          campaignCount={allCampaigns?.filter((c) => c.companyId === selected.id).length ?? 0}
          liveCount={allCampaigns?.filter((c) => c.companyId === selected.id && c.status === 'live').length ?? 0}
        />
      </div>
    </div>
  );
}

function CompanyDetail({
  company,
  campaignCount,
  liveCount,
}: {
  company: Company;
  campaignCount: number;
  liveCount: number;
}) {
  const { t } = useI18n();
  const { data: companyUsers, isLoading } = useUsers(company.id);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<CompanyUser | null>(null);
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();

  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-brame-dark dark:text-gray-100">{company.name}</h2>
            <Pill tone="teal" icon={<ShieldCheck size={10} />}>
              {t('companies.isolatedTenant')}
            </Pill>
          </div>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {t('companies.summary', { users: companyUsers?.length ?? 0, campaigns: campaignCount, live: liveCount })}
          </p>
        </div>
        <Button size="sm" icon={<UserPlus size={12} />} onClick={() => setInviting(true)}>
          {t('companies.inviteUser')}
        </Button>
      </div>

      <TableScroll className="p-5">
        {isLoading ? (
          <LoadingState label={t('common.loading')} compact />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <Th>{t('companies.col.user')}</Th>
                <Th>{t('companies.col.role')}</Th>
                <Th>{t('companies.col.twoFactor')}</Th>
                <Th align="right">{t('companies.col.lastSeen')}</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {companyUsers?.map((u) => (
                <tr key={u.id}>
                  <Td>
                    <div className="font-medium text-brame-dark dark:text-gray-100">{u.name}</div>
                    <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{u.email}</div>
                  </Td>
                  <Td>
                    <Pill tone={u.role === 'admin' ? 'purple' : 'neutral'}>
                      {u.role === 'admin' ? t('companies.role.admin') : t('companies.role.viewer')}
                    </Pill>
                  </Td>
                  <Td>
                    {u.twoFactor ? (
                      <Pill tone="green" icon={<KeyRound size={10} />}>
                        {t('companies.authenticatorApp')}
                      </Pill>
                    ) : (
                      <Pill tone="amber">{t('companies.notEnrolled')}</Pill>
                    )}
                  </Td>
                  <Td align="right" className="text-gray-500 dark:text-gray-400">
                    {u.lastSeen}
                  </Td>
                  <Td align="right" className="w-8">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-brame-dark dark:hover:bg-white/10 dark:hover:text-gray-100"
                          aria-label={t('common.edit')}
                        >
                          <MoreHorizontal size={15} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {u.role === 'viewer' ? (
                          <DropdownMenuItem onSelect={() => updateRole.mutate({ userId: u.id, role: 'admin' })}>
                            <ShieldCheck size={13} />
                            {t('companies.rowMenu.makeAdmin')}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => updateRole.mutate({ userId: u.id, role: 'viewer' })}>
                            <ShieldOff size={13} />
                            {t('companies.rowMenu.makeViewer')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem destructive onSelect={() => setRemoving(u)}>
                          <Trash2 size={13} />
                          {t('companies.rowMenu.remove')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Td>
                </tr>
              ))}
              {companyUsers?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t('companies.noUsers')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </TableScroll>

      <InviteUserModal companyId={company.id} companyName={company.name} open={inviting} onOpenChange={setInviting} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={t('companies.removeConfirmTitle', { name: removing?.name ?? '' })}
        description={t('companies.removeConfirmBody', { company: company.name })}
        pending={deleteUser.isPending}
        onConfirm={() => {
          if (removing) deleteUser.mutate(removing.id);
          setRemoving(null);
        }}
      />
    </Card>
  );
}
