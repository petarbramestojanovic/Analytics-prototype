import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

export const Select = SelectPrimitive.Root;

export function SelectTrigger({ id, placeholder }: { id?: string; placeholder?: string }) {
  return (
    <SelectPrimitive.Trigger
      id={id}
      className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-sm text-brame-dark outline-none focus:border-brame-teal dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100"
    >
      <SelectPrimitive.Value
        className="min-w-0 flex-1 truncate text-left"
        placeholder={<span className="text-gray-400 dark:text-gray-500">{placeholder}</span>}
      />
      <SelectPrimitive.Icon>
        <ChevronDown size={14} className="shrink-0 text-gray-400" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ children }: { children: ReactNode }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={4}
        className="z-50 max-h-64 min-w-[var(--radix-select-trigger-width)] max-w-[min(24rem,90vw)] overflow-hidden rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-brame-dark-light"
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ children, value }: { children: ReactNode; value: string }) {
  return (
    <SelectPrimitive.Item
      value={value}
      className="relative flex cursor-pointer select-none items-center gap-2 rounded-md py-1.5 pl-7 pr-2.5 text-sm text-brame-dark outline-none data-[highlighted]:bg-gray-100 dark:text-gray-200 dark:data-[highlighted]:bg-white/10"
    >
      <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
        <Check size={13} className="text-brame-teal" />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>
        <span className="block truncate">{children}</span>
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
