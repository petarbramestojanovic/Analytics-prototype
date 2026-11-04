import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/buttonStyles';
import { filterOptions, MAX_ROWS, Popover, searchIndex, type ComboboxOption } from '@/components/ui';

/**
 * A multi-select filter with a search box, for lists too long to scroll —
 * campaigns, clients. Type to narrow (every word has to match, accents and
 * case are ignored), arrow keys and Enter to tick, Esc to close. Picks stay
 * visible at the top while the search is empty. Nothing picked = no filter.
 *
 * Same props as `FilterMultiSelect`, but options are plain text so they can
 * be searched; use that one for short lists.
 */
export function FilterCombobox({
  values,
  onChange,
  allLabel,
  options,
  searchPlaceholder,
  className = 'w-56',
}: {
  values: readonly string[];
  onChange: (values: string[]) => void;
  /** What the trigger reads when nothing is picked. */
  allLabel: string;
  options: readonly ComboboxOption[];
  searchPlaceholder?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const picked = options.filter((o) => values.includes(o.value));

  return (
    <Popover
      rootClassName={className}
      className="w-[min(24rem,calc(100vw-1rem))] p-2"
      trigger={({ open, toggle }) => (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={toggle}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 text-base text-brame-dark outline-none focus:border-brame-teal sm:text-sm dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100',
            open && 'border-brame-teal dark:border-brame-turquoise',
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
        </button>
      )}
    >
      {(close) => (
        <ComboboxPanel
          values={values}
          onChange={onChange}
          options={options}
          searchPlaceholder={searchPlaceholder ?? t('combobox.search')}
          close={() => {
            close();
            triggerRef.current?.focus();
          }}
        />
      )}
    </Popover>
  );
}

function ComboboxPanel({
  values,
  onChange,
  options,
  searchPlaceholder,
  close,
}: {
  values: readonly string[];
  onChange: (values: string[]) => void;
  options: readonly ComboboxOption[];
  searchPlaceholder: string;
  close: () => void;
}) {
  const { t } = useI18n();
  const id = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // The popover stays hidden until it has measured where to sit, and a hidden
  // field can't take focus — so focus once it has been placed.
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const index = useMemo(() => searchIndex(options), [options]);

  const matches = useMemo(() => {
    if (!query.trim()) {
      // No search: what is picked first, then the list as given.
      const chosen = options.filter((o) => values.includes(o.value));
      return [...chosen, ...options.filter((o) => !values.includes(o.value))];
    }
    return filterOptions(options, index, query);
    // `values` only reorders the unsearched list, which is wanted on open, not
    // on every tick — so a tick doesn't make the rows jump under the cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, options, index]);

  const shown = matches.slice(0, MAX_ROWS);

  useEffect(() => {
    document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, id]);

  const toggle = (value: string) =>
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, shown.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (shown[active]) toggle(shown[active].value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  return (
    <div>
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded
          aria-controls={`${id}-list`}
          aria-activedescendant={shown[active] ? `${id}-opt-${active}` : undefined}
          aria-label={searchPlaceholder}
          autoComplete="off"
          value={query}
          placeholder={searchPlaceholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-8 pr-8 text-base text-brame-dark outline-none placeholder:text-gray-400 focus:border-brame-teal sm:text-sm dark:border-white/15 dark:bg-white/5 dark:text-gray-100 dark:focus:border-brame-turquoise"
        />
        {query && (
          <button
            type="button"
            aria-label={t('combobox.clearSearch')}
            onClick={() => {
              setQuery('');
              setActive(0);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-brame-dark dark:hover:text-gray-100"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <div className="flex h-7 items-center justify-between px-1 text-xs text-gray-500 dark:text-gray-400">
        <span>{values.length > 0 ? t('filter.nSelected', { count: values.length }) : ''}</span>
        {values.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="font-medium text-brame-teal hover:underline dark:text-brame-turquoise-light"
          >
            {t('combobox.clearAll')}
          </button>
        )}
      </div>

      <ul
        id={`${id}-list`}
        role="listbox"
        aria-multiselectable
        className="max-h-64 overflow-y-auto"
      >
        {shown.map((o, i) => {
          const checked = values.includes(o.value);
          return (
            <li
              key={o.value}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={checked}
              data-active={i === active || undefined}
              // Keep focus in the search box while clicking rows.
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => active !== i && setActive(i)}
              onClick={() => toggle(o.value)}
              className="group flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-brame-dark data-[active]:bg-gray-100 dark:text-gray-200 dark:data-[active]:bg-white/10"
            >
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-300 text-white transition-opacity dark:border-white/30',
                  'opacity-0 group-data-[active]:opacity-100',
                  checked && 'border-brame-teal bg-brame-teal opacity-100',
                )}
              >
                {checked && <Check size={11} strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{o.label}</span>
                {o.description && (
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                    {o.description}
                  </span>
                )}
              </span>
            </li>
          );
        })}
        {shown.length === 0 && (
          <li className="px-2.5 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('combobox.noResults')}
          </li>
        )}
      </ul>

      {matches.length > shown.length && (
        <p className="px-1 pt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {t('combobox.truncated', { shown: shown.length, total: matches.length })}
        </p>
      )}
    </div>
  );
}
