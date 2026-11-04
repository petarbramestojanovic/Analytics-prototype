import { Info } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { FloatingTip } from './FloatingTip';
import { focusRing } from './buttonStyles';

/**
 * An (i) icon that reveals `text`. Opens on hover, on keyboard focus and on
 * tap (touch has no hover). Drawn by FloatingTip, so the card is placed against
 * the screen, never clipped or pushed off the edge of a phone.
 */
export function Tooltip({ text }: { text: string }) {
  const { t } = useI18n();
  return (
    <FloatingTip content={text}>
      <button
        type="button"
        aria-label={t('common.moreInfo')}
        // Tooltips sit inside clickable rows and labels: a tap is "show me",
        // not "open the row".
        onClick={(e) => e.preventDefault()}
        className={cn('group inline-flex rounded-full p-1 -m-1', focusRing)}
      >
        <Info
          size={13}
          className="text-gray-300 transition-colors group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300"
        />
      </button>
    </FloatingTip>
  );
}
