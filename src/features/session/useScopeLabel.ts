import { useI18n } from '@/i18n';
import { useSession } from './sessionContext';

/** What the current session is scoped to, as shown in the top bar, the
 *  account menu and profile settings — the company or account name for a
 *  tenant seat, "Klea Sales"/"Klea Internal" for the two internal ones. */
export function useScopeLabel(): string {
  const { seatCategory, companyName, accountName } = useSession();
  const { t } = useI18n();
  switch (seatCategory) {
    case 'client':
      return companyName;
    case 'account':
      return accountName;
    case 'brame':
      return t('topbar.brameSales');
    case 'admin':
      return t('topbar.brameInternal');
  }
}
