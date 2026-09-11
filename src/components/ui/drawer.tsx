import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export const Drawer = DialogPrimitive.Root;

export function DrawerContent({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  /** Visually hidden — Radix requires an accessible name for the dialog. */
  title: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="drawer-overlay fixed inset-0 z-40 bg-black/40" />
      <DialogPrimitive.Content
        className={cn(
          'drawer-content fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-brame-teal text-white shadow-xl outline-none will-change-transform',
          className
        )}
      >
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
