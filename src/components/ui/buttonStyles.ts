import { cn } from '@/lib/cn';

const variants = {
  primary: 'bg-brame-teal text-white hover:bg-brame-teal-dark border-brame-teal',
  secondary:
    'bg-white text-brame-dark hover:bg-gray-50 border-gray-300 dark:bg-brame-dark-light dark:text-gray-100 dark:border-white/15 dark:hover:bg-white/10',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 border-transparent dark:text-gray-300 dark:hover:bg-white/10',
  danger: 'bg-red-600 text-white hover:bg-red-700 border-red-600',
} as const;

const sizes = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

/** The class string behind `Button`, for the rare element that must look
 *  like a button but can't be one (Radix's AlertDialog Action/Cancel). */
export function buttonClasses(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md') {
  return cn(
    'inline-flex items-center gap-1.5 rounded-lg border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant],
    sizes[size]
  );
}
