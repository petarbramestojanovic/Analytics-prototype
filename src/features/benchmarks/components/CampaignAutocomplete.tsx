import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { filterOptions, MAX_ROWS, searchIndex, type ComboboxOption } from '@/components/ui';

/**
 * The picker for what is being compared — a campaign, a client or an industry:
 * one text field that doubles as the search. Focus opens the list, typing
 * narrows it (every word must match, accents and case ignored), arrows + Enter
 * or a click choose.
 */
export function CampaignAutocomplete({
  value,
  onChange,
  options,
  label,
  placeholder,
  noneLabel,
}: {
  value: string | null;
  onChange: (id: string) => void;
  options: readonly ComboboxOption[];
  label: string;
  placeholder: string;
  noneLabel: string;
}) {
  const { t } = useI18n();
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const selected = options.find((o) => o.value === value);
  const index = useMemo(() => searchIndex(options), [options]);
  const matches = useMemo(() => filterOptions(options, index, query), [options, index, query]);
  const shown = matches.slice(0, MAX_ROWS);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  useEffect(() => {
    document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, id]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, shown.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && shown[active]) choose(shown[active].value);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={rootRef} className="relative w-full max-w-xl">
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && shown[active] ? `${id}-opt-${active}` : undefined}
        aria-label={label}
        autoComplete="off"
        value={open ? query : (selected?.label ?? '')}
        placeholder={open && selected ? selected.label : placeholder}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={cn(
          'h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-9 text-base font-medium text-brame-dark outline-none placeholder:font-normal placeholder:text-gray-400 focus:border-brame-teal sm:text-sm dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100 dark:focus:border-brame-turquoise',
        )}
      />
      {open && query && (
        <button
          type="button"
          aria-label={t('combobox.clearSearch')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setQuery('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-brame-dark dark:hover:text-gray-100"
        >
          <X size={14} />
        </button>
      )}
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-brame-dark-light"
        >
          {shown.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              {noneLabel}
            </li>
          )}
          {shown.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={o.value === value}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o.value)}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm',
                i === active && 'bg-brame-teal/10 dark:bg-white/10',
              )}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-brame-dark dark:text-gray-100">
                  {o.label}
                </span>
                {o.description && (
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                    {o.description}
                  </span>
                )}
              </span>
              {o.value === value && (
                <Check size={14} className="shrink-0 text-brame-teal dark:text-brame-turquoise" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
