import type { ReactNode } from 'react';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/buttonStyles';

const ROW =
  'group flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-brame-dark outline-none data-[highlighted]:bg-gray-100 dark:text-gray-200 dark:data-[highlighted]:bg-white/10';

/**
 * A filter dropdown that takes several picks. Each option has a checkbox in
 * front that only shows on hover (or keyboard focus) — and stays visible once
 * ticked, so the selection is never hidden. The list stays open while you
 * tick; the first row ("All …") clears the selection. Nothing picked = no
 * filter, same as FilterSelect's "all".
 */
export function FilterMultiSelect({
  values,
  onChange,
  allLabel,
  options,
  className = 'w-56',
}: {
  values: readonly string[];
  onChange: (values: string[]) => void;
  /** What the trigger and the clear row read when nothing is picked. */
  allLabel: string;
  options: readonly { value: string; label: ReactNode }[];
  className?: string;
}) {
  const { t } = useI18n();
  const picked = options.filter((o) => values.includes(o.value));
  const toggle = (value: string, checked: boolean) =>
    onChange(checked ? [...values, value] : values.filter((v) => v !== value));

  return (
    <div className={className}>
      <DropdownPrimitive.Root>
        <DropdownPrimitive.Trigger
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 text-base text-brame-dark outline-none focus:border-brame-teal data-[state=open]:border-brame-teal sm:text-sm dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100 dark:data-[state=open]:border-brame-turquoise',
            focusRing,
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {picked.length === 0
              ? allLabel
              : picked.length === 1
                ? picked[0].label
                : t('filter.nSelected', { count: picked.length })}
          </span>
          <ChevronDown size={14} className="shrink-0 text-gray-400" />
        </DropdownPrimitive.Trigger>

        <DropdownPrimitive.Portal>
          <DropdownPrimitive.Content
            align="start"
            sideOffset={4}
            className="z-50 max-h-72 min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[min(24rem,90vw)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-brame-dark-light"
          >
            <DropdownPrimitive.CheckboxItem
              checked={values.length === 0}
              onCheckedChange={() => onChange([])}
              onSelect={(e) => e.preventDefault()}
              className={cn(ROW, 'font-medium')}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center text-brame-teal dark:text-brame-turquoise-light">
                <DropdownPrimitive.ItemIndicator>
                  <Check size={13} strokeWidth={3} />
                </DropdownPrimitive.ItemIndicator>
              </span>
              <span className="truncate">{allLabel}</span>
            </DropdownPrimitive.CheckboxItem>

            {options.map((o) => (
              <DropdownPrimitive.CheckboxItem
                key={o.value}
                checked={values.includes(o.value)}
                onCheckedChange={(checked) => toggle(o.value, checked === true)}
                // Keep the list open so several can be ticked in a row.
                onSelect={(e) => e.preventDefault()}
                className={ROW}
              >
                {/* Hidden until the row is hovered or keyboard-highlighted; a
                    ticked box always shows. The slot is always reserved so
                    labels never shift. */}
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-300 text-white transition-opacity dark:border-white/30',
                    'opacity-0 group-hover:opacity-100 group-data-[highlighted]:opacity-100',
                    'group-data-[state=checked]:border-brame-teal group-data-[state=checked]:bg-brame-teal group-data-[state=checked]:opacity-100',
                  )}
                >
                  <DropdownPrimitive.ItemIndicator>
                    <Check size={11} strokeWidth={3} />
                  </DropdownPrimitive.ItemIndicator>
                </span>
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
              </DropdownPrimitive.CheckboxItem>
            ))}
          </DropdownPrimitive.Content>
        </DropdownPrimitive.Portal>
      </DropdownPrimitive.Root>
    </div>
  );
}
