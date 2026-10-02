import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import type { ReactNode } from 'react';
import { buttonClasses } from './buttonStyles';

export const AlertDialog = AlertDialogPrimitive.Root;

export function AlertDialogContent({ children }: { children: ReactNode }) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" />
      <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-xl outline-none dark:border-white/10 dark:bg-brame-dark-light">
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  );
}

export function AlertDialogTitle({ children }: { children: ReactNode }) {
  return (
    <AlertDialogPrimitive.Title className="text-base font-bold text-brame-dark dark:text-white">
      {children}
    </AlertDialogPrimitive.Title>
  );
}

export function AlertDialogDescription({ children }: { children: ReactNode }) {
  return (
    <AlertDialogPrimitive.Description className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
      {children}
    </AlertDialogPrimitive.Description>
  );
}

export function AlertDialogFooter({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex items-center justify-end gap-2">{children}</div>;
}

export function AlertDialogCancel({ children }: { children: ReactNode }) {
  return (
    <AlertDialogPrimitive.Cancel
      className={buttonClasses('secondary')}
    >
      {children}
    </AlertDialogPrimitive.Cancel>
  );
}

export function AlertDialogAction({
  children,
  onClick,
  destructive,
}: {
  children: ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialogPrimitive.Action
      onClick={onClick}
      className={buttonClasses(destructive ? 'danger' : 'primary')}
    >
      {children}
    </AlertDialogPrimitive.Action>
  );
}
