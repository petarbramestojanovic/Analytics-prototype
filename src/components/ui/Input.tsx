import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const inputClasses =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-brame-dark outline-none placeholder:text-gray-400 focus:border-brame-teal dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-brame-turquoise';

// forwardRef so react-hook-form's register() can attach its ref — without it
// RHF still tracks value via onChange, but focus-on-error and native
// validation hooks silently no-op.
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...props },
  ref
) {
  return <input ref={ref} {...props} className={cn(inputClasses, className)} />;
});
