import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { focusRing } from './buttonStyles';
import { composeBind, useLabelTip, type LabelTipOptions } from './LabelTip';

const variants = {
  /** Round, bordered — the top bar's refresh / theme controls. */
  outline:
    'h-10 w-10 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-brame-dark dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:text-white sm:h-8 sm:w-8',
  /** Borderless — row actions, dismiss buttons. */
  ghost:
    'rounded-lg p-2.5 text-gray-400 hover:bg-gray-100 hover:text-brame-dark dark:hover:bg-white/10 dark:hover:text-gray-100 sm:p-1.5',
} as const;

/** An icon-only button. `label` is required: it is the accessible name and
 *  the text of the hover tooltip, since there is no visible text. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  {
    label: string;
    icon: ReactNode;
    variant?: keyof typeof variants;
    /** A shortcut shown in the tooltip, e.g. "⌘K". */
    shortcut?: string;
    /** A quieter second line in the tooltip, e.g. "14 unread". */
    detail?: string;
    tipSide?: LabelTipOptions['side'];
  } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>
>(function IconButton(
  { label, icon, variant = 'outline', className, type = 'button', shortcut, detail, tipSide, ...props },
  ref
) {
  const { ref: tipRef, bind, tip, describedBy } = useLabelTip<HTMLButtonElement>(label, {
    side: tipSide,
    shortcut,
    detail,
    disabled: props.disabled,
  });
  const merged = composeBind<HTMLButtonElement>(props as never, bind);

  return (
    <>
      <button
        ref={(node) => {
          (tipRef as { current: HTMLButtonElement | null }).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        type={type}
        aria-label={label}
        aria-describedby={describedBy}
        className={cn(
          'flex flex-shrink-0 items-center justify-center transition-colors disabled:opacity-60',
          variants[variant],
          focusRing,
          className
        )}
        {...props}
        {...merged}
      >
        {icon}
      </button>
      {tip}
    </>
  );
});
