import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** A labelled native checkbox. forwardRef so react-hook-form's register()
 *  works on it directly. */
export const Checkbox = forwardRef<
  HTMLInputElement,
  { label: ReactNode; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>
>(function Checkbox({ label, className, ...props }, ref) {
  return (
    <label className={cn('inline-flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400', className)}>
      <input
        ref={ref}
        type="checkbox"
        className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-brame-teal focus:ring-brame-teal dark:border-white/20 dark:bg-brame-dark-light"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
});
