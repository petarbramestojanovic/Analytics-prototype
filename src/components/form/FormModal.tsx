import type { FormEventHandler, ReactNode } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';

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
  footerStart,
  wide = false,
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
  /** Extra controls at the left of the footer, apart from Cancel/Save. */
  footerStart?: ReactNode;
  /** A wider dialog, for forms laid out in two columns. */
  wide?: boolean;
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
      {/* A flex column: header and footer stay put, only the fields scroll —
          so Save is never pushed out of view on a short window. */}
      <DialogContent className={cn('flex flex-col overflow-hidden', wide && 'max-w-4xl')}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          {/* 8px of padding (and the matching negative margin) so the focus rings
              and the Switch's invisible 8px tap area never count as overflow —
              without it a form ending in a Switch always scrolled by 8px. */}
          <div className="-mx-2 min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-2 py-2">
            {children}
          </div>
          <DialogFooter className="mt-4 border-t border-gray-100 pt-4 dark:border-white/10">
            {footerStart && <div className="mr-auto">{footerStart}</div>}
            <Button variant="secondary" type="button" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={submitIcon}
              disabled={submitDisabled || pending}
            >
              {pending ? t('common.saving') : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
