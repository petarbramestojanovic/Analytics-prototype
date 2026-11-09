import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { filterOptions, MAX_ROWS, searchIndex, type ComboboxOption } from '@/components/ui';
import { focusRing } from '@/components/ui/buttonStyles';
import { FieldLabel, FieldMessage } from './FormField';

/**
 * A single pick from a list too long for a plain dropdown — campaigns, clients
 * — with a search box. Type words to narrow it (accents and case ignored),
 * arrow keys + Enter or a click to choose.
 *
 * The list opens in the flow of the form, under the field, rather than
 * floating over it: a floating panel is portalled out of the dialog, where a
 * modal form blocks clicks and focus. Esc closes just the list, not the form.
 */
export function SearchSelectField<TValues extends FieldValues, TName extends Path<TValues>>({
  control,
  name,
  label,
  placeholder,
  options,
  help,
  error,
}: {
  control: Control<TValues>;
  name: TName;
  label: string;
  placeholder?: string;
  options: readonly ComboboxOption[];
  help?: ReactNode;
  error?: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <FieldLabel id={`${id}-label`}>{label}</FieldLabel>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <SearchSelect
            id={id}
            value={field.value as string}
            onChange={field.onChange}
            options={options}
            placeholder={placeholder}
          />
        )}
      />
      <FieldMessage error={error} help={help} />
    </div>
  );
}

function SearchSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly ComboboxOption[];
  placeholder?: string;
}) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const selected = options.find((o) => o.value === value);
  const index = useMemo(() => searchIndex(options), [options]);
  const matches = useMemo(() => filterOptions(options, index, query), [options, index, query]);
  const shown = matches.slice(0, MAX_ROWS);

  const close = (refocus = false) => {
    setOpen(false);
    setQuery('');
    if (refocus) triggerRef.current?.focus();
  };

  const choose = (option: ComboboxOption) => {
    onChange(option.value);
    close(true);
  };

  // On open, start on the current pick and put the cursor in the search box.
  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, matches.findIndex((o) => o.value === value)));
    inputRef.current?.focus({ preventScroll: true });
    // The list opens under the field, which may be at the bottom of a
    // scrolling form: bring the whole field into view.
    rootRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    // Only when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, id]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    // Esc has to close only the list. A modal form listens for it on the
    // document in the capture phase, so this goes in on the window, ahead of it.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      close(true);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, shown.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      // Never submit the form from the search box.
      e.preventDefault();
      if (shown[active]) choose(shown[active]);
    }
  };

  return (
    <div ref={rootRef}>
      <button
        ref={triggerRef}
        id={`${id}-trigger`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? close() : setOpen(true))}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 text-base text-brame-dark outline-none focus:border-brame-teal sm:text-sm dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100',
          open && 'border-brame-teal dark:border-brame-turquoise',
          focusRing,
        )}
      >
        <span id={`${id}-value`} className="min-w-0 flex-1 truncate text-left">
          {selected ? (
            <>
              {selected.label}
              {selected.description && (
                <span className="text-gray-400 dark:text-gray-500"> · {selected.description}</span>
              )}
            </>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
          )}
        </span>
        <ChevronDown size={14} className="shrink-0 text-gray-400" />
      </button>

      {open && (
        <div className="mt-1.5 rounded-lg border border-gray-200 bg-white p-2 dark:border-white/10 dark:bg-brame-dark-light">
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
              aria-label={t('combobox.search')}
              autoComplete="off"
              value={query}
              placeholder={t('combobox.search')}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onInputKeyDown}
              className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-base text-brame-dark outline-none placeholder:text-gray-400 focus:border-brame-teal sm:text-sm dark:border-white/15 dark:bg-white/5 dark:text-gray-100 dark:focus:border-brame-turquoise"
            />
          </div>

          <ul id={`${id}-list`} role="listbox" className="mt-1.5 max-h-48 overflow-y-auto">
            {shown.map((o, i) => {
              const checked = o.value === value;
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
                  onClick={() => choose(o)}
                  className="flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-brame-dark data-[active]:bg-gray-100 dark:text-gray-200 dark:data-[active]:bg-white/10"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{o.label}</span>
                    {o.description && (
                      <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                        {o.description}
                      </span>
                    )}
                  </span>
                  {checked && (
                    <Check size={14} className="shrink-0 text-brame-teal dark:text-brame-turquoise-light" />
                  )}
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
      )}
    </div>
  );
}
