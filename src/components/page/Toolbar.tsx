import { forwardRef, type ReactNode } from 'react';
import { ListFilter, Search, X } from 'lucide-react';
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
        'flex flex-wrap items-center gap-3 px-3 py-2.5',
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
        className="h-10 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-base text-brame-dark outline-none sm:text-sm focus:border-brame-teal dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100 dark:placeholder:text-gray-500"
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
  triggerClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Omit when every option is a real choice and there is no "all". */
  allLabel?: string;
  options: readonly { value: string; label: ReactNode }[];
  className?: string;
  /** e.g. `h-9` to match a row of small tabs. */
  triggerClassName?: string;
}) {
  return (
    <div className={className}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={triggerClassName} />
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

const TOOLBAR_BUTTON_SIZE = { xs: 'h-9 px-2.5 sm:h-8', sm: 'h-10 px-3 sm:h-9', md: 'h-10 px-3' } as const;

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

/** The "Filters" button: opens/closes a filter tray (FilterSheet) and badges how many
 *  filters inside it are active, so a closed panel never hides state. */
export function FilterToggleButton({
  open,
  count,
  label,
  onClick,
}: {
  open: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-filter-toggle
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        toolbarButtonClasses,
        TOOLBAR_BUTTON_SIZE.md,
        (open || count > 0) && 'border-brame-teal text-brame-teal dark:border-brame-turquoise-light dark:text-brame-turquoise-light'
      )}
    >
      <ListFilter size={13} />
      {label}
      {count > 0 && (
        <span className="tnum inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brame-teal px-1 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
    </button>
  );
}

/** One field in a filter tray (FilterSheet): a small label over a full-width control. */
export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</div>
      {children}
    </div>
  );
}

/** The strip of removable chips shown under the toolbar while the panel is
 *  closed, one per active filter. */
export function ActiveFilterChips({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-white/10">{children}</div>
  );
}

export function FilterChip({
  label,
  children,
  onRemove,
  removeLabel,
}: {
  /** Which filter this is ("Sales"), shown muted before the value. */
  label: string;
  children: ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 pl-2.5 pr-1 text-xs text-brame-dark dark:border-white/15 dark:bg-white/5 dark:text-gray-100">
      <span className="text-gray-400 dark:text-gray-500">{label}</span>
      <span className="inline-flex items-center gap-1.5 font-medium">{children}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${removeLabel}: ${label}`}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-brame-dark dark:hover:bg-white/15 dark:hover:text-white"
      >
        <X size={11} />
      </button>
    </span>
  );
}
