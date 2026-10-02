import type { FormEventHandler, ReactNode } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';
import { useI18n } from '@/i18n';

/**
 * The Dialog -> header -> form -> footer shell every create/edit dialog in
 * the app is built on.
 * `onClose` is called both by the Cancel button and by Radix's own dismiss
 * (Escape/overlay/X) — callers that need to reset form state on close (most
 * of them) should do that inside `onClose` itself.
 */
export function FormModal({
  open,
  onClose,
  title,
  description,
  onSubmit,
  submitLabel,
  submitIcon,
  submitDisabled,
  pending,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitLabel: string;
  submitIcon?: ReactNode;
  submitDisabled?: boolean;
  pending?: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
          <DialogFooter>
            <Button variant="secondary" type="button" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" icon={submitIcon} disabled={submitDisabled || pending}>
              {pending ? t('common.saving') : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
