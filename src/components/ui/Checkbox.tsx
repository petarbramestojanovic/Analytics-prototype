import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** A labelled native checkbox, styled app-wide in index.css. forwardRef so react-hook-form's register()
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
        className="mt-px"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
});
