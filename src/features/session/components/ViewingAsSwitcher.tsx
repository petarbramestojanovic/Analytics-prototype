import { ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n';
import { SegmentedControl, Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui';
import { useAgencies, useCompanies } from '@/features/clients';
import type { SeatCategory, SeatRole } from '@/types';
import { useSession } from '../sessionContext';

// The teal-sidebar variant of the segmented control — lime pill on a dark
// teal track, rather than the standard gray `Tabs` look.
const TRACK = 'grid grid-cols-2 gap-0.5 rounded-lg bg-brame-teal-dark/60 p-0.5';
const SIDEBAR_SEGMENT = {
  indicatorClassName: 'rounded-md bg-brame-lime',
  activeItemClassName: 'text-brame-dark',
  inactiveItemClassName: 'text-white/70 hover:text-white',
};
const SIDEBAR_SELECT = 'h-8 border-brame-teal-light bg-brame-teal-dark/60 text-xs text-white focus:border-brame-lime';

/**
 * The sidebar's tenant/role switcher — the demo stand-in for signing in as
 * a different seat. Fully self-contained: reads and writes the session.
 */
export function ViewingAsSwitcher() {
  const { seatCategory, setSeatCategory, seatRole, setSeatRole, companyId, setCompanyId, agencyId, setAgencyId } =
    useSession();
  const { t } = useI18n();
  const { data: companies = [] } = useCompanies();
  const { data: agencies = [] } = useAgencies();

  const categories: { value: SeatCategory; label: string }[] = [
    { value: 'admin', label: t('viewingAs.admin') },
    { value: 'brame', label: t('viewingAs.brame') },
    { value: 'agency', label: t('viewingAs.agency') },
    { value: 'client', label: t('viewingAs.client') },
  ];
  const roles: { value: SeatRole; label: string }[] = [
    { value: 'admin', label: t('companies.role.admin') },
    { value: 'viewer', label: t('companies.role.viewer') },
  ];
  const picker =
    seatCategory === 'client'
      ? { value: companyId, onChange: setCompanyId, options: companies }
      : seatCategory === 'agency'
        ? { value: agencyId, onChange: setAgencyId, options: agencies }
        : null;

  return (
    <div className="border-t border-brame-teal-light p-4">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-brame-lime/60">
        <ShieldCheck size={11} />
        {t('viewingAs.title')}
      </div>
      <div className="space-y-2">
        {/* Four categories don't fit side by side at the minimum sidebar
            width, so this is a 2x2 grid rather than a flex row. */}
        <SegmentedControl
          value={seatCategory}
          onChange={setSeatCategory}
          className={TRACK}
          itemClassName="truncate px-1.5 py-1 text-xs font-medium transition-colors"
          options={categories}
          {...SIDEBAR_SEGMENT}
        />
        {picker ? (
          <Select value={picker.value} onValueChange={picker.onChange}>
            <SelectTrigger className={SIDEBAR_SELECT} />
            <SelectContent>
              {picker.options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-[11px] leading-snug text-white/60">
            {seatCategory === 'brame' ? t('viewingAs.hintSales') : t('viewingAs.hintAdmin')}
          </div>
        )}

        {/* Seat role is orthogonal to the category above — it only
            previews whether this seat's admin can reach the light Users
            page (/users) to invite/manage their own seat. */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[10px] uppercase tracking-wide text-white/50">{t('viewingAs.seatRole')}</span>
          <SegmentedControl
            value={seatRole}
            onChange={setSeatRole}
            className={TRACK}
            itemClassName="truncate px-2 py-0.5 text-[11px] font-medium transition-colors"
            options={roles}
            {...SIDEBAR_SEGMENT}
          />
        </div>
      </div>
    </div>
  );
}
