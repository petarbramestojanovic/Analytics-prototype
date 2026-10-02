import { cn } from '@/lib/cn';
import { CopyButton } from './CopyButton';

/**
 * Monospace text with a copy button — an API secret, a sample request. The
 * text is `select-all` so copying by hand still works when the clipboard API
 * is unavailable.
 */
export function CodeBlock({ code, multiline = false, className }: { code: string; multiline?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5',
        className
      )}
    >
      {multiline ? (
        <pre className="min-w-0 flex-1 select-all overflow-x-auto font-mono text-xs text-brame-dark dark:text-gray-100">
          {code}
        </pre>
      ) : (
        <code className="min-w-0 flex-1 select-all break-all font-mono text-sm text-brame-dark dark:text-gray-100">
          {code}
        </code>
      )}
      <CopyButton text={code} />
    </div>
  );
}
