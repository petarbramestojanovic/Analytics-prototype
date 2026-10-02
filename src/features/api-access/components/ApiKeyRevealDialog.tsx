import { useI18n } from '@/i18n';
import {
  Button,
  CodeBlock,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';

/**
 * The one moment a new key's full secret is on screen. A click on the overlay
 * deliberately does not close it — a stray click would throw away something the
 * user can never look up again. Done, the X and Escape still do.
 */
export function ApiKeyRevealDialog({
  reveal,
  onClose,
}: {
  reveal: { name: string; secret: string } | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={!!reveal} onOpenChange={(o) => !o && onClose()}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t('apiAccess.reveal.title')}</DialogTitle>
          <DialogDescription>{t('apiAccess.reveal.subtitle', { name: reveal?.name ?? '' })}</DialogDescription>
        </DialogHeader>

        {reveal && <CodeBlock code={reveal.secret} />}

        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{t('apiAccess.reveal.warning')}</p>

        <DialogFooter>
          <Button variant="primary" onClick={onClose}>
            {t('apiAccess.reveal.done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
