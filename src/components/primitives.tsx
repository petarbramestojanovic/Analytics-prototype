import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-brame-dark-light dark:shadow-none ${padded ? 'p-5' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
  action,
}: {
  children: ReactNode;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-brame-dark dark:text-gray-100">{children}</h2>
        {hint && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <Info size={13} className="text-gray-300 transition-colors group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300" />
      {/* normal-case / tracking-normal because these sit inside uppercase,
          letter-spaced metric labels and would otherwise inherit both. */}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-lg bg-brame-dark px-3 py-2 text-xs font-normal normal-case leading-snug tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-black dark:ring-1 dark:ring-white/10">
        {text}
      </span>
    </span>
  );
}

const pillTones = {
  neutral: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
  teal: 'bg-brame-teal/10 text-brame-teal dark:bg-brame-teal/25 dark:text-brame-turquoise-light',
  lime: 'bg-brame-lime text-brame-dark dark:bg-brame-lime dark:text-brame-dark',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  purple: 'bg-brame-purple/10 text-brame-purple dark:bg-brame-purple/25 dark:text-brame-purple-light',
};

export type PillTone = keyof typeof pillTones;

export function Pill({
  children,
  tone = 'neutral',
  icon,
  title,
  className = '',
}: {
  children: ReactNode;
  tone?: PillTone;
  icon?: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        pillTones[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Neutral empty state. Used wherever a connector is absent — the RFC is
 *  explicit that a missing source is blank, never a zero. */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/60 px-6 py-14 text-center dark:border-white/15 dark:bg-white/5">
      <div className="mb-3 text-gray-300 dark:text-gray-600">{icon}</div>
      <h3 className="text-sm font-semibold text-brame-dark dark:text-gray-100">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Shared loading placeholder, same visual language as EmptyState. */
export function LoadingState({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 text-center', compact ? 'py-6' : 'py-16')}>
      <Loader2 size={compact ? 18 : 22} className="animate-spin text-gray-300 dark:text-gray-600" />
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  );
}

/** Shared error placeholder, same visual language as EmptyState. */
export function ErrorState({
  label,
  retryLabel,
  onRetry,
  compact = false,
}: {
  label: string;
  retryLabel?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 text-center', compact ? 'py-6' : 'py-16')}>
      <AlertCircle size={compact ? 18 : 22} className="text-red-300 dark:text-red-500/60" />
      <span className="text-sm text-red-600 dark:text-red-400">{label}</span>
      {onRetry && retryLabel && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

interface ButtonProps {
  children?: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  icon?: ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

// forwardRef so Radix's asChild (DropdownMenuTrigger, DialogTrigger) can
// clone this as its trigger element without a "function components cannot be
// given refs" warning.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, onClick, variant = 'secondary', size = 'md', icon, disabled, type = 'button' },
  ref
) {
  const variants = {
    primary: 'bg-brame-teal text-white hover:bg-brame-teal-dark border-brame-teal',
    secondary:
      'bg-white text-brame-dark hover:bg-gray-50 border-gray-300 dark:bg-brame-dark-light dark:text-gray-100 dark:border-white/15 dark:hover:bg-white/10',
    ghost:
      'bg-transparent text-gray-600 hover:bg-gray-100 border-transparent dark:text-gray-300 dark:hover:bg-white/10',
  };
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        variants[variant]
      } ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
    >
      {icon}
      {children}
    </button>
  );
});

export function Th({
  children,
  align = 'left',
  className = '',
}: {
  children?: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <th
      className={`whitespace-nowrap border-b border-gray-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-white/10 dark:text-gray-400 ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = 'left',
  className = '',
}: {
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <td
      className={`border-b border-gray-100 px-4 py-3 text-sm dark:border-white/5 ${
        align === 'right' ? 'tnum text-right' : 'text-left'
      } ${className}`}
    >
      {children}
    </td>
  );
}

// forwardRef so react-hook-form's register() can attach its ref — without it
// RHF still tracks value via onChange, but focus-on-error and native
// validation hooks silently no-op.
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-brame-dark outline-none placeholder:text-gray-400 focus:border-brame-teal dark:border-white/15 dark:bg-brame-dark-light dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-brame-turquoise ${className}`}
      />
    );
  }
);

/**
 * A tab-style toggle (status filters, the "Viewing as" tenant switcher,
 * EN/DE) with a background pill that slides to the clicked option instead of
 * the selection just repainting in place. Works for flex or grid tracks of
 * any option count/width — the pill's position and size are measured off the
 * active button's own box via ResizeObserver, not hardcoded percentages.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  groupLabel,
  className = '',
  indicatorClassName = '',
  itemClassName = '',
  activeItemClassName = '',
  inactiveItemClassName = '',
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: ReactNode }[];
  groupLabel?: string;
  className?: string;
  indicatorClassName?: string;
  itemClassName?: string;
  activeItemClassName?: string;
  inactiveItemClassName?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const active = track.querySelector<HTMLElement>(`[data-seg-value="${CSS.escape(value)}"]`);
      if (!active) return;
      setRect({ left: active.offsetLeft, top: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={trackRef} role="group" aria-label={groupLabel} className={cn('relative', className)}>
      {rect && (
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute left-0 top-0 transition-[transform,width,height] duration-200 ease-out',
            indicatorClassName
          )}
          style={{ transform: `translate(${rect.left}px, ${rect.top}px)`, width: rect.width, height: rect.height }}
        />
      )}
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          data-seg-value={opt.value}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'relative z-10',
            itemClassName,
            value === opt.value ? activeItemClassName : inactiveItemClassName
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Standardized horizontal-scroll wrapper for every wide data table, with a
 * fade affordance on whichever edge still has content to scroll toward —
 * without it, a table cut off at a card's edge on a narrow viewport reads as
 * "that's all the columns" rather than "scroll for more".
 */
export function TableScroll({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    update();
    el.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [children]);

  return (
    <div className="relative">
      <div ref={ref} className={`overflow-x-auto ${className}`}>
        {children}
      </div>
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent transition-opacity dark:from-brame-dark-light ${
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent transition-opacity dark:from-brame-dark-light ${
          canScrollRight ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
