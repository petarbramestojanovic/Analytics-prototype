import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles';

interface ButtonProps {
  children?: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit';
  /** HTML `form` attribute — lets a button outside a `<form>` (e.g. in a
   *  fixed dialog footer) still submit it, via its id. */
  form?: string;
  className?: string;
}

// forwardRef so Radix's asChild (DropdownMenuTrigger, DialogTrigger) can
// clone this as its trigger element without a "function components cannot be
// given refs" warning.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, onClick, variant = 'secondary', size = 'md', icon, disabled, type = 'button', form, className },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled}
      className={cn(buttonClasses(variant, size), className)}
    >
      {icon}
      {children}
    </button>
  );
});
