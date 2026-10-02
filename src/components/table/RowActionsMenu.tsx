import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useI18n } from '@/i18n';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, IconButton } from '@/components/ui';

/** The "⋯" menu at the end of a table row. Children are DropdownMenuItems. */
export function RowActionsMenu({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton variant="ghost" label={t('common.rowActions')} icon={<MoreHorizontal size={15} />} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}
