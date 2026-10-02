import { fmtSignedPct } from '@/lib/format';
import { cn } from '@/lib/cn';

const SEVERITY_TEXT = {
  inLine: 'text-gray-500 dark:text-gray-400',
  watch: 'text-amber-700 dark:text-amber-300',
  investigate: 'text-red-600 dark:text-red-400',
} as const;

export type DeltaSeverity = keyof typeof SEVERITY_TEXT;

/** A signed percentage change ("+4.2%"), coloured by how much it matters. */
export function DeltaValue({ delta, severity, className }: { delta: number; severity: DeltaSeverity; className?: string }) {
  return <span className={cn(SEVERITY_TEXT[severity], className)}>{fmtSignedPct(delta, 1)}</span>;
}
