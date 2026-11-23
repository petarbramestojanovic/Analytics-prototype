import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * A circular progress ring: `value` (0–1) is how much of the circle is filled,
 * clockwise from the top; `children` sit in the middle. Deep teal on light
 * surfaces, lime on dark ones (guide pairings).
 */
export function RingProgress({
  value,
  size = 48,
  stroke = 4,
  label,
  children,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  /** Accessible name, e.g. "62% of the top group". */
  label?: string;
  children?: ReactNode;
  className?: string;
}) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      title={label}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-gray-100 dark:stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className="stroke-brame-teal dark:stroke-brame-lime"
        />
      </svg>
      {children && (
        <span className="tnum absolute inset-0 flex items-center justify-center font-heading text-sm font-medium text-brame-dark dark:text-white">
          {children}
        </span>
      )}
    </div>
  );
}
