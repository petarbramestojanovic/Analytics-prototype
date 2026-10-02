import { Info } from 'lucide-react';

/** An (i) icon that shows `text` on hover. */
export function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <Info
        size={13}
        className="text-gray-300 transition-colors group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300"
      />
      {/* normal-case / tracking-normal because these sit inside uppercase,
          letter-spaced metric labels and would otherwise inherit both. */}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-lg bg-brame-dark px-3 py-2 text-xs font-normal normal-case leading-snug tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-black dark:ring-1 dark:ring-white/10">
        {text}
      </span>
    </span>
  );
}
