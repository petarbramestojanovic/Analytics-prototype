import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

export function DropdownMenuContent({
  children,
  align = 'end',
}: {
  children: ReactNode;
  align?: 'start' | 'end' | 'center';
}) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align={align}
        sideOffset={6}
        className="z-50 min-w-[180px] overflow-hidden rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-brame-dark-light"
      >
        {children}
      </DropdownPrimitive.Content>
    </DropdownPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  children,
  onSelect,
  destructive,
  disabled,
}: {
  children: ReactNode;
  onSelect?: (event: Event) => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <DropdownPrimitive.Item
      onSelect={onSelect}
      disabled={disabled}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none transition-colors data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40',
        destructive
          ? 'text-red-600 data-[highlighted]:bg-red-50 dark:text-red-400 dark:data-[highlighted]:bg-red-500/10'
          : 'text-brame-dark data-[highlighted]:bg-gray-100 dark:text-gray-200 dark:data-[highlighted]:bg-white/10'
      )}
    >
      {children}
    </DropdownPrimitive.Item>
  );
}

export function DropdownMenuCheckboxItem({
  children,
  checked,
  onCheckedChange,
}: {
  children: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <DropdownPrimitive.CheckboxItem
      checked={checked}
      onCheckedChange={onCheckedChange}
      onSelect={(event) => event.preventDefault()}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-brame-dark outline-none transition-colors data-[highlighted]:bg-gray-100 dark:text-gray-200 dark:data-[highlighted]:bg-white/10"
    >
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-gray-300 text-brame-teal dark:border-white/25">
        <DropdownPrimitive.ItemIndicator>
          <Check size={11} strokeWidth={3} />
        </DropdownPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownPrimitive.CheckboxItem>
  );
}

export function DropdownMenuSeparator() {
  return <DropdownPrimitive.Separator className="my-1 h-px bg-gray-100 dark:bg-white/10" />;
}
