import { forwardRef, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card, Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui';

/**
 * A list view's filter bar — a card holding one wrapping row of controls
 * (SearchInput, FilterSelect, Tabs, ToolbarButton, ToolbarResetButton). Each
 * view still decides which controls it needs and in what order. Pass
 * `bare` to render just the row, e.g. as the header strip of a table card.
 */
export function ListToolbar({
  children,
  bare = false,
  bordered = true,
  className,
}: {
  children: ReactNode;
  bare?: boolean;
  bordered?: boolean;
  className?: string;
}) {
  const row = (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 p-4',
        bordered && 'border-b border-gray-200 dark:border-white/10',
        bare && className
      )}
    >
      {children}
    </div>
  );
  return bare ? row : <Card padded={false} className={className}>{row}</Card>;
}

/** The filter-bar search box. Purely controlled, no internal debounce. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative min-w-40 flex-1', className)}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm text-brame-dark outline-none focus:border-brame-teal dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100 dark:placeholder:text-gray-500"
      />
    </div>
  );
}

/** A filter dropdown with an "All …" option (value `'all'`) on top. */
export function FilterSelect({
  value,
  onChange,
  allLabel,
  options,
  className = 'w-56',
}: {
  value: string;
  onChange: (value: string) => void;
  /** Omit when every option is a real choice and there is no "all". */
  allLabel?: string;
  options: readonly { value: string; label: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger />
        <SelectContent>
          {allLabel && <SelectItem value="all">{allLabel}</SelectItem>}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const TOOLBAR_BUTTON_SIZE = { xs: 'h-8 px-2.5', sm: 'h-9 px-3', md: 'h-10 px-3' } as const;

const toolbarButtonClasses =
  'inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 bg-white text-xs font-medium text-brame-dark transition-colors hover:bg-gray-50 dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100 dark:hover:bg-white/10';

/** A compact toolbar control sized to sit next to SearchInput/Tabs — e.g.
 *  the "Columns" or "Metrics" dropdown trigger. forwardRef for Radix's
 *  `asChild` triggers. */
export const ToolbarButton = forwardRef<
  HTMLButtonElement,
  { icon?: ReactNode; children: ReactNode; size?: keyof typeof TOOLBAR_BUTTON_SIZE; onClick?: () => void }
>(function ToolbarButton({ icon, children, size = 'md', ...props }, ref) {
  return (
    <button ref={ref} type="button" className={cn(toolbarButtonClasses, TOOLBAR_BUTTON_SIZE[size])} {...props}>
      {icon}
      {children}
    </button>
  );
});

/** The animated "Reset filters" button — collapses to nothing until a filter
 *  is active. */
export function ToolbarResetButton({
  active,
  onReset,
  label,
  size = 'md',
}: {
  active: boolean;
  onReset: () => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={cn('grid transition-[grid-template-columns] duration-300 ease-out', active ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]')}>
      <div className="min-w-0 overflow-hidden">
        <button
          type="button"
          onClick={onReset}
          tabIndex={active ? 0 : -1}
          aria-hidden={!active}
          className={cn(
            toolbarButtonClasses,
            'transition-[opacity,background-color] duration-200',
            TOOLBAR_BUTTON_SIZE[size],
            active ? 'opacity-100 delay-150' : 'opacity-0'
          )}
        >
          <X size={13} />
          {label}
        </button>
      </div>
    </div>
  );
}
