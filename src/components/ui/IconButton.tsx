import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  /** Round, bordered — the top bar's refresh / theme controls. */
  outline:
    'h-8 w-8 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-brame-dark dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:text-white',
  /** Borderless — row actions, dismiss buttons. */
  ghost:
    'rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brame-dark dark:hover:bg-white/10 dark:hover:text-gray-100',
} as const;

/** An icon-only button. `label` is required: it is the accessible name and
 *  the hover title, since there is no visible text. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  { label: string; icon: ReactNode; variant?: keyof typeof variants } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'children'
  >
>(function IconButton({ label, icon, variant = 'outline', className, type = 'button', ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'flex flex-shrink-0 items-center justify-center transition-colors disabled:opacity-60',
        variants[variant],
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
});
