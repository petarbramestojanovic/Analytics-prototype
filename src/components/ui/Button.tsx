import { forwardRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
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

/** A router link styled as a Button — for navigation that looks like an
 *  action. Never nest a `Button` inside a `Link`: that's an interactive
 *  element inside another, which screen readers announce twice and keyboard
 *  users tab through twice. */
export function ButtonLink({
  to,
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  className,
}: {
  to: string;
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Link to={to} className={cn(buttonClasses(variant, size), className)}>
      {icon}
      {children}
    </Link>
  );
}
