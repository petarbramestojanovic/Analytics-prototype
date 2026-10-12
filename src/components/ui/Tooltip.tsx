import { useId, useState } from 'react';
import { Info } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { focusRing } from './buttonStyles';

/**
 * An (i) icon that reveals `text`. Opens on hover, on keyboard focus, and on
 * tap (touch has no hover), and the text is wired up as the button's
 * description so screen readers read it too.
 */
export function Tooltip({ text }: { text: string }) {
  const { t } = useI18n();
  const id = useId();
  const [pinned, setPinned] = useState(false);

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={t('common.moreInfo')}
        aria-describedby={id}
        onClick={(e) => {
          // Tooltips sit inside clickable rows/labels — a tap is "show me", not
          // "open the row".
          e.preventDefault();
          e.stopPropagation();
          setPinned((p) => !p);
        }}
        onBlur={() => setPinned(false)}
        onKeyDown={(e) => e.key === 'Escape' && setPinned(false)}
        className={cn('inline-flex rounded-full', focusRing)}
      >
        <Info
          size={13}
          className="text-gray-300 transition-colors group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300"
        />
      </button>
      {/* normal-case / tracking-normal because these sit inside uppercase,
          letter-spaced metric labels and would otherwise inherit both. */}
      <span
        id={id}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-lg bg-brame-dark px-3 py-2 text-xs font-normal normal-case leading-snug tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-has-[:focus-visible]:opacity-100 dark:bg-black dark:ring-1 dark:ring-white/10',
          pinned && 'opacity-100'
        )}
      >
        {text}
      </span>
    </span>
  );
}
